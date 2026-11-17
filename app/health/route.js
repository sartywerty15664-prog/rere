import { getDatabase } from '@/src/server/database.js';
import { json } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function GET() {
  try {
    if (process.env.DATABASE_URL) {
      await getStore();
      await getDatabase().query('SELECT 1');
      return json({ status: 'ok', service: 'mindlarp-site', database: 'postgresql' });
    }
    await getStore();
    return json({ status: 'ok', service: 'mindlarp-site', database: 'json' });
  } catch {
    return json({ status: 'error', service: 'mindlarp-site', database: 'unavailable' }, 503);
  }
}
