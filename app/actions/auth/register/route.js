import {
  createPasswordUser,
  createSession,
  normalizeEmail,
  setSessionCookie,
  validEmail,
} from '@/src/server/auth.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';
import { checkSameOrigin } from '@/src/server/request-security.js';

export async function POST(request) {
  const originError = checkSameOrigin(request);
if (originError) return originError;
  const rate = consumeRateLimit(request, 'register', {
    limit: 5,
    windowMs: 60 * 60_000,
  });

  if (!rate.allowed) {
    return formRedirect(request, '/register?error=limit');
  }

  const { body, error } = await readForm(request);

  if (error) return error;

  const store = await getStore();

  if (!store.data.users.length) {
    return formRedirect(request, '/setup');
  }

  const displayName = String(body.get('displayName') || '').trim();
  const email = normalizeEmail(body.get('email'));
  const password = body.get('password');

  const returnTo = `/register?displayName=${encodeURIComponent(
    displayName
  )}&email=${encodeURIComponent(email)}`;

  const valid =
    displayName &&
    displayName.length <= 80 &&
    validEmail(email) &&
    typeof password === 'string' &&
    password.length >= 12 &&
    password.length <= 1024 &&
    password === body.get('confirmPassword');

  if (!valid) {
    return formRedirect(request, `${returnTo}&error=invalid`);
  }

  const user = await createPasswordUser({
    displayName,
    email,
    password,
    requireExistingUser: true,
  });

  if (!user) {
    const latestStore = await getStore();

    if (!latestStore.data.users.length) {
      return formRedirect(request, '/setup');
    }

    return formRedirect(request, `${returnTo}&error=exists`);
  }

  const session = await createSession(user.id);

  return setSessionCookie(
    formRedirect(request, '/console'),
    session.token
  );
}
