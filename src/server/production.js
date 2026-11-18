function validUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function validOrigin(value) {
  if (!validUrl(value)) return false;
  const url = new URL(value);
  return (url.pathname === '' || url.pathname === '/') && !url.search && !url.hash;
}

function localHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '::1', 'host.docker.internal'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function validateProductionConfig(env = process.env) {
  const errors = [];
  if (!env.PUBLIC_URL || !validOrigin(env.PUBLIC_URL)) {
    errors.push('PUBLIC_URL must be an absolute HTTP(S) origin without credentials, a path, query, or fragment.');
  } else if (new URL(env.PUBLIC_URL).protocol !== 'https:' && env.ALLOW_HTTP_PUBLIC_URL !== 'true' && !localHttpUrl(env.PUBLIC_URL)) {
    errors.push('PUBLIC_URL must use HTTPS in production. Set ALLOW_HTTP_PUBLIC_URL=true only for an isolated local deployment.');
  }
  if (!env.DATABASE_URL && env.ALLOW_JSON_PRODUCTION !== 'true') {
    errors.push('DATABASE_URL is required. JSON storage is a development fallback; set ALLOW_JSON_PRODUCTION=true only for a local single-process deployment.');
  }
  if (env.DATABASE_URL?.includes('postgres:postgres@')) {
    errors.push('Replace the default PostgreSQL credentials in DATABASE_URL before production deployment.');
  }
  if (env.DATABASE_POOL_SIZE && (!Number.isInteger(Number(env.DATABASE_POOL_SIZE)) || Number(env.DATABASE_POOL_SIZE) < 1 || Number(env.DATABASE_POOL_SIZE) > 100)) {
    errors.push('DATABASE_POOL_SIZE must be an integer between 1 and 100.');
  }
  for (const provider of ['GOOGLE', 'GITHUB']) {
    if (Boolean(env[`${provider}_CLIENT_ID`]) !== Boolean(env[`${provider}_CLIENT_SECRET`])) {
      errors.push(`${provider}_CLIENT_ID and ${provider}_CLIENT_SECRET must be configured together.`);
    }
  }
  const stripeValues = ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET'];
  if (stripeValues.some((key) => env[key]) && stripeValues.some((key) => !env[key])) {
    errors.push('STRIPE_SECRET_KEY, STRIPE_PRICE_ID, and STRIPE_WEBHOOK_SECRET must be configured together.');
  }
  for (const key of ['DATABASE_QUERY_TIMEOUT', 'DATABASE_STATEMENT_TIMEOUT', 'DATABASE_LOCK_TIMEOUT']) {
    if (env[key] && (!Number.isInteger(Number(env[key])) || Number(env[key]) < 100 || Number(env[key]) > 300000)) {
      errors.push(`${key} must be an integer between 100 and 300000 milliseconds.`);
    }
  }
  if (env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
    errors.push('DATABASE_SSL_REJECT_UNAUTHORIZED=false is not allowed in production.');
  }
  if (env.MINDLARP_UPSTREAM_URL && !validUrl(env.MINDLARP_UPSTREAM_URL)) {
    errors.push('MINDLARP_UPSTREAM_URL must be an absolute HTTP(S) URL without embedded credentials.');
  } else if (env.MINDLARP_UPSTREAM_URL) {
    if (localHttpUrl(env.MINDLARP_UPSTREAM_URL) === false && new URL(env.MINDLARP_UPSTREAM_URL).protocol !== 'https:' && env.ALLOW_HTTP_UPSTREAM !== 'true') {
      errors.push('MINDLARP_UPSTREAM_URL must use HTTPS. Set ALLOW_HTTP_UPSTREAM=true only for a trusted private network.');
    }
    const dailyLimit = Number(env.INFERENCE_DAILY_REQUEST_LIMIT);
    if (!Number.isInteger(dailyLimit) || dailyLimit < 1 || dailyLimit > 100000) {
      errors.push('INFERENCE_DAILY_REQUEST_LIMIT must be an integer between 1 and 100000 when inference is enabled.');
    }
    if (env.ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION !== 'true' && stripeValues.some((key) => !env[key])) {
      errors.push('Configure Stripe entitlements or explicitly set ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION=true before enabling inference.');
    }
  }
  if (env.OPENWEBUI_URL) {
    if (!validOrigin(env.OPENWEBUI_URL)) {
      errors.push('OPENWEBUI_URL must be an absolute HTTP(S) origin without credentials, a path, query, or fragment.');
    } else if (new URL(env.OPENWEBUI_URL).protocol !== 'https:' && env.ALLOW_HTTP_PUBLIC_URL !== 'true' && !localHttpUrl(env.OPENWEBUI_URL)) {
      errors.push('OPENWEBUI_URL must use HTTPS in production. Set ALLOW_HTTP_PUBLIC_URL=true only for an isolated local deployment.');
    }
  }
  if (env.OPENWEBUI_API_BASE_URL && !validUrl(env.OPENWEBUI_API_BASE_URL)) {
    errors.push('OPENWEBUI_API_BASE_URL must be an absolute HTTP(S) URL without embedded credentials.');
  } else if (env.OPENWEBUI_API_BASE_URL && !localHttpUrl(env.OPENWEBUI_API_BASE_URL) && new URL(env.OPENWEBUI_API_BASE_URL).protocol !== 'https:' && env.ALLOW_HTTP_UPSTREAM !== 'true') {
    errors.push('OPENWEBUI_API_BASE_URL must use HTTPS. Set ALLOW_HTTP_UPSTREAM=true only for a trusted private network.');
  }
  if (env.SMTP_HOST && env.SMTP_SECURE !== 'true' && env.SMTP_REQUIRE_TLS === 'false' && !['localhost', '127.0.0.1', '::1'].includes(env.SMTP_HOST)) {
    errors.push('SMTP_REQUIRE_TLS=false is allowed only for a local test relay.');
  }
  if (env.SMTP_PORT && (!Number.isInteger(Number(env.SMTP_PORT)) || Number(env.SMTP_PORT) < 1 || Number(env.SMTP_PORT) > 65535)) {
    errors.push('SMTP_PORT must be an integer between 1 and 65535.');
  }
  if (errors.length) throw new Error(`Production configuration is invalid:\n- ${errors.join('\n- ')}`);
}

export function reportProductionStorage(env = process.env) {
  if (!env.DATABASE_URL) console.warn('MindLarp is running with JSON storage. Use one process only; PostgreSQL is required for a public multi-instance deployment.');
}
