import { NextResponse } from 'next/server';
import { beginOAuth, oauthCookieName } from '@/src/oauth.js';
import { authContent } from '@/src/views/public.js';
import { htmlResponse } from '@/src/server/html.jsx';

export async function GET(request, { params }) {
  const { provider } = await params;
  if (!['google', 'github'].includes(provider)) return new Response('Not found', { status: 404 });
  const oauth = beginOAuth(provider);
  if (!oauth) return htmlResponse(authContent({ mode: 'login', error: `${provider === 'google' ? 'Google' : 'GitHub'} sign-in is not configured on this server.` }), 'Sign in', 503, { bodyClass: 'auth-page', path: '/console' });
  const response = NextResponse.redirect(oauth.authorizationUrl, 302);
  response.cookies.set(oauthCookieName(provider), oauth.payload, { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600 });
  return response;
}
