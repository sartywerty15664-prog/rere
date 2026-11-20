import { createHash, createPrivateKey, createSign, createVerify } from 'node:crypto';
import { randomToken } from './security.js';

export function oauthCookieName(provider) {
  return `ml_oauth_${provider}`;
}

function appleConfig() {
  return {
    clientId: process.env.APPLE_CLIENT_ID,
    teamId: process.env.APPLE_TEAM_ID,
    keyId: process.env.APPLE_KEY_ID,
    privateKey: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };
}

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function appleClientSecret(config) {
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJwtPart({ alg: 'ES256', kid: config.keyId });
  const claims = encodeJwtPart({
    iss: config.teamId,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: config.clientId,
  });
  const signing = createSign('SHA256');
  signing.update(`${header}.${claims}`);
  signing.end();
  const signature = signing.sign({ key: createPrivateKey(config.privateKey), dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `${header}.${claims}.${signature}`;
}

export function beginOAuth(provider) {
  const apple = provider === 'apple';
  const config = apple ? appleConfig() : null;
  const clientId = apple ? config.clientId : provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;
  const clientSecret = apple ? config?.teamId && config?.keyId && config?.privateKey : provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const state = randomToken(24);
  const verifier = randomToken(32);
  const baseUrl = process.env.PUBLIC_URL?.trim();
  if (!baseUrl && process.env.NODE_ENV === 'production') throw new Error('PUBLIC_URL must be configured for production OAuth.');
  const redirectUri = `${baseUrl || 'http://localhost:5173'}/auth/${provider}/callback`;
  const payload = Buffer.from(JSON.stringify({ state, verifier })).toString('base64url');
  let authorizationUrl;
  if (provider === 'google') {
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope: 'openid email profile', state, code_challenge: challenge, code_challenge_method: 'S256' })}`;
  } else if (provider === 'github') {
    authorizationUrl = `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, scope: 'read:user user:email', state })}`;
  } else if (apple) {
    authorizationUrl = `https://appleid.apple.com/auth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code id_token', response_mode: 'form_post', scope: 'name email', state, nonce: verifier })}`;
  } else {
    return null;
  }
  return { authorizationUrl, payload };
}

async function verifyAppleIdentityToken(token, expectedNonce, clientId) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Apple returned an invalid identity token.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'ES256' || !header.kid) throw new Error('Apple identity token uses an unsupported signature.');
  const keyResponse = await fetch('https://appleid.apple.com/auth/keys', { signal: AbortSignal.timeout(10000) });
  if (!keyResponse.ok) throw new Error('Could not verify the Apple identity token.');
  const keySet = await keyResponse.json();
  const jwk = keySet.keys?.find((key) => key.kid === header.kid && key.kty === 'EC' && key.crv === 'P-256');
  if (!jwk) throw new Error('Apple signing key was not found.');
  const verifier = createVerify('SHA256');
  verifier.update(`${parts[0]}.${parts[1]}`);
  verifier.end();
  const validSignature = verifier.verify({ key: { ...jwk, alg: 'ES256' }, format: 'jwk', dsaEncoding: 'ieee-p1363' }, Buffer.from(parts[2], 'base64url'));
  const audienceValid = Array.isArray(claims.aud) ? claims.aud.includes(clientId) : claims.aud === clientId;
  if (!validSignature || claims.iss !== 'https://appleid.apple.com' || !audienceValid || !claims.sub || Number(claims.exp) <= Date.now() / 1000 || claims.nonce !== expectedNonce) {
    throw new Error('Apple identity token validation failed.');
  }
  return claims;
}

export async function completeOAuth(provider, url, encoded, callbackData = null) {
  if (!encoded) throw new Error('The sign-in attempt expired. Please try again.');
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const apple = provider === 'apple';
  const params = callbackData || url.searchParams;
  if (params.get('state') !== payload.state) throw new Error('OAuth state validation failed. Please try again.');
  if (apple && params.get('error')) throw new Error('Apple sign-in was cancelled or rejected.');
  if (!params.get('code')) throw new Error('The provider returned no sign-in code.');

  const baseUrl = process.env.PUBLIC_URL?.trim();
  if (!baseUrl && process.env.NODE_ENV === 'production') throw new Error('PUBLIC_URL must be configured for production OAuth.');
  const redirectUri = `${baseUrl || 'http://localhost:5173'}/auth/${provider}/callback`;
  let clientId;
  let clientSecret;
  if (apple) {
    const config = appleConfig();
    clientId = config.clientId;
    if (!config.clientId || !config.teamId || !config.keyId || !config.privateKey) throw new Error('Apple sign-in is not configured.');
    clientSecret = appleClientSecret(config);
  } else {
    clientId = provider === 'google' ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID;
    clientSecret = provider === 'google' ? process.env.GOOGLE_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET;
  }
  if (!clientId || !clientSecret) throw new Error('This sign-in provider is not configured.');

  const tokenParams = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, code: params.get('code'), redirect_uri: redirectUri, grant_type: 'authorization_code' });
  if (provider === 'google') tokenParams.set('code_verifier', payload.verifier);
  const tokenEndpoint = apple ? 'https://appleid.apple.com/auth/token' : provider === 'google' ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token';
  const tokenResponse = await fetch(tokenEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: tokenParams, signal: AbortSignal.timeout(15000) });
  if (!tokenResponse.ok) throw new Error('The provider did not accept the sign-in code.');
  const tokens = await tokenResponse.json();
  if (apple) {
    const claims = await verifyAppleIdentityToken(tokens.id_token || params.get('id_token'), payload.verifier, clientId);
    let userInfo = {};
    try { userInfo = JSON.parse(params.get('user') || '{}'); } catch {}
    const email = typeof claims.email === 'string' ? claims.email.toLowerCase() : `apple-${createHash('sha256').update(claims.sub).digest('hex').slice(0, 24)}@private.mindlarp.invalid`;
    const name = [userInfo.name?.firstName, userInfo.name?.lastName].filter(Boolean).join(' ').trim();
    return { provider, providerId: String(claims.sub), email, displayName: name || email.split('@')[0] };
  }
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
