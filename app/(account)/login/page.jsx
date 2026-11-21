import { redirect } from 'next/navigation';
import { authPage } from '@/src/views/public.js';
import { getCurrentAuth } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (!store.data.users.length) redirect('/setup');
  if (await getCurrentAuth()) redirect('/console');

  const query = await searchParams;
  const errors = {
    oauth: 'Social sign-in could not be completed. Try again.',
    google: 'Google sign-in is not configured on this server.',
    github: 'GitHub sign-in is not configured on this server.',
    invalid: 'The email or password is incorrect.',
    limit: 'Too many sign-in attempts. Try again in a few minutes.',
    consent: 'Confirm the privacy consent before continuing with social sign-in.',
  };
  return authPage({ mode: 'login', error: errors[query.error] || '' });
}
