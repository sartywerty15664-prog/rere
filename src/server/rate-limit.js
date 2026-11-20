const stores = globalThis.__mindLarpRateLimitStores ||= new Map();

function clientKey(request) {
  if (process.env.TRUST_PROXY !== 'true') return 'direct';
  return request.headers.get('x-real-ip')?.trim()
    || request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || 'unknown';
}

function keyFor(request, bucket, identifier) {
  return `${bucket}:${identifier || clientKey(request)}`;
}

export function consumeRateLimit(request, bucket, { limit, windowMs, identifier } = {}) {
  const now = Date.now();
  let store = stores.get(bucket);
  if (!store) {
    store = new Map();
    stores.set(bucket, store);
  }
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  if (store.size >= 10000) store.delete(store.keys().next().value);
  const key = keyFor(request, bucket, identifier);
  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }
  entry.count += 1;
  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    remaining: Math.max(0, limit - entry.count),
  };
}

export function clearRateLimit(request, bucket, identifier) {
  stores.get(bucket)?.delete(keyFor(request, bucket, identifier));
}
