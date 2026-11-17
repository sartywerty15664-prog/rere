import { keysPage } from '@/src/views/console.js';
import { requireUser } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'API keys', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const { user, session } = await requireUser();
  const store = await getStore();
  const keys = store.data.keys.filter((key) => key.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return keysPage({ user, csrf: session.csrf, keys, openCreate: (await searchParams).new === '1' });
}
