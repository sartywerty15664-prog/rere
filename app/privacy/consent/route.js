import { CONSENT_VERSION } from '@/src/consent.js';
import { json, readJson } from '@/src/server/responses.js';

export async function POST(request) {
  const expectedOrigin = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  const fetchSite = request.headers.get('sec-fetch-site');
  if (!origin || origin !== expectedOrigin || (fetchSite && fetchSite !== 'same-origin')) {
    return json({ error: 'A same-origin request is required.' }, 403);
  }

  const { body, error } = await readJson(request, 8_192);
  if (error) return error;

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 31_536_000,
  };

  if (body.type === 'personal-data' && body.version === CONSENT_VERSION) {
    const response = json({ ok: true });
    response.cookies.set('ml_personal_data_consent', CONSENT_VERSION, options);
    return response;
  }

  if (body.type === 'cookies' && body.version === CONSENT_VERSION) {
    const value = {
      necessary: true,
      analytics: body.analytics === true,
      marketing: body.marketing === true,
      version: CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    };
    const response = json({ ok: true });
    response.cookies.set('ml_cookie_preferences', encodeURIComponent(JSON.stringify(value)), options);
    return response;
  }

  return json({ error: 'Unsupported consent type or version.' }, 400);
}
