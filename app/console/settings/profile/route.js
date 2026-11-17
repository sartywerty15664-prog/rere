import { requireUser, requireCsrf, normalizeEmail, validEmail } from '@/src/server/auth.js';
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
  const displayName = String(body.get('displayName') || '').trim();
  const email = normalizeEmail(body.get('email'));
  const options = { user, csrf: session.csrf, path: '/console/settings' };
  if (!displayName || displayName.length > 80 || !validEmail(email)) return htmlResponse(settingsContent({ user, csrf: session.csrf, error: 'Enter a valid name and email address.' }), 'Settings', 400, options);
  const store = await getStore();
  if (store.data.users.some((item) => item.id !== user.id && item.email === email)) return htmlResponse(settingsContent({ user, csrf: session.csrf, error: 'That email address is already in use.' }), 'Settings', 409, options);
  await store.update((data) => {
    const stored = data.users.find((item) => item.id === user.id);
    stored.displayName = displayName;
    stored.email = email;
    stored.updatedAt = new Date().toISOString();
  });
  return formRedirect(request, '/console/settings?updated=profile');
}
