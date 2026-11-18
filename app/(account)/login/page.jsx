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
    oauth: 'Social sign-in could not be completed. Try again or use your password.',
    'oauth-config': 'Google or GitHub sign-in is not configured yet.',
    consent: 'To create a new account with Google or GitHub, first agree to the Personal Data Processing Policy.',
    credentials: 'Email or password is incorrect.',
    limit: 'Too many attempts. Try again later.',
    google: 'Google sign-in is not configured on this server.',
    github: 'GitHub sign-in is not configured on this server.',
  };
  return authPage({ mode: 'login', error: errors[query.error] || '', notice: query.reset === 'success' ? 'Password updated. Sign in with your new password.' : '', values: { email: query.email || '' } });
}
