import { hashPassword, hashToken, safeEqual, setSessionCookie } from '@/src/server/auth.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request) {
  const rate = consumeRateLimit(request, 'password-reset', { limit: 10, windowMs: 15 * 60_000 });
  if (!rate.allowed) return formRedirect(request, '/reset-password?error=limit');
  const { body, error } = await readForm(request);
  if (error) return error;
  const token = String(body.get('token') || '');
  const store = await getStore();
  const reset = token && store.data.passwordResets.find((item) => Date.parse(item.expiresAt) > Date.now() && safeEqual(item.tokenHash, hashToken(token)));
  const user = reset && store.data.users.find((item) => item.id === reset.userId);
  if (!reset || !user) return formRedirect(request, '/reset-password?error=invalid');
  const password = body.get('password');
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024 || password !== body.get('confirmPassword')) return formRedirect(request, `/reset-password?token=${encodeURIComponent(token)}&error=invalid`);
  const passwordRecord = await hashPassword(password);
  let consumed = false;
  await store.update((data) => {
    const currentReset = data.passwordResets.find((item) => item.userId === user.id && Date.parse(item.expiresAt) > Date.now() && safeEqual(item.tokenHash, hashToken(token)));
    const stored = currentReset && data.users.find((item) => item.id === user.id);
    if (!stored) return;
    stored.passwordSalt = passwordRecord.salt;
    stored.passwordHash = passwordRecord.hash;
    stored.updatedAt = new Date().toISOString();
    data.passwordResets = data.passwordResets.filter((item) => item.userId !== user.id);
    data.sessions = data.sessions.filter((item) => item.userId !== user.id);
    consumed = true;
  });
  if (!consumed) return formRedirect(request, '/reset-password?error=invalid');
  return setSessionCookie(formRedirect(request, '/login?reset=success'), '', 0);
}
