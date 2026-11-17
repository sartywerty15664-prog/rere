import { NextResponse } from 'next/server';

export function json(data, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function apiError(status, message, type = 'invalid_request_error', code = null) {
  return json({ error: { message, type, code } }, status);
}

export function formRedirect(request, location) {
  return new NextResponse(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

async function readText(request, limit) {
  const length = Number(request.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit) {
    const error = new Error('Request body is too large.');
    error.status = 413;
    throw error;
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      const error = new Error('Request body is too large.');
      error.status = 413;
      throw error;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readBody(request, limit = 1_048_576) {
  try {
    return { text: await readText(request, limit) };
  } catch {
    return { error: apiError(413, 'Request body is too large.', 'invalid_request_error', 'body_too_large') };
  }
}

export async function readForm(request, limit = 65_536) {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/x-www-form-urlencoded') {
    return { error: apiError(415, 'Forms must be URL encoded.', 'invalid_request_error', 'unsupported_media_type') };
  }
  const { text, error } = await readBody(request, limit);
  if (error) return { error };
  return { body: new URLSearchParams(text) };
}

export async function readJson(request, limit = 1_048_576) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim();
  if (contentType !== 'application/json' && !contentType?.endsWith('+json')) {
    return { error: apiError(415, 'Content-Type must be application/json.', 'invalid_request_error', 'unsupported_media_type') };
  }
  const { text: raw, error } = await readBody(request, limit);
  if (error) return { error };
  if (!raw) return { body: {} };
  try {
    const body = JSON.parse(raw);
    if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
    return { body };
  } catch {
    return { error: apiError(400, 'Request body must be a valid JSON object.') };
  }
}

export function rateLimitError(result) {
  const response = apiError(429, 'Too many requests. Try again later.', 'rate_limit_error', 'rate_limit_exceeded');
  response.headers.set('Retry-After', String(result.retryAfter));
  return response;
}

export function routeError(error, prefix = '/v1/') {
  console.error(error);
  return apiError(error.status || 500, error.status ? error.message : 'An internal server error occurred.', 'server_error');
}
