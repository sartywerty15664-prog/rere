import { usagePage } from '@/src/views/console.js';
import { requireUser } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';
import { getUsageStats } from '@/src/server/usage.js';

export const metadata = { title: 'Usage', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const { user, session } = await requireUser();
  const requestedDays = Number((await searchParams).days);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
  const store = await getStore();
  const usage = store.data.usage.filter((event) => event.userId === user.id);
  return usagePage({ user, csrf: session.csrf, stats: getUsageStats(store, user.id, days), usage, days });
}
