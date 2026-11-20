import { redirect } from 'next/navigation';
import { forgotPasswordPage } from '@/src/views/public.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Recover account', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (!store.data.users.length) redirect('/setup');
  const query = await searchParams;
  const errors = { smtp: 'Password recovery is not configured on this server. Contact the administrator.', email: 'Enter a valid email address.', limit: 'Too many recovery attempts. Try again later.' };
  return forgotPasswordPage({ error: errors[query.error] || '', notice: query.sent === '1' ? 'If an account matches that email, password reset instructions will be sent. The link is valid for 30 minutes.' : '', email: query.email || '' });
}
