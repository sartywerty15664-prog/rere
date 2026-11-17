import { billingPage } from '@/src/views/console.js';
import { requireUser } from '@/src/server/auth.js';
import { billingConfigured } from '@/src/server/config.js';

export const metadata = { title: 'Billing', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page() {
  const { user, session } = await requireUser();
  return billingPage({ user, csrf: session.csrf, configured: billingConfigured() });
}
