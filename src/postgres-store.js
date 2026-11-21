import { isDeepStrictEqual } from 'node:util';
import { setTimeout as delay } from 'node:timers/promises';
import { migrateDatabase, verifyDatabaseMigrations } from './server/database.js';

const iso = (value) => value ? new Date(value).toISOString() : null;
const definitions = {
  users: {
    table: 'users',
    fields: { id: 'id', email: 'email', displayName: 'display_name', role: 'role', passwordSalt: 'password_salt', passwordHash: 'password_hash', identities: 'identities', billing: 'billing', createdAt: 'created_at', updatedAt: 'updated_at' },
    json: ['identities', 'billing'],
  },
  sessions: {
    table: 'sessions',
    fields: { id: 'id', userId: 'user_id', tokenHash: 'token_hash', csrf: 'csrf', createdAt: 'created_at', expiresAt: 'expires_at' },
  },
  keys: {
    table: 'api_keys',
    fields: { id: 'id', userId: 'user_id', name: 'name', hash: 'hash', prefix: 'prefix', lastFour: 'last_four', scopes: 'scopes', expiresAt: 'expires_at', createdAt: 'created_at', lastUsedAt: 'last_used_at', revokedAt: 'revoked_at' },
  },
  usage: {
    table: 'usage_events',
    fields: { id: 'id', keyId: 'key_id', userId: 'user_id', endpoint: 'endpoint', model: 'model', status: 'status', promptTokens: 'prompt_tokens', completionTokens: 'completion_tokens', totalTokens: 'total_tokens', createdAt: 'created_at' },
  },
  conversations: {
    table: 'conversations',
    fields: { id: 'id', userId: 'user_id', messages: 'messages', createdAt: 'created_at', updatedAt: 'updated_at' },
    json: ['messages'],
  },
  passwordResets: {
    table: 'password_resets',
    fields: { id: 'id', userId: 'user_id', tokenHash: 'token_hash', expiresAt: 'expires_at', createdAt: 'created_at' },
  },
};

const emptyData = () => ({ version: 1, users: [], sessions: [], keys: [], usage: [], conversations: [], passwordResets: [] });
const MAX_TRANSACTION_ATTEMPTS = 4;
const isRetryableTransactionError = (error) => ['40001', '40P01'].includes(error?.code);

// PostgreSQL parameters cannot represent identifiers. Keep table names behind
// this strict allowlist instead of interpolating arbitrary configuration.
const allowedTables = new Set(Object.values(definitions).map(({ table }) => table));
function tableName(definition) {
  if (!allowedTables.has(definition.table) || !/^[a-z_][a-z0-9_]*$/.test(definition.table)) {
    throw new TypeError('Invalid database table definition');
  }
  return definition.table;
}

function fromRow(definition, row) {
  const item = {};
  for (const [property, column] of Object.entries(definition.fields)) {
    const value = row[column];
    item[property] = property.endsWith('At') ? iso(value) : value;
  }
  return item;
}

function valuesFor(definition, item) {
  return Object.entries(definition.fields).map(([property]) => {
    let value = item[property] ?? null;
    if ((property === 'createdAt' || (property === 'updatedAt' && definition.table === 'conversations')) && !value) value = new Date().toISOString();
    if (property === 'updatedAt' && definition.table === 'conversations') value = new Date().toISOString();
    return definition.json?.includes(property) ? JSON.stringify(value ?? (property === 'billing' ? {} : [])) : value;
  });
}

export class PostgresStore {
  constructor(pool) {
    this.pool = pool;
    this.data = emptyData();
    this.writeQueue = Promise.resolve();
  }

  async init() {
    if (process.env.NODE_ENV === 'production') await verifyDatabaseMigrations(this.pool);
    else await migrateDatabase(this.pool);
    await this.refresh();
    return this;
  }

  async read(client = this.pool) {
    const data = emptyData();
    for (const [collection, definition] of Object.entries(definitions)) {
      const result = await client.query(`SELECT * FROM ${tableName(definition)} ORDER BY created_at ASC, id ASC`);
      data[collection] = result.rows.map((row) => fromRow(definition, row));
    }
    return data;
  }

  async refresh() {
    this.data = await this.read();
    return this;
  }

