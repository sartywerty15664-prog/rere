import { requireUser, requireCsrf, hashPassword, verifyPassword } from '@/src/server/auth.js';
import { htmlResponse } from '@/src/server/html.jsx';
import { settingsContent } from '@/src/views/console.js';
import { notFoundContent } from '@/src/views/public.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request) {
  const auth = await requireUser();
  const { body, error: bodyError } = await readForm(request);
  if (bodyError) return bodyError;
  if (!requireCsrf(Object.fromEntries(body), auth)) return htmlResponse(notFoundContent(), 'Forbidden', 403);
  const { user, session } = auth;
  const password = body.get('newPassword');
  const options = { user, csrf: session.csrf, path: '/console/settings' };
  if (typeof password !== 'string' || password.length < 12 || password.length > 1024) return htmlResponse(settingsContent({ user, csrf: session.csrf, error: 'New password must contain at least 12 characters.' }), 'Settings', 400, options);
  if (password !== body.get('confirmPassword')) return htmlResponse(settingsContent({ user, csrf: session.csrf, error: 'New passwords do not match.' }), 'Settings', 400, options);
  if (user.passwordHash && (typeof body.get('currentPassword') !== 'string' || !await verifyPassword(body.get('currentPassword'), user.passwordSalt, user.passwordHash))) return htmlResponse(settingsContent({ user, csrf: session.csrf, error: 'Current password is incorrect.' }), 'Settings', 400, options);
  const passwordRecord = await hashPassword(password);
  const store = await getStore();
  await store.update((data) => {
    const stored = data.users.find((item) => item.id === user.id);
    stored.passwordSalt = passwordRecord.salt;
    stored.passwordHash = passwordRecord.hash;
    stored.updatedAt = new Date().toISOString();
    data.sessions = data.sessions.filter((item) => item.userId !== user.id || item.id === session.id);
  });
  return formRedirect(request, '/console/settings?updated=password');
}
