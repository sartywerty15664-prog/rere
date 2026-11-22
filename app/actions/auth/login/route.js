import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  verifyPassword,
} from '@/src/server/auth.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { checkSameOrigin } from '@/src/server/request-security.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  const ipRate = consumeRateLimit(request, 'owner-login-ip', { limit: 20, windowMs: 15 * 60_000 });
  if (!ipRate.allowed) return formRedirect(request, '/owner-login?error=limit');

  const { body, error } = await readForm(request);
  if (error) return error;

  const email = normalizeEmail(body.get('email'));
  const password = body.get('password');
  const accountRate = consumeRateLimit(request, 'owner-login-account', {
    limit: 8,
    windowMs: 15 * 60_000,
    identifier: email || 'invalid',
  });
  if (!accountRate.allowed) return formRedirect(request, '/owner-login?error=limit');

  if (!email || typeof password !== 'string' || password.length < 1 || password.length > 1024) {
    return formRedirect(request, '/owner-login?error=invalid');
  }

  const store = await getStore();
  const owner = store.data.users.find((user) => user.role === 'owner' && normalizeEmail(user.email) === email);
  const valid = Boolean(owner?.passwordSalt && owner?.passwordHash)
    && await verifyPassword(password, owner.passwordSalt, owner.passwordHash);

  if (!valid) return formRedirect(request, '/owner-login?error=invalid');

  const session = await createSession(owner.id);
  return setSessionCookie(formRedirect(request, '/console'), session.token);
}
