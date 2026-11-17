import { randomUUID } from 'node:crypto';
import { models } from '@/src/content.js';
import { getCurrentAuth, requireCsrf } from '@/src/server/auth.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { apiError, readBody, readJson, json, rateLimitError } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';
import { getInferenceAccessError, recordUsage } from '@/src/server/usage.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const auth = await getCurrentAuth();
  if (!auth) return apiError(401, 'Sign in to continue.', 'authentication_error');
  const rate = consumeRateLimit(request, 'chat', { limit: 30, windowMs: 60_000, identifier: auth.user.id });
  if (!rate.allowed) return rateLimitError(rate);
  const { body, error } = await readJson(request, 65_536);
  if (error) return error;
  if (!requireCsrf(body, auth)) return apiError(403, 'The session token is invalid. Refresh and try again.', 'csrf_error');
  const { user } = auth;
  const store = await getStore();
  const conversation = store.data.conversations.find((item) => item.userId === user.id);
  const model = models.find((item) => item.id === body.model);
  const content = typeof body.message === 'string' ? body.message.trim() : '';
  if (!model || !content || content.length > 16000) return apiError(400, 'Choose a model and enter a message of up to 16,000 characters.');
  if (!process.env.MINDLARP_UPSTREAM_URL) return apiError(503, 'Model inference is not configured yet. Ask the administrator to set MINDLARP_UPSTREAM_URL.', 'service_unavailable', 'inference_not_configured');
  const accessError = await getInferenceAccessError(user.id);
  if (accessError) return apiError(...accessError);
  try {
    const response = await fetch(`${process.env.MINDLARP_UPSTREAM_URL.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.MINDLARP_UPSTREAM_KEY ? { Authorization: `Bearer ${process.env.MINDLARP_UPSTREAM_KEY}` } : {}) }, body: JSON.stringify({ model: model.id, messages: [...(conversation?.messages || []).map(({ role, content: text }) => ({ role, content: text })), { role: 'user', content }], max_tokens: 4096 }), signal: AbortSignal.timeout(60000) });
    const { text, error: responseError } = await readBody(response, 1_048_576);
    if (responseError) {
      await recordUsage({ userId: user.id, endpoint: '/chat', model: model.id, status: 502 });
      return apiError(502, 'The model service returned an oversized response.', 'upstream_error', 'upstream_response_too_large');
    }
    let completion;
    try { completion = JSON.parse(text); } catch {}
    await recordUsage({ userId: user.id, endpoint: '/chat', model: model.id, status: response.status, usage: completion?.usage });
    const answer = completion?.choices?.[0]?.message?.content;
    if (!response.ok) return apiError(502, 'The model service rejected the request.', 'upstream_error', 'upstream_request_failed');
    if (typeof answer !== 'string' || answer.length > 100_000) return apiError(502, 'The model service returned an invalid response.', 'upstream_error', 'invalid_upstream_response');
    const timestamp = new Date().toISOString();
    await store.update((data) => {
      let stored = data.conversations.find((item) => item.userId === user.id);
      if (!stored) { stored = { id: randomUUID(), userId: user.id, messages: [] }; data.conversations.push(stored); }
      stored.messages.push({ role: 'user', content, createdAt: timestamp }, { role: 'assistant', content: answer, createdAt: timestamp });
      if (stored.messages.length > 100) stored.messages = stored.messages.slice(-100);
    });
    return json({ message: answer, model: model.id });
  } catch {
    await recordUsage({ userId: user.id, endpoint: '/chat', model: model.id, status: 502 });
    return apiError(502, 'The model service could not be reached.', 'upstream_error');
  }
}
