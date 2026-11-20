import assert from 'node:assert/strict';
import test from 'node:test';
import { consumeRateLimit } from '../src/server/rate-limit.js';

test('Vercel rate limits are isolated by client IP', () => {
  const previousVercel = process.env.VERCEL;
  process.env.VERCEL = '1';

  try {
    const bucket = `vercel-ip-isolation-${Date.now()}`;
    const firstClient = new Request('https://mindlarp.com', {
      headers: { 'x-real-ip': '203.0.113.10' },
    });
    const secondClient = new Request('https://mindlarp.com', {
      headers: { 'x-real-ip': '203.0.113.11' },
    });
    const options = { limit: 1, windowMs: 60_000 };

    assert.equal(consumeRateLimit(firstClient, bucket, options).allowed, true);
    assert.equal(consumeRateLimit(secondClient, bucket, options).allowed, true);
    assert.equal(consumeRateLimit(firstClient, bucket, options).allowed, false);
  } finally {
    if (previousVercel === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = previousVercel;
  }
});
