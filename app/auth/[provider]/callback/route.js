import { completeOAuth, oauthCookieName } from '@/src/oauth.js';
import { createSession, findOrCreateOAuthUser, setSessionCookie } from '@/src/server/auth.js';
import { formRedirect } from '@/src/server/responses.js';

export async function GET(request, { params }) {
  const { provider } = await params;
  if (!['google', 'github'].includes(provider)) return new Response('Not found', { status: 404 });
  const response = formRedirect(request, '/console');
  response.cookies.set(oauthCookieName(provider), '', { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 0 });
  try {
    const identity = await completeOAuth(provider, new URL(request.url), request.cookies.get(oauthCookieName(provider))?.value);
    const user = await findOrCreateOAuthUser(identity);
    const session = await createSession(user.id);
    return setSessionCookie(response, session.token);
  } catch (error) {
    console.error(`OAuth ${provider}: ${error.message}`);
    response.headers.set('Location', new URL('/login?error=oauth', request.url).toString());
    return response;
  }
}
