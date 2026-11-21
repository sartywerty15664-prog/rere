import { createSession, normalizeEmail, setSessionCookie, verifyPassword } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { checkSameOrigin } from '@/src/server/request-security.js';

export async function POST(request) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  const { body, error } = await readForm(request);
  if (error) return error;

  const email = normalizeEmail(body.get('email'));
  const password = body.get('password');
  const rate = consumeRateLimit(request, 'owner-login', {
    limit: 8,
    windowMs: 15 * 60_000,
    identifier: email,
  });

  if (!rate.allowed) return formRedirect(request, '/login?error=limit');

  const store = await getStore();
  const user = store.data.users.find((item) => normalizeEmail(item.email) === email);
  // Password login is a recovery path for the original workspace owner only.
  // OAuth-created member accounts continue to use their linked provider.
  const valid = user?.role === 'owner' && user.passwordSalt && user.passwordHash &&
    typeof password === 'string' && password.length <= 1024 &&
    await verifyPassword(password, user.passwordSalt, user.passwordHash);

  if (!valid) return formRedirect(request, '/login?error=invalid');

  const session = await createSession(user.id);
  return setSessionCookie(formRedirect(request, '/console'), session.token);
}
