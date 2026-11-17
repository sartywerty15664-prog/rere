import { resolve } from 'node:path';
import { Store } from '../store.js';
import { PostgresStore } from '../postgres-store.js';
import { getDatabase } from './database.js';

export async function getStore() {
  if (!globalThis.__mindLarpStorePromise) {
    const store = process.env.DATABASE_URL
      ? new PostgresStore(getDatabase())
      : new Store(process.env.DATA_FILE ? resolve(process.env.DATA_FILE) : resolve('data/mindlarp.json'));
    globalThis.__mindLarpStorePromise = store.init().catch((error) => {
      globalThis.__mindLarpStorePromise = null;
      throw error;
    });
  }
  const store = await globalThis.__mindLarpStorePromise;
  if (process.env.DATABASE_URL) await store.refresh();
  return store;
}
