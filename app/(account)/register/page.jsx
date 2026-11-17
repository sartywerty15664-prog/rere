import { redirect } from 'next/navigation';
import { authPage } from '@/src/views/public.js';
import { getCurrentAuth } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Create account', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (!store.data.users.length) redirect('/setup');
  if (await getCurrentAuth()) redirect('/console');
  const query = await searchParams;
  const errors = { invalid: 'Check your name and email. Passwords must match and contain at least 12 characters.', exists: 'An account with this email already exists. Sign in instead.', limit: 'Too many registration attempts. Try again later.' };
  return authPage({ mode: 'register', error: errors[query.error] || '', values: { displayName: query.displayName || '', email: query.email || '' } });
}
