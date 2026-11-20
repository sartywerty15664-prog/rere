import { createHash } from 'node:crypto';
import { randomToken } from './security.js';

export function oauthCookieName(provider) {
  return `ml_oauth_${provider}`;
}

export function beginOAuth(provider) {
  const clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;
  const clientSecret = provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const state = randomToken(24);
  const verifier = randomToken(32);
  const redirectUri = `${process.env.PUBLIC_URL || 'http://localhost:5173'}/auth/${provider}/callback`;
  const payload = Buffer.from(JSON.stringify({ state, verifier })).toString('base64url');
  let authorizationUrl;
  if (provider === 'google') {
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256' })}`;
  } else {
    authorizationUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'read:user user:email', state })}`;
  }
  return { authorizationUrl, payload };
}

export async function completeOAuth(provider, url, encoded) {
  if (!encoded) throw new Error('The sign-in attempt expired. Please try again.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!url.searchParams.get('code') || url.searchParams.get('state') !== payload.state) throw new Error('OAuth state validation failed. Please try again.');
  const clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;
  const clientSecret = provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('This sign-in provider is not configured.');
  const tokenParams = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: url.searchParams.get('code'), redirect_uri: `${process.env.PUBLIC_URL || 'http://localhost:5173'}/auth/${provider}/callback` });
  if (provider === 'google') {
    tokenParams.set('grant_type', 'authorization_code');
    tokenParams.set('code_verifier', payload.verifier);
  }
  const tokenResponse = await fetch(provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: tokenParams, signal: AbortSignal.timeout(15000) });
  if (!tokenResponse.ok) throw new Error('The provider did not accept the sign-in code.');
  const tokens = await tokenResponse.json();
  if (!tokens.access_token) throw new Error('The provider returned no access token.');
  const headers = { Authorization: `Bearer ${tokens.access_token}`, Accept: 'application/json', 'User-Agent': 'MindLarp' };
  if (provider === 'google') {
    const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Could not read the Google profile.');
    const profile = await response.json();
    if (!profile.email_verified || !profile.email) throw new Error('A verified Google email is required.');
    return { provider, providerId: String(profile.sub), email: profile.email.toLowerCase(), displayName: profile.name || profile.email.split('@')[0] };
  }
  const [userResponse, emailResponse] = await Promise.all([fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(15000) }), fetch('https://api.github.com/user/emails', { headers, signal: AbortSignal.timeout(15000) })]);
  if (!userResponse.ok || !emailResponse.ok) throw new Error('Could not read the GitHub profile.');
  const profile = await userResponse.json();
  const emails = await emailResponse.json();
  const email = emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified);
  if (!email) throw new Error('A verified GitHub email is required.');
  return { provider, providerId: String(profile.id), email: email.email.toLowerCase(), displayName: profile.name || profile.login };
}
