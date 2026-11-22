import { redirect } from 'next/navigation';
import { ownerLoginPage } from '@/src/views/public.js';
import { getCurrentAuth } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Owner sign in', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  const owner = store.data.users.find((user) => user.role === 'owner' && user.passwordHash);
  if (!owner) redirect(store.data.users.length ? '/login' : '/setup');
  if (await getCurrentAuth()) redirect('/console');

  const query = await searchParams;
  const errors = {
    invalid: 'The email or password is incorrect.',
    limit: 'Too many sign-in attempts. Try again later.',
  };
  return ownerLoginPage({ error: errors[query.error] || '' });
}
