import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from '../src/store.js';

test('JSON store commits a draft only after the atomic file write succeeds', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mindlarp-store-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'store.json');
  const store = await new Store(filePath).init();

  await assert.rejects(store.update((data) => {
    data.users.push({ id: 'not-committed' });
    throw new Error('mutation failed');
  }), /mutation failed/);
  assert.equal(store.data.users.length, 0);
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).users, []);

  const persist = store.persist.bind(store);
  store.persist = async () => { throw new Error('disk unavailable'); };
  await assert.rejects(store.update((data) => {
    data.users.push({ id: 'not-persisted' });
  }), /disk unavailable/);
  assert.equal(store.data.users.length, 0);
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).users, []);

  store.persist = persist;
  await store.update((data) => {
    data.users.push({ id: 'committed' });
  });
  assert.deepEqual(store.data.users.map((user) => user.id), ['committed']);
  assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).users.map((user) => user.id), ['committed']);
});


test('JSON store persists expired-session cleanup', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mindlarp-sessions-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'store.json');
  const store = await new Store(filePath).init();
  await store.update((data) => {
    data.sessions.push(
      { id: 'expired', expiresAt: new Date(1000).toISOString() },
      { id: 'active', expiresAt: new Date(3000).toISOString() },
    );
  });

  await store.cleanExpiredSessions(2000);
  assert.deepEqual(store.data.sessions.map((session) => session.id), ['active']);
  assert.deepEqual(
    JSON.parse(await readFile(filePath, 'utf8')).sessions.map((session) => session.id),
    ['active'],
  );
});


test('store targeted operations persist chat, usage, key, and session changes', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mindlarp-targeted-store-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, 'store.json');
  const store = await new Store(filePath).init();
  const userId = 'user-1';
  const key = { id: 'key-1', userId, name: 'Test', revokedAt: null, expiresAt: null };

  await store.update((data) => {
    data.users.push({ id: userId });
    data.keys.push(key);
    data.sessions.push({ id: 'session-1', userId });
  });
  assert.equal(await store.createApiKey({ ...key, id: 'key-2' }), true);
  assert.equal(await store.revokeApiKey('key-1', userId), true);
  await store.touchApiKey('key-2');
  await store.deleteSession('session-1');
  await store.appendConversationMessages(userId, [
    { role: 'user', content: 'Hello' },
    { role: 'assistant', content: 'Hi' },
  ]);
  await store.appendUsageEvent({
    id: 'usage-1', keyId: 'key-2', userId, endpoint: '/chat',
    model: 'test', status: 200, promptTokens: 1,
    completionTokens: 1, totalTokens: 2, createdAt: new Date().toISOString(),
  });

  const persisted = JSON.parse(await readFile(filePath, 'utf8'));
  assert.equal(persisted.keys.find((item) => item.id === 'key-1').revokedAt !== null, true);
  assert.ok(persisted.keys.find((item) => item.id === 'key-2').lastUsedAt);
  assert.equal(persisted.sessions.length, 0);
  assert.deepEqual(persisted.conversations[0].messages.map((item) => item.content), ['Hello', 'Hi']);
  assert.equal(persisted.usage[0].id, 'usage-1');
});
