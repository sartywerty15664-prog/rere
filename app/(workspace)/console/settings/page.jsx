import { settingsPage } from '@/src/views/console.js';
import { requireUser } from '@/src/server/auth.js';

export const metadata = { title: 'Settings', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const { user, session } = await requireUser();
  const messages = { profile: 'Profile updated.', password: 'Password updated. Other sessions have been signed out.' };
  return settingsPage({ user, csrf: session.csrf, message: messages[(await searchParams).updated] || '' });
}
