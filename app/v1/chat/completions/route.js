import { models } from '@/src/content.js';
import { apiKeyAuth } from '@/src/server/api.js';
import { consumeRateLimit } from '@/src/server/rate-limit.js';
import { apiError, readBody, readJson, rateLimitError } from '@/src/server/responses.js';
import { reserveInferenceAccess, recordUsage } from '@/src/server/usage.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const auth = await apiKeyAuth(request, 'inference:write');
  if (auth.error) return apiError(...auth.error);
  const rate = consumeRateLimit(request, 'inference', { limit: 120, windowMs: 60_000, identifier: auth.key.userId });
  if (!rate.allowed) return rateLimitError(rate);
  const { body, error } = await readJson(request);
  if (error) return error;
  const model = models.find((item) => item.id === body.model);
  if (!model) return apiError(404, 'Unknown model. Choose a model from /v1/models.', 'invalid_request_error', 'model_not_found');
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 100 || body.messages.some((message) => !message || !['system', 'user', 'assistant', 'tool'].includes(message.role) || typeof message.content !== 'string' || message.content.length > 100_000)) return apiError(400, 'messages must contain 1–100 role and string content objects, each up to 100,000 characters.', 'invalid_request_error', 'invalid_messages');
  if (body.temperature !== undefined && (typeof body.temperature !== 'number' || !Number.isFinite(body.temperature) || body.temperature < 0 || body.temperature > 2)) return apiError(400, 'temperature must be a number between 0 and 2.');
  if (body.max_tokens !== undefined && (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > 32768)) return apiError(400, 'max_tokens must be an integer between 1 and 32768.');
  if (body.stream !== undefined && typeof body.stream !== 'boolean') return apiError(400, 'stream must be a boolean.');
  if (body.tools !== undefined && (!Array.isArray(body.tools) || body.tools.length > 128 || body.tools.some((tool) => !tool || typeof tool !== 'object'))) return apiError(400, 'tools must be an array of at most 128 tool definitions.');
  if (body.tool_choice !== undefined && !(typeof body.tool_choice === 'string' || (body.tool_choice && typeof body.tool_choice === 'object' && !Array.isArray(body.tool_choice)))) return apiError(400, 'tool_choice must be a string or object.');
  if (body.response_format !== undefined && (!body.response_format || typeof body.response_format !== 'object' || Array.isArray(body.response_format))) return apiError(400, 'response_format must be an object.');
  if (!process.env.MINDLARP_UPSTREAM_URL) {
    await recordUsage({ key: auth.key, endpoint: '/v1/chat/completions', model: model.id, status: 503 });
    return apiError(503, 'Model inference is not configured. Set MINDLARP_UPSTREAM_URL on the server.', 'service_unavailable', 'inference_not_configured');
  }
  const reservation = await reserveInferenceAccess(auth.key.userId, '/v1/chat/completions');
  if (reservation.error) return apiError(...reservation.error);
  const reservationId = reservation.reservationId;
  const upstreamBody = { model: model.id, messages: body.messages, max_tokens: 4096 };
  for (const field of ['temperature', 'max_tokens', 'stream', 'tools', 'tool_choice', 'response_format']) {
    if (body[field] !== undefined) upstreamBody[field] = body[field];
  }
  try {
    const controller = new AbortController();
    const connectionTimeout = setTimeout(() => controller.abort(), 60_000);
    let response;
    try {
      response = await fetch(`${process.env.MINDLARP_UPSTREAM_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(process.env.MINDLARP_UPSTREAM_KEY ? { Authorization: `Bearer ${process.env.MINDLARP_UPSTREAM_KEY}` } : {}) },
        body: JSON.stringify(upstreamBody), signal: controller.signal,
      });
    } finally {
      // Once headers arrive, do not abort the response body: SSE streams may
      // legitimately run longer than the connection-establishment timeout.
      clearTimeout(connectionTimeout);
    }
    if (body.stream && response.ok && response.body) {
      await recordUsage({ key: auth.key, endpoint: '/v1/chat/completions', model: model.id, status: response.status, reservationId });
      return new Response(response.body, { status: response.status, headers: { 'Content-Type': response.headers.get('content-type') || 'text/event-stream', 'Cache-Control': 'no-store' } });
    }
    const { text, error: responseError } = await readBody(response, 1_048_576);
    if (responseError) {
      await recordUsage({ key: auth.key, endpoint: '/v1/chat/completions', model: model.id, status: 502, reservationId });
      return apiError(502, 'The inference service returned an oversized response.', 'upstream_error', 'upstream_response_too_large');
    }
    let completion;
    try { completion = JSON.parse(text); } catch {}
    await recordUsage({ key: auth.key, endpoint: '/v1/chat/completions', model: model.id, status: response.status, usage: completion?.usage, reservationId });
    if (!response.ok) return apiError(502, 'The inference service rejected the request.', 'upstream_error', 'upstream_request_failed');
    if (!completion || Array.isArray(completion) || typeof completion !== 'object') return apiError(502, 'The inference service returned an invalid response.', 'upstream_error', 'invalid_upstream_response');
    return new Response(text, { status: response.status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch {
    await recordUsage({ key: auth.key, endpoint: '/v1/chat/completions', model: model.id, status: 502 });
    return apiError(502, 'The configured inference service could not be reached.', 'upstream_error', 'upstream_unavailable');
  }
}
