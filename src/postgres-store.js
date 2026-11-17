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
      const result = await client.query(`SELECT * FROM ${definition.table} ORDER BY created_at ASC, id ASC`);
      data[collection] = result.rows.map((row) => fromRow(definition, row));
    }
    return data;
  }

  async refresh() {
    this.data = await this.read();
    return this;
  }

  async update(mutator) {
    const operation = this.writeQueue.then(async () => {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(741852963)');
        const before = await this.read(client);
        const data = structuredClone(before);
        const result = await mutator(data);
        const removalOrder = ['passwordResets', 'usage', 'conversations', 'sessions', 'keys', 'users'];
        for (const collection of removalOrder) {
          const definition = definitions[collection];
          const retained = new Set(data[collection].map((item) => item.id));
          const removed = before[collection].filter((item) => !retained.has(item.id)).map((item) => item.id);
          if (removed.length) await client.query(`DELETE FROM ${definition.table} WHERE id = ANY($1::uuid[])`, [removed]);
        }
        for (const [collection, definition] of Object.entries(definitions)) {
          const previous = new Map(before[collection].map((item) => [item.id, JSON.stringify(item)]));
          for (const item of data[collection]) {
            if (previous.get(item.id) === JSON.stringify(item)) continue;
            const columns = Object.values(definition.fields);
            const placeholders = columns.map((_, index) => `$${index + 1}`);
            const updates = columns.filter((column) => column !== 'id').map((column) => `${column} = EXCLUDED.${column}`);
            await client.query(`INSERT INTO ${definition.table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates.join(', ')}`, valuesFor(definition, item));
          }
        }
        await client.query('COMMIT');
        this.data = data;
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    });
    this.writeQueue = operation.catch(() => {});
    return operation;
  }

  async cleanExpiredSessions(now = Date.now()) {
    await this.update((data) => {
      data.sessions = data.sessions.filter((session) => Date.parse(session.expiresAt) > now);
    });
  }
}
