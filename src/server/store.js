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
  if (process.env.DATABASE_URL) {
    const configuredTtl = Number(process.env.STORE_CACHE_TTL_MS || 1000);
    const ttl = Number.isFinite(configuredTtl) && configuredTtl > 0 ? Math.max(250, configuredTtl) : 1000;
    if (!store.lastRefreshAt || Date.now() - store.lastRefreshAt >= ttl) await store.refresh();
  }
  return store;
}
