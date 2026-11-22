import { isIP } from 'node:net';

const stores = globalThis.__mindLarpRateLimitStores ||= new Map();
const MAX_IP_BUCKETS = 10_000;
const MAX_ACCOUNT_BUCKETS = 50_000;

function clientKey(request) {
  // Only accept a client address when the request is known to have arrived
  // through a platform/reverse proxy that overwrites X-Real-IP.
  const trusted = process.env.VERCEL === '1'
    || Boolean(process.env.VERCEL_ENV)
    || process.env.TRUST_PROXY === 'true';
  if (!trusted) return 'unknown';

  const candidate = request.headers.get('x-real-ip')?.trim();
  if (!candidate || candidate.includes(',') || isIP(candidate) === 0) return 'unknown';
  return candidate.toLowerCase();
}

function storeFor(bucket, kind) {
  const name = `${kind}:${bucket}`;
  let store = stores.get(name);
  if (!store) {
    store = new Map();
    stores.set(name, store);
  }
  return store;
}

function boundedSet(store, key, value, maxSize) {
  // LRU eviction is confined to this namespace. Untrusted IP churn can never
  // evict authenticated per-account counters.
  if (!store.has(key) && store.size >= maxSize) {
    const oldest = store.keys().next().value;
    if (oldest !== undefined) store.delete(oldest);
  }
  store.delete(key);
  store.set(key, value);
}

function consume(store, key, limit, windowMs, now, maxSize) {
  let entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + windowMs };
  }
  entry.count += 1;
  boundedSet(store, key, entry, maxSize);
  return {
    allowed: entry.count <= limit,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    remaining: Math.max(0, limit - entry.count),
  };
}

export function consumeRateLimit(request, bucket, { limit, windowMs, identifier } = {}) {
  if (!Number.isInteger(limit) || limit < 1 || !Number.isFinite(windowMs) || windowMs < 1) {
    throw new TypeError('Rate limit requires a positive integer limit and windowMs');
  }

  const now = Date.now();
  const isAccount = typeof identifier === 'string' && identifier.length > 0;
  const kind = isAccount ? 'account' : 'ip';
  const store = storeFor(bucket, kind);
  const key = isAccount ? identifier : clientKey(request);
  return consume(store, key, limit, windowMs, now, isAccount ? MAX_ACCOUNT_BUCKETS : MAX_IP_BUCKETS);
}

export function clearRateLimit(request, bucket, identifier) {
  const kind = typeof identifier === 'string' && identifier.length > 0 ? 'account' : 'ip';
  const store = stores.get(`${kind}:${bucket}`);
  const key = kind === 'account' ? identifier : clientKey(request);
  store?.delete(key);
}
