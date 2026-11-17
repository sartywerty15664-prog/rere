import { requireUser, requireCsrf } from '@/src/server/auth.js';
import { htmlResponse } from '@/src/server/html.jsx';
import { notFoundContent } from '@/src/views/public.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request, { params }) {
  const auth = await requireUser();
  const { body, error } = await readForm(request);
  if (error) return error;
  if (!requireCsrf(Object.fromEntries(body), auth)) return htmlResponse(notFoundContent(), 'Forbidden', 403);
  const store = await getStore();
  const { id } = await params;
  const key = store.data.keys.find((item) => item.id === id && item.userId === auth.user.id && !item.revokedAt);
  if (!key) return htmlResponse(notFoundContent(), 'Not found', 404);
  await store.update((data) => { data.keys.find((item) => item.id === key.id).revokedAt = new Date().toISOString(); });
  return formRedirect(request, '/console/keys');
}
