import { redirect } from 'next/navigation';
import { authPage } from '@/src/views/public.js';
import { getStore } from '@/src/server/store.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Set up workspace', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (store.data.users.length) redirect('/login');
  const query = await searchParams;
  const error = query.error === 'oauth' ? 'Workspace setup could not be completed. Please try again.' : '';
  return authPage({ mode: 'setup', error });
}
