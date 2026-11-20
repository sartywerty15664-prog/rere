import { completeOAuth, oauthCookieName } from '@/src/oauth.js';
import { createSession, findOrCreateOAuthUser, setSessionCookie } from '@/src/server/auth.js';
import { formRedirect } from '@/src/server/responses.js';

async function handleCallback(request, provider, callbackData) {
  if (!['google', 'github', 'apple'].includes(provider)) return new Response('Not found', { status: 404 });
  const cookieName = oauthCookieName(provider);
  const response = formRedirect(request, '/console');
  response.cookies.set(cookieName, '', { path: '/', httpOnly: true, sameSite: provider === 'apple' ? 'none' : 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0 });
  try {
    const identity = await completeOAuth(provider, new URL(request.url), request.cookies.get(cookieName)?.value, callbackData);
    const user = await findOrCreateOAuthUser(identity);
    const session = await createSession(user.id);
    return setSessionCookie(response, session.token);
  } catch (error) {
    console.error(`OAuth ${provider}: ${error.message}`);
    response.headers.set('Location', new URL('/login?error=oauth', request.url).toString());
    return response;
  }
}

export async function GET(request, { params }) {
  const { provider } = await params;
  if (provider === 'apple') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
  return handleCallback(request, provider);
}

export async function POST(request, { params }) {
  const { provider } = await params;
  if (provider !== 'apple') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  const formData = await request.formData();
  return handleCallback(request, provider, formData);
}
