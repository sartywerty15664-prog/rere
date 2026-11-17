const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url);

  if (url.hostname === 'oauth2.googleapis.com') {
    const code = new URLSearchParams(init.body).get('code') || 'oauth';
    return Response.json({ access_token: `mock-token-${code}`, token_type: 'Bearer' });
  }

  if (url.hostname === 'openidconnect.googleapis.com') {
    const token = String(init.headers?.Authorization || '').replace('Bearer mock-token-', '') || 'oauth';
    return Response.json({
      sub: `google-${token}`,
      email: `${token}@example.com`,
      email_verified: true,
      name: `${token} OAuth User`,
    });
  }

  return originalFetch(input, init);
};
