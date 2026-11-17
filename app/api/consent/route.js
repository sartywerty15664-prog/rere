import { getCurrentAuth } from '@/src/server/auth.js';
import { getDatabase } from '@/src/server/database.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { checkSameOrigin } from '@/src/server/request-security.js';
import { CONSENT_POLICY_VERSION } from '@/src/consent.js';

export const runtime = 'nodejs';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DECISIONS = new Set(['accept_all', 'necessary_only', 'customized']);

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store, max-age=0' },
  });
}

export async function POST(request) {
  const originError = checkSameOrigin(request);
  if (originError) return originError;

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2048) return json({ error: 'Request too large.' }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !UUID_PATTERN.test(body.visitorId || '') ||
    body.version !== CONSENT_POLICY_VERSION ||
    typeof body.personalData !== 'boolean' ||
    typeof body.analyticsCookies !== 'boolean' ||
    !DECISIONS.has(body.decision)
  ) {
    return json({ error: 'Invalid consent payload.' }, 400);
  }

  if (
    (body.decision === 'accept_all' && (!body.personalData || !body.analyticsCookies)) ||
    (body.decision === 'necessary_only' && (body.personalData || body.analyticsCookies))
  ) {
    return json({ error: 'Consent decision does not match its choices.' }, 400);
  }

  const rate = consumeRateLimit(request, 'consent-preferences', {
    limit: 20,
    windowMs: 15 * 60_000,
    identifier: body.visitorId,
  });
  if (!rate.allowed) {
    return json({ error: 'Too many consent updates. Try again later.' }, 429);
  }

  if (!process.env.DATABASE_URL) {
    return json({ error: 'Consent storage is not configured.' }, 503);
  }

  try {
    const auth = await getCurrentAuth();
    const userId = auth?.user?.id || null;
    const result = await getDatabase().query(
      `INSERT INTO mindlarp.consent_preferences
        (visitor_id, user_id, personal_data, analytics_cookies, decision, policy_version, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (visitor_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         personal_data = EXCLUDED.personal_data,
         analytics_cookies = EXCLUDED.analytics_cookies,
         decision = EXCLUDED.decision,
         policy_version = EXCLUDED.policy_version,
         recorded_at = now()
       RETURNING recorded_at`,
      [
        body.visitorId,
        userId,
        body.personalData,
        body.analyticsCookies,
        body.decision,
        CONSENT_POLICY_VERSION,
      ],
    );

    return json({ ok: true, recordedAt: result.rows[0].recorded_at });
  } catch {
    return json({ error: 'Unable to store consent preferences.' }, 503);
  }
}
