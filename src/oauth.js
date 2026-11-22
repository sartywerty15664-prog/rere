import { createHash } from 'node:crypto';
import { randomToken } from './security.js';
import { publicUrl } from './server/config.js';

const providers = {
  google: {
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    authorize: 'https://accounts.google.com/o/oauth2/v2/auth',
    token: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
  },
  github: {
    clientId: 'GITHUB_CLIENT_ID',
    clientSecret: 'GITHUB_CLIENT_SECRET',
    authorize: 'https://github.com/login/oauth/authorize',
    token: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
  },
  discord: {
    clientId: 'DISCORD_CLIENT_ID',
    clientSecret: 'DISCORD_CLIENT_SECRET',
    authorize: 'https://discord.com/oauth2/authorize',
    token: 'https://discord.com/api/oauth2/token',
    scope: 'identify email',
  },
};

function getProvider(provider) {
  const config = providers[provider];
  if (!config) throw new Error('Unsupported sign-in provider.');
  return config;
}

export function oauthCookieName(provider) {
  return `ml_oauth_${provider}`;
}

export function beginOAuth(provider) {
  const config = getProvider(provider);
  const clientId = process.env[config.clientId];
  const clientSecret = process.env[config.clientSecret];
  if (!clientId || !clientSecret) return null;

  const state = randomToken(24);
  const verifier = randomToken(32);
  const redirectUri = `${publicUrl()}/auth/${provider}/callback`;
  const payload = Buffer.from(JSON.stringify({ state, verifier })).toString('base64url');
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: config.scope,
    state,
  });

  if (provider === 'google') {
    params.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
    params.set('code_challenge_method', 'S256');
  }

  return { authorizationUrl: `${config.authorize}?${params}`, payload };
}

export async function completeOAuth(provider, url, encoded) {
  const config = getProvider(provider);
  if (!encoded) throw new Error('The sign-in attempt expired. Please try again.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!url.searchParams.get('code') || url.searchParams.get('state') !== payload.state) {
    throw new Error('OAuth state validation failed. Please try again.');
  }

  const clientId = process.env[config.clientId];
  const clientSecret = process.env[config.clientSecret];
  if (!clientId || !clientSecret) throw new Error('This sign-in provider is not configured.');

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: url.searchParams.get('code'),
    redirect_uri: `${publicUrl()}/auth/${provider}/callback`,
    grant_type: 'authorization_code',
  });
  if (provider === 'google') tokenParams.set('code_verifier', payload.verifier);

  const tokenResponse = await fetch(config.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: tokenParams,
    signal: AbortSignal.timeout(15000),
  });
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

  if (provider === 'discord') {
    const response = await fetch('https://discord.com/api/users/@me', { headers, signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Could not read the Discord profile.');
    const profile = await response.json();
    if (!profile.verified || !profile.email) throw new Error('A verified Discord email is required.');
    return {
      provider,
      providerId: String(profile.id),
      email: profile.email.toLowerCase(),
      displayName: profile.global_name || profile.username || profile.email.split('@')[0],
    };
  }

  const [userResponse, emailResponse] = await Promise.all([
    fetch('https://api.github.com/user', { headers, signal: AbortSignal.timeout(15000) }),
    fetch('https://api.github.com/user/emails', { headers, signal: AbortSignal.timeout(15000) }),
  ]);
  if (!userResponse.ok || !emailResponse.ok) throw new Error('Could not read the GitHub profile.');
  const profile = await userResponse.json();
  const emails = await emailResponse.json();
  const email = emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified);
  if (!email) throw new Error('A verified GitHub email is required.');
  return { provider, providerId: String(profile.id), email: email.email.toLowerCase(), displayName: profile.name || profile.login };
}