  async update(mutator) {
    // Keep a per-instance queue for predictable in-memory cache updates, while
    // PostgreSQL SERIALIZABLE transactions coordinate independent instances.
    // This avoids a single advisory lock shared by every application instance.
    const operation = this.writeQueue.then(async () => {
      for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
        const client = await this.pool.connect();
        try {
          await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
          const before = await this.read(client);
          const data = structuredClone(before);
          const result = await mutator(data);
          const removalOrder = ['passwordResets', 'usage', 'conversations', 'sessions', 'keys', 'users'];
          for (const collection of removalOrder) {
            const definition = definitions[collection];
            const retained = new Set(data[collection].map((item) => item.id));
            const removed = before[collection].filter((item) => !retained.has(item.id)).map((item) => item.id);
            if (removed.length) await client.query(`DELETE FROM ${tableName(definition)} WHERE id = ANY($1::uuid[])`, [removed]);
          }
          for (const [collection, definition] of Object.entries(definitions)) {
            const previous = new Map(before[collection].map((item) => [item.id, item]));
            for (const item of data[collection]) {
              if (previous.has(item.id) && isDeepStrictEqual(previous.get(item.id), item)) continue;
              const columns = Object.values(definition.fields);
              const placeholders = columns.map((_, index) => `$${index + 1}`);
              const updates = columns.filter((column) => column !== 'id').map((column) => `${column} = EXCLUDED.${column}`);
              await client.query(`INSERT INTO ${tableName(definition)} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`, valuesFor(definition, item));
            }
          }
          await client.query('COMMIT');
          this.data = data;
          this.lastWriteError = null;
          return result;
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
            await delay(10 * (2 ** attempt));
            continue;
          }
          throw error;
        } finally {
          client.release();
        }
      }
      throw new Error('PostgreSQL transaction retry limit reached');
    });
    this.writeQueue = operation.then(
      () => { this.lastWriteError = null; },
      (error) => { this.lastWriteError = error; },
    );
    return operation;
  }

  async appendConversationMessages(userId, messages) {
    const client = await this.pool.connect();
    try {
      const id = crypto.randomUUID();
      const payload = JSON.stringify(messages);
      const result = await client.query(
        'INSERT INTO conversations (id, user_id, messages) VALUES ($1, $2, $3::jsonb) ON CONFLICT (user_id) DO UPDATE SET messages = (conversations.messages || EXCLUDED.messages), updated_at = now() RETURNING *',
        [id, userId, payload],
      );
      const row = result.rows[0];
      const item = fromRow(definitions.conversations, row);
      const index = this.data.conversations.findIndex((entry) => entry.userId === userId);
      if (index >= 0) this.data.conversations[index] = item;
      else this.data.conversations.push(item);
      return item;
    } finally {
      client.release();
    }
  }

  async appendUsageEvent(event) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (event.userId) await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [event.userId]);
      await client.query(
        'INSERT INTO usage_events (id, key_id, user_id, endpoint, model, status, prompt_tokens, completion_tokens, total_tokens, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [event.id, event.keyId, event.userId, event.endpoint, event.model, event.status, event.promptTokens, event.completionTokens, event.totalTokens, event.createdAt],
      );
      await client.query(
        'DELETE FROM usage_events WHERE id IN (SELECT id FROM usage_events WHERE user_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC, id DESC OFFSET 10000)',
        [event.userId],
      );
      await client.query('COMMIT');
      this.data.usage.unshift(event);
      this.data.usage = this.data.usage.filter((item) => item.userId !== event.userId || item.id === event.id)
        .concat(this.data.usage.filter((item) => item.userId === event.userId && item.id !== event.id).slice(0, 9999));
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async touchApiKey(id, timestamp = new Date().toISOString()) {
    await this.pool.query(
      "UPDATE api_keys SET last_used_at = $2 WHERE id = $1 AND (last_used_at IS NULL OR last_used_at <= $2::timestamptz - interval '60 seconds')",
      [id, timestamp],
    );
  }

  async revokeApiKey(id, userId, timestamp = new Date().toISOString()) {
    const result = await this.pool.query(
      'UPDATE api_keys SET revoked_at = $3 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL RETURNING id',
      [id, userId, timestamp],
    );
    return result.rowCount > 0;
  }

  async deleteSession(id) {
    await this.pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    this.data.sessions = this.data.sessions.filter((session) => session.id !== id);
  }

  async createApiKey(key, now = new Date().toISOString()) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [key.userId]);
      const count = await client.query(
        'SELECT count(*)::integer AS count FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > $2)',
        [key.userId, now],
      );
      if (count.rows[0].count >= 10) {
        await client.query('ROLLBACK');
        return false;
      }
      const definition = definitions.keys;
      const columns = Object.values(definition.fields);
      const placeholders = columns.map((_, index) => `${index + 1}`);
      await client.query(
        `INSERT INTO api_keys (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
        valuesFor(definition, key),
      );
      await client.query('COMMIT');
      this.data.keys.push(key);
      return true;
    } catch (error) {
      try { await client.query('ROLLBACK'); } catch {}
      throw error;
    } finally {
      client.release();
    }
  }

  async cleanExpiredSessions(now = Date.now()) {
    for (let attempt = 0; attempt < MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
        await client.query('DELETE FROM sessions WHERE expires_at <= $1', [new Date(now).toISOString()]);
        await client.query('COMMIT');
        this.data.sessions = this.data.sessions.filter((session) => Date.parse(session.expiresAt) > now);
        return;
      } catch (error) {
        try { await client.query('ROLLBACK'); } catch {}
        if (isRetryableTransactionError(error) && attempt < MAX_TRANSACTION_ATTEMPTS - 1) {
          await delay(10 * (2 ** attempt));
          continue;
        }
        throw error;
      } finally {
        client.release();
      }
    }
    throw new Error('PostgreSQL session cleanup retry limit reached');
  }
}
