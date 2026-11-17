import { chatPage } from '@/src/views/chat.js';
import { requireUser } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Chat', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, session } = await requireUser();
  const store = await getStore();
  const conversation = store.data.conversations.find((item) => item.userId === user.id);
  return chatPage({ user, csrf: session.csrf, messages: conversation?.messages || [], upstreamConfigured: Boolean(process.env.MINDLARP_UPSTREAM_URL) });
}
