import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// auth.js imports Next.js request-scoped modules that only resolve inside the
// Next.js bundler; createSession never calls them, so stub them for this test.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'next/headers') {
      return { url: 'data:text/javascript,export function cookies() { throw new Error("cookies() is not available in this test"); }', shortCircuit: true };
    }
    if (specifier === 'next/navigation') {
      return { url: 'data:text/javascript,export function redirect() { throw new Error("redirect() is not available in this test"); }', shortCircuit: true };
    }
    return nextResolve(specifier, context);
  },
});

test('createSession prunes expired sessions and persists the result', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'mindlarp-sessions-'));
  const previousDataFile = process.env.DATA_FILE;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATA_FILE = join(directory, 'store.json');
  delete process.env.DATABASE_URL;
  t.after(async () => {
    if (previousDataFile === undefined) delete process.env.DATA_FILE;
    else process.env.DATA_FILE = previousDataFile;
    if (previousDatabaseUrl !== undefined) process.env.DATABASE_URL = previousDatabaseUrl;
    await rm(directory, { recursive: true, force: true });
  });

  const { getStore } = await import('../src/server/store.js');
  const { createSession } = await import('../src/server/auth.js');
  const store = await getStore();
  const userId = randomUUID();
  const timestamp = new Date().toISOString();
  await store.update((data) => {
    data.users.push({ id: userId, email: 'sessions@example.com', displayName: 'Sessions User', role: 'owner', identities: [], billing: {}, passwordSalt: null, passwordHash: null, createdAt: timestamp, updatedAt: timestamp });
    data.sessions.push({ id: randomUUID(), userId, tokenHash: 'expired-token', csrf: 'csrf', createdAt: timestamp, expiresAt: new Date(Date.now() - 1000).toISOString() });
  });

  const { session } = await createSession(userId);
  assert.equal(store.data.sessions.length, 1);
  assert.equal(store.data.sessions[0].id, session.id);

  const persisted = JSON.parse(await readFile(process.env.DATA_FILE, 'utf8'));
  assert.equal(persisted.sessions.length, 1);
  assert.equal(persisted.sessions[0].id, session.id);
});