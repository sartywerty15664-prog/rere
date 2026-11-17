import { requireUser, requireCsrf, setSessionCookie } from '@/src/server/auth.js';
import { htmlResponse } from '@/src/server/html.jsx';
import { notFoundContent } from '@/src/views/public.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request) {
  const auth = await requireUser();
  const { body, error } = await readForm(request);
  if (error) return error;
  if (!requireCsrf(Object.fromEntries(body), auth)) return htmlResponse(notFoundContent(), 'Forbidden', 403);
  const store = await getStore();
  await store.update((data) => { data.sessions = data.sessions.filter((item) => item.id !== auth.session.id); });
  return setSessionCookie(formRedirect(request, '/login'), '', 0);
}
