import { redirect } from 'next/navigation';
import { authPage } from '@/src/views/public.js';
import { getCurrentAuth } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (!store.data.users.length) redirect('/setup');
  if (await getCurrentAuth()) redirect('/console');
  const query = await searchParams;
  const errors = {
    oauth: 'Social sign-in could not be completed. Please try again.',
    'oauth-config': 'A sign-in provider is not configured yet.',
    apple: 'Apple sign-in is not configured on this server.',
    google: 'Google sign-in is not configured on this server.',
    github: 'GitHub sign-in is not configured on this server.',
  };
  return authPage({ mode: 'login', error: errors[query.error] || '' });
}
