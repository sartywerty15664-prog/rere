import { redirect } from 'next/navigation';
import { authPage } from '@/src/views/public.js';
import { getStore } from '@/src/server/store.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up workspace', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (store.data.users.length) redirect('/login');
  const query = await searchParams;
  const error = query.error === 'oauth' ? 'Workspace setup could not be completed. Please try again.' : query.error === 'invalid' ? 'Passwords must match and contain at least 12 characters.' : query.error === 'limit' ? 'Too many setup attempts. Try again later.' : '';
  return authPage({ mode: 'setup', error });
}
