import { NextResponse } from 'next/server';
import { beginOAuth, oauthCookieName } from '@/src/oauth.js';
import { checkSameOrigin } from '@/src/server/request-security.js';
import { formRedirect, readForm } from '@/src/server/responses.js';

export async function POST(request) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;
  const { body, error } = await readForm(request);
  if (error) return error;

  const provider = String(body.get('provider') || '');
  if (!['google', 'github'].includes(provider)) return formRedirect(request, '/login?error=oauth');
  const oauth = beginOAuth(provider, process.env.PUBLIC_URL || new URL(request.url).origin, {
    personalDataConsent: body.get('personalDataConsent') === 'on'
  });
  if (!oauth) return formRedirect(request, '/login?error=oauth-config');

  const response = NextResponse.redirect(oauth.authorizationUrl, 303);
  response.cookies.set(oauthCookieName(provider), oauth.payload, {
    path: '/', httpOnly: true, sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production', maxAge: 600
  });
  return response;
}
