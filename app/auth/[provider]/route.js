import { NextResponse } from 'next/server';
import { beginOAuth, oauthCookieName } from '@/src/oauth.js';
import { authContent } from '@/src/views/public.js';
import { htmlResponse } from '@/src/server/html.jsx';
import { hasPersonalDataConsent } from '@/src/server/consent.js';

export async function GET(request, { params }) {
  const { provider } = await params;
  if (!['google', 'github', 'discord'].includes(provider)) return new Response('Not found', { status: 404 });
  if (!hasPersonalDataConsent(request.cookies.get('ml_personal_data_consent')?.value)) return NextResponse.redirect(new URL('/login?error=consent', request.url), 303);
  const oauth = beginOAuth(provider);
  if (!oauth) return htmlResponse(authContent({ mode: 'login', error: `${provider === 'google' ? 'Google' : provider === 'github' ? 'GitHub' : 'Discord'} sign-in is not configured on this server.` }), 'Sign in', 503, { bodyClass: 'auth-page', path: '/console' });
  const response = NextResponse.redirect(oauth.authorizationUrl, 302);
  response.cookies.set(oauthCookieName(provider), oauth.payload, { path: '/', httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 600 });
  return response;
}
