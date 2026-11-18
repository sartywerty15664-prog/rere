import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createPool } from '../src/server/database.js';
import { PostgresStore } from '../src/postgres-store.js';

const administratorUrl = process.env.TEST_DATABASE_URL;

test('PostgreSQL migrations, production schema verification, writes, refresh, revocation, and cleanup', { skip: !administratorUrl, timeout: 60000 }, async (t) => {
  const name = `mindlarp_test_${randomUUID().replaceAll('-', '')}`;
  const administrator = createPool(administratorUrl);
  await administrator.query(`CREATE DATABASE "${name}"`);
  const url = new URL(administratorUrl);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString());
  t.after(async () => {
    await pool.end();
    await administrator.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await administrator.end();
  });

  const store = await new PostgresStore(pool).init();
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });
  const userId = randomUUID();
  const keyId = randomUUID();
  const sessionId = randomUUID();
  const resetId = randomUUID();
  const timestamp = new Date().toISOString();
  await store.update((data) => {
    data.users.push({ id: userId, email: 'postgres@example.com', displayName: 'Postgres User', role: 'owner', identities: [], billing: {}, passwordSalt: 'salt', passwordHash: 'hash', createdAt: timestamp, updatedAt: timestamp });
    data.sessions.push({ id: sessionId, userId, tokenHash: randomUUID(), csrf: 'csrf', createdAt: timestamp, expiresAt: new Date(Date.now() + 3600000).toISOString() });
    data.keys.push({ id: keyId, userId, name: 'Test key', hash: randomUUID(), prefix: 'ml_sk_live_test', lastFour: 'test', scopes: ['models:read'], createdAt: timestamp, expiresAt: null, lastUsedAt: null, revokedAt: null });
    data.usage.push({ id: randomUUID(), keyId, userId, endpoint: '/v1/models', model: null, status: 200, promptTokens: 0, completionTokens: 0, totalTokens: 0, createdAt: timestamp });
    data.conversations.push({ id: randomUUID(), userId, messages: [{ role: 'user', content: 'Hello', createdAt: timestamp }] });
    data.passwordResets.push({ id: resetId, userId, tokenHash: randomUUID(), createdAt: timestamp, expiresAt: new Date(Date.now() + 1800000).toISOString() });
  });

  const second = await new PostgresStore(pool).init();
  assert.equal(second.data.users[0].email, 'postgres@example.com');
  assert.equal(second.data.conversations[0].messages[0].content, 'Hello');
  assert.ok(second.data.conversations[0].createdAt);
  assert.equal(second.data.keys[0].scopes[0], 'models:read');

  await store.update((data) => {
    data.keys[0].revokedAt = new Date().toISOString();
    data.keys[0].lastUsedAt = new Date().toISOString();
    data.users[0].billing = { status: 'active', stripeCustomerId: 'cus_test' };
    data.conversations[0].messages.push({ role: 'assistant', content: 'A real answer.', createdAt: timestamp });
    data.sessions = [];
    data.passwordResets = [];
  });
  await second.refresh();
  assert.ok(second.data.keys[0].revokedAt);
  assert.equal(second.data.users[0].billing.status, 'active');
  assert.equal(second.data.conversations[0].messages.length, 2);
  assert.equal(second.data.sessions.length, 0);
  assert.equal(second.data.passwordResets.length, 0);

  const tables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ANY($1)", [['users', 'sessions', 'api_keys', 'usage_events', 'conversations', 'password_resets']]);
  assert.equal(tables.rowCount, 6);
  const rls = await pool.query("SELECT count(*)::integer AS count FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true AND tablename <> 'schema_migrations'");
  assert.equal(rls.rows[0].count, 6);
  const legacyShape = await pool.query("SELECT count(*)::integer AS count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'data' AND data_type = 'jsonb'");
  assert.equal(legacyShape.rows[0].count, 0);
});
