import { createPool, migrateDatabase } from '../src/server/database.js';

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL or DIRECT_URL before running migrations.');
  process.exit(1);
}

const pool = createPool(connectionString);
try {
  await migrateDatabase(pool);
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
