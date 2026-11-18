import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductionConfig } from '../src/server/production.js';

const validBase = {
  PUBLIC_URL: 'https://mindlarp.example',
  DATABASE_URL: 'postgresql://app:secret@db.example.com:5432/mindlarp',
};

function validationErrors(overrides = {}) {
  try {
    validateProductionConfig({ ...validBase, ...overrides });
    return [];
  } catch (error) {
    return error.message.replace('Production configuration is invalid:\n', '').split('\n- ');
  }
}

test('production validator accepts a minimal secure configuration', () => {
  assert.deepEqual(validationErrors(), []);
});

test('PUBLIC_URL must be an HTTPS origin without credentials, path, query, or fragment', () => {
  for (const value of ['https://user:pass@mindlarp.example', 'https://mindlarp.example/base', 'https://mindlarp.example/?x=1', 'https://mindlarp.example/#home', 'not-a-url']) {
    assert.match(validationErrors({ PUBLIC_URL: value }).join('\n'), /PUBLIC_URL must be an absolute HTTP\(S\) origin/, value);
  }
  assert.match(validationErrors({ PUBLIC_URL: 'http://mindlarp.example' }).join('\n'), /PUBLIC_URL must use HTTPS/);
  assert.deepEqual(validationErrors({ PUBLIC_URL: 'http://127.0.0.1:3000' }), []);
  assert.deepEqual(validationErrors({ PUBLIC_URL: 'http://mindlarp.example', ALLOW_HTTP_PUBLIC_URL: 'true' }), []);
});

test('production validator rejects default PostgreSQL credentials and disabled TLS verification', () => {
  assert.match(validationErrors({ DATABASE_URL: 'postgresql://postgres:postgres@db.example.com/postgres' }).join('\n'), /default PostgreSQL credentials/);
  assert.match(validationErrors({ DATABASE_SSL_REJECT_UNAUTHORIZED: 'false' }).join('\n'), /not allowed in production/);
});

test('production inference requires HTTPS, a bounded daily quota, and an entitlement decision', () => {
  assert.match(validationErrors({ MINDLARP_UPSTREAM_URL: 'http://inference.example/v1' }).join('\n'), /MINDLARP_UPSTREAM_URL must use HTTPS/);
  assert.match(validationErrors({ MINDLARP_UPSTREAM_URL: 'https://inference.example/v1' }).join('\n'), /INFERENCE_DAILY_REQUEST_LIMIT/);
  assert.match(validationErrors({ MINDLARP_UPSTREAM_URL: 'https://inference.example/v1', INFERENCE_DAILY_REQUEST_LIMIT: '100' }).join('\n'), /Configure Stripe entitlements/);
  assert.deepEqual(validationErrors({
    MINDLARP_UPSTREAM_URL: 'https://inference.example/v1',
    INFERENCE_DAILY_REQUEST_LIMIT: '100',
    ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true',
  }), []);
  assert.deepEqual(validationErrors({
    MINDLARP_UPSTREAM_URL: 'https://inference.example/v1',
    INFERENCE_DAILY_REQUEST_LIMIT: '100',
    STRIPE_SECRET_KEY: 'sk_live_test',
    STRIPE_PRICE_ID: 'price_test',
    STRIPE_WEBHOOK_SECRET: 'whsec_test',
  }), []);
  assert.deepEqual(validationErrors({
    MINDLARP_UPSTREAM_URL: 'http://127.0.0.1:8000/v1',
    INFERENCE_DAILY_REQUEST_LIMIT: '100',
    ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true',
  }), []);
});

test('plaintext SMTP is allowed only for a local test relay', () => {
  assert.match(validationErrors({ SMTP_HOST: 'smtp.example.com', SMTP_REQUIRE_TLS: 'false' }).join('\n'), /only for a local test relay/);
  assert.deepEqual(validationErrors({ SMTP_HOST: 'smtp.example.com', SMTP_REQUIRE_TLS: 'true' }), []);
  assert.deepEqual(validationErrors({ SMTP_HOST: '127.0.0.1', SMTP_PORT: '2525', SMTP_REQUIRE_TLS: 'false' }), []);
});

test('database pool and timeout settings are bounded', () => {
  for (const key of ['DATABASE_QUERY_TIMEOUT', 'DATABASE_STATEMENT_TIMEOUT', 'DATABASE_LOCK_TIMEOUT']) {
    assert.match(validationErrors({ [key]: '99' }).join('\n'), new RegExp(key));
    assert.deepEqual(validationErrors({ [key]: '15000' }), []);
  }
  assert.match(validationErrors({ DATABASE_POOL_SIZE: '0' }).join('\n'), /DATABASE_POOL_SIZE/);
});

test('Open WebUI URLs follow the public HTTPS and private upstream rules', () => {
  assert.match(validationErrors({ OPENWEBUI_URL: 'http://chat.example.com' }).join('\n'), /OPENWEBUI_URL must use HTTPS/);
  assert.match(validationErrors({ OPENWEBUI_URL: 'https://chat.example.com/base' }).join('\n'), /OPENWEBUI_URL must be an absolute HTTP\(S\) origin/);
  assert.deepEqual(validationErrors({ OPENWEBUI_URL: 'https://chat.example.com' }), []);
  assert.deepEqual(validationErrors({ OPENWEBUI_URL: 'http://localhost:3001' }), []);
  assert.deepEqual(validationErrors({ OPENWEBUI_URL: 'http://chat.example.com', ALLOW_HTTP_PUBLIC_URL: 'true' }), []);
  assert.match(validationErrors({ OPENWEBUI_API_BASE_URL: 'http://mindlarp.example/v1' }).join('\n'), /OPENWEBUI_API_BASE_URL must use HTTPS/);
  assert.match(validationErrors({ OPENWEBUI_API_BASE_URL: 'not-a-url' }).join('\n'), /OPENWEBUI_API_BASE_URL must be an absolute HTTP\(S\) URL/);
  assert.deepEqual(validationErrors({ OPENWEBUI_API_BASE_URL: 'https://mindlarp.ai/v1' }), []);
  assert.deepEqual(validationErrors({ OPENWEBUI_API_BASE_URL: 'http://host.docker.internal:3000/v1' }), []);
  assert.deepEqual(validationErrors({ OPENWEBUI_API_BASE_URL: 'http://mindlarp.example/v1', ALLOW_HTTP_UPSTREAM: 'true' }), []);
});
