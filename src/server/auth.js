import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  hashPassword,
  hashToken,
  randomToken,
  safeEqual,
  verifyPassword,
} from '../security.js';
import { getStore } from './store.js';

const sessionDuration = 12 * 60 * 60 * 1000;

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validEmail(value) {
  return (
    typeof value === 'string' &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export async function getCurrentAuth() {
  const token = (await cookies()).get('ml_session')?.value;

  if (!token) return null;

  const store = await getStore();

  const session = store.data.sessions.find((item) =>
    safeEqual(item.tokenHash, hashToken(token))
  );

  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    return null;
  }

  const user = store.data.users.find(
    (item) => item.id === session.userId
  );

  return user ? { session, user, token } : null;
}

export async function requireUser() {
  const auth = await getCurrentAuth();

  if (auth) return auth;

  const store = await getStore();

  redirect(store.data.users.length ? '/login' : '/setup');
}

export function requireCsrf(body, auth) {
  return (
    auth &&
    typeof body.csrf === 'string' &&
    safeEqual(body.csrf, auth.session.csrf)
  );
}

export async function createSession(userId) {
  const store = await getStore();
  const token = randomToken();

  const session = {
    id: randomUUID(),
    userId,
    tokenHash: hashToken(token),
    csrf: randomToken(24),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + sessionDuration
    ).toISOString(),
  };

  await store.update((data) => {
    if (!data.users.some((user) => user.id === userId)) {
      throw new Error('Cannot create session for missing user');
    }

    data.sessions.push(session);
  });

  return { token, session };
}

export function setSessionCookie(response, token, maxAge = 43200) {
  response.cookies.set('ml_session', token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge,
    secure: process.env.NODE_ENV === 'production',
  });

  return response;
}

export async function createPasswordUser({
  displayName,
  email,
  password,
  onlyIfEmpty = false,
  requireExistingUser = false,
}) {
  const store = await getStore();
  const normalizedEmail = normalizeEmail(email);
  const passwordRecord = await hashPassword(password);

  let user = null;

  await store.update((data) => {
    if (onlyIfEmpty && data.users.length > 0) return;

    if (requireExistingUser && data.users.length === 0) {
      return;
    }

    const alreadyExists = data.users.some(
      (item) => normalizeEmail(item.email) === normalizedEmail
    );

    if (alreadyExists) return;

    user = {
      id: randomUUID(),
      displayName,
      email: normalizedEmail,
      role: data.users.length > 0 ? 'member' : 'owner',
      identities: [],
      passwordSalt: passwordRecord.salt,
      passwordHash: passwordRecord.hash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.users.push(user);
  });

  return user;
}

export async function findOrCreateOAuthUser(identity) {
  const store = await getStore();

  const email = normalizeEmail(identity.email);
  const displayName = String(
    identity.displayName || email.split('@')[0]
  ).slice(0, 80);

  let user = null;

  await store.update((data) => {
    user = data.users.find((item) =>
      item.identities?.some(
        (linked) =>
          linked.provider === identity.provider &&
          linked.providerId === identity.providerId
      )
    );

    if (!user && data.users.some((item) => normalizeEmail(item.email) === email)) {
      throw new Error('An account with this email already exists. Sign in with its original authentication method.');
    }

    if (user) {
      user.identities ||= [];

      const identityExists = user.identities.some(
        (linked) =>
          linked.provider === identity.provider &&
          linked.providerId === identity.providerId
      );

      if (!identityExists) {
        user.identities.push({
          provider: identity.provider,
          providerId: identity.providerId,
        });

        user.updatedAt = new Date().toISOString();
      }

      return;
    }

    user = {
      id: randomUUID(),
      displayName,
      email,
      role: data.users.length > 0 ? 'member' : 'owner',
      identities: [
        {
          provider: identity.provider,
          providerId: identity.providerId,
        },
      ],
      passwordSalt: null,
      passwordHash: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.users.push(user);
  });

  return user;
}

export {
  hashPassword,
  hashToken,
  randomToken,
  safeEqual,
  verifyPassword,
};
