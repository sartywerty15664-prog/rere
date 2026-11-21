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
