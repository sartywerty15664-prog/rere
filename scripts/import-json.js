import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createPool, migrateDatabase } from '../src/server/database.js';
import { PostgresStore } from '../src/postgres-store.js';

const file = resolve(process.env.DATA_FILE || 'data/mindlarp.json');
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL or DIRECT_URL before importing JSON data.');
  process.exit(1);
}

const imported = JSON.parse(await readFile(file, 'utf8'));
const pool = createPool(connectionString);
try {
  await migrateDatabase(pool);
  const store = new PostgresStore(pool);
  await store.init();
  await store.update((data) => {
    for (const collection of ['users', 'sessions', 'keys', 'usage', 'conversations', 'passwordResets']) {
      const existing = new Set(data[collection].map((item) => item.id));
      data[collection].push(...(imported[collection] || []).filter((item) => !existing.has(item.id)));
    }
  });
  await store.refresh();
  console.log(`Imported ${file}. Current rows: ${Object.entries(store.data).filter(([key]) => key !== 'version').map(([key, rows]) => `${key}=${rows.length}`).join(', ')}`);
  console.log('The source JSON file was left unchanged.');
} finally {
  await pool.end();
}
