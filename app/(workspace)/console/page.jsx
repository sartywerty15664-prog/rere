import { overviewPage } from '@/src/views/console.js';
import { requireUser } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';
import { getUsageStats } from '@/src/server/usage.js';

export const metadata = { title: 'Overview', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, session } = await requireUser();
  const store = await getStore();
  const keys = store.data.keys.filter((key) => key.userId === user.id);
  const usage = store.data.usage.filter((event) => event.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return overviewPage({ user, csrf: session.csrf, stats: getUsageStats(store, user.id, 30), keys, usage });
}
