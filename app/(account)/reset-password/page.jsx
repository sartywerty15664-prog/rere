import { resetPasswordPage } from '@/src/views/public.js';
import { getStore } from '@/src/server/store.js';
import { hashToken, safeEqual } from '@/src/server/auth.js';

export const metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const query = await searchParams;
  const token = query.token || '';
  const store = await getStore();
  const reset = token && store.data.passwordResets.find((item) => Date.parse(item.expiresAt) > Date.now() && safeEqual(item.tokenHash, hashToken(token)));
  if (!reset) return resetPasswordPage({ error: 'This reset link is invalid or has expired. Request a new one.' });
  const error = query.error === 'invalid' ? 'Passwords must match and contain at least 12 characters.' : query.error === 'limit' ? 'Too many reset attempts. Try again later.' : '';
  return resetPasswordPage({ token, error });
}
