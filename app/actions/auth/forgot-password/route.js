import { checkSameOrigin } from '@/src/server/request-security.js';
import { randomUUID } from 'node:crypto';
import { createMailer } from '@/src/mailer.js';
import { hashToken, normalizeEmail, randomToken, validEmail } from '@/src/server/auth.js';
import { publicUrl, smtpConfig } from '@/src/server/config.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { formRedirect, readForm } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export async function POST(request) {
  const originError = checkSameOrigin(request);
if (originError) return originError;
  const rate = consumeRateLimit(request, 'recovery', { limit: 5, windowMs: 15 * 60_000 });
  if (!rate.allowed) return formRedirect(request, '/forgot-password?error=limit');
  const { body, error } = await readForm(request);
  if (error) return error;
  const smtp = smtpConfig();
  if (!smtp.host) return formRedirect(request, '/forgot-password?error=smtp');
  const email = normalizeEmail(body.get('email'));
  if (!validEmail(email)) return formRedirect(request, '/forgot-password?error=email');
  const store = await getStore();
  const user = store.data.users.find((item) => item.email === email);
  if (user) {
    const token = randomToken();
    await store.update((data) => {
      data.passwordResets = data.passwordResets.filter((item) => item.userId !== user.id && Date.parse(item.expiresAt) > Date.now());
      data.passwordResets.push({ id: randomUUID(), userId: user.id, tokenHash: hashToken(token), createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 30 * 60000).toISOString() });
    });
    try {
      await createMailer(smtp).sendPasswordReset({ email, url: `${publicUrl(new URL(request.url).origin)}/reset-password?token=${encodeURIComponent(token)}` });
    } catch (error) {
      console.error(`Password recovery email: ${error.message}`);
    }
  }
  return formRedirect(request, '/forgot-password?sent=1');
}
