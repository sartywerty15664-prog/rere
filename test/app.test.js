import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createServer as createTcpServer } from 'node:net';
import { createHmac } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';

const password = 'a-very-good-password';
const root = resolve(import.meta.dirname, '..');
const configurationKeys = [
  'MINDLARP_UPSTREAM_URL', 'MINDLARP_UPSTREAM_KEY', 'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET',
  'STRIPE_SECRET_KEY', 'STRIPE_PRICE_ID', 'STRIPE_WEBHOOK_SECRET',
  'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_REQUIRE_TLS', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
  'ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION', 'INFERENCE_DAILY_REQUEST_LIMIT', 'ALLOW_HTTP_UPSTREAM',
  'OPENWEBUI_URL', 'OPENWEBUI_API_BASE_URL', 'OPENWEBUI_PORT', 'MINDLARP_OPENWEBUI_API_KEY',
  'DATABASE_URL', 'DIRECT_URL', 'DATABASE_SSL', 'DATABASE_SSL_REJECT_UNAUTHORIZED', 'DATABASE_POOL_SIZE',
];

async function listen(server) {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  return server.address().port;
}

async function close(server) {
  if (!server.listening) return;
  await new Promise((resolveClose) => server.close(resolveClose));
}

async function startApp(t, options = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'mindlarp-next-test-'));
  const dataFile = join(directory, 'store.json');
  const probe = createServer();
  const port = await listen(probe);
  await close(probe);
  const origin = `http://127.0.0.1:${port}`;
  const blankConfiguration = Object.fromEntries(configurationKeys.map((key) => [key, '']));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    cwd: root,
    env: {
      ...process.env,
      ...blankConfiguration,
      NODE_ENV: 'production',
      NEXT_TELEMETRY_DISABLED: '1',
      ALLOW_JSON_PRODUCTION: 'true',
      ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'false',
      INFERENCE_DAILY_REQUEST_LIMIT: '1000',
      DATA_FILE: dataFile,
      PUBLIC_URL: origin,
      MINDLARP_UPSTREAM_URL: options.upstreamUrl || '',
      ...Object.fromEntries(Object.entries(options.env || {}).map(([key, value]) => [key, String(value)])),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const cleanup = async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      await Promise.race([exited, delay(3000).then(() => child.kill('SIGKILL'))]);
    }
    await rm(directory, { recursive: true, force: true });
  };
  t.after(cleanup);
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Next.js stopped during startup:\n${output}`);
    try {
      const response = await fetch(`${origin}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
       return {
  origin,
  dataFile,
  readData: async () => {
    try {
      return JSON.parse(await readFile(dataFile, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;

      return {
        version: 1,
        users: [],
        sessions: [],
        keys: [],
        usage: [],
        conversations: [],
        passwordResets: [],
      };
    }
  },
};
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`Next.js did not become ready:\n${output}`);
}

async function post(origin, path, body, cookie = '', requestOrigin = origin) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(body)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      params.append(key, item);
    }
  }

  return fetch(`${origin}${path}`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: requestOrigin,
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: params,
  });
}

async function setupOwner(origin) {
  const response = await post(origin, '/actions/auth/setup', { displayName: 'Ada Lovelace', email: 'ada@example.com', password, confirmPassword: password });
  assert.equal(response.status, 303);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.match(cookie, /^ml_session=/);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  return cookie;
}

async function createKey(origin, cookie, name = 'Production', scopes = ['models:read', 'inference:write']) {
  const consoleResponse = await fetch(`${origin}/console/keys`, { headers: { Cookie: cookie } });
  assert.equal(consoleResponse.status, 200);
  const html = await consoleResponse.text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
  const response = await post(origin, '/console/keys/create', { name, scopes, expires: 'never', csrf }, cookie);
  const responseHtml = await response.text();
  const secret = responseHtml.match(/id="new-secret">([^<]+)</)?.[1];
  return { response, html: responseHtml, secret, csrf };
}

async function startUpstream(t, responseText = 'A clear answer.') {
  const requests = [];
  const upstream = createServer((req, res) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body);
      requests.push({ url: req.url, authorization: req.headers.authorization, payload });
      if (payload.stream) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        res.end(`data: ${JSON.stringify({ id: 'chat_stream', choices: [{ delta: { content: responseText } }] })}\n\ndata: [DONE]\n\n`);
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'chat_test', choices: [{ message: { role: 'assistant', content: responseText } }], usage: { prompt_tokens: 7, completion_tokens: 3, total_tokens: 10 } }));
      }
    });
  });
  const port = await listen(upstream);
  t.after(() => close(upstream));
  return { url: `http://127.0.0.1:${port}/v1`, requests };
}

test('public pages, assets, SEO, trust strip, and health work on Next.js', async (t) => {
  const { origin } = await startApp(t);
  for (const path of ['/', '/models', '/models/larp-1', '/models/larp-1-code', '/pricing', '/docs', '/docs/getting-started', '/docs/api-reference', '/changelog', '/legal', '/status']) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.match(await response.text(), /MindLarp/);
  }
  assert.equal((await fetch(`${origin}/models/unknown`)).status, 404);
  assert.equal((await fetch(`${origin}/missing`)).status, 404);
  assert.deepEqual(await (await fetch(`${origin}/health`)).json(), { status: 'ok', service: 'mindlarp-site', database: 'json' });
  const response = await fetch(`${origin}/`);
  const html = await response.text();
  assert.match(html, /rel="canonical"/);
  assert.match(html, /property="og:image"/);
  assert.match(html, /name="twitter:card"/);
  assert.match(html, /application\/ld\+json/);
  assert.match(response.headers.get('content-security-policy'), /nonce-/);
  assert.match(response.headers.get('content-security-policy'), /strict-dynamic/);
  assert.match(html, /\u00A9 2026 ClodLeGrande/);
  for (const name of ['GitHub', 'YouTube', 'Hugging Face', 'Telegram', 'Discord']) assert.match(html, new RegExp(`aria-label="MindLarp on ${name}"`));
  assert.match(html, /Start chat/);
  assert.match(html, /Trusted by 22M\+ developers/);
  const renderedMarkup = html.split('<script type="application/ld+json"')[0];
  assert.equal((renderedMarkup.match(/data-trusted-set/g) || []).length, 3);
  for (const name of ['Salesforce', 'Intel', 'Cisco', 'Red Hat', 'Revolut']) assert.match(html, new RegExp(`aria-label="${name}"`));
  assert.match(html, /aria-live="off"/);
  assert.ok(html.indexOf('id="trusted-strip-title"') < html.indexOf('What is MindLarp?'));
  assert.ok(html.indexOf('What is MindLarp?') < html.indexOf('[ 02 ]'));
  for (const path of ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/assets/og.svg', '/assets/logo.png', '/assets/style.css', '/bootstrap.js', '/vendor/gsap.min.js', '/vendor/ScrollTrigger.min.js', '/vendor/lenis.min.js']) {
    assert.equal((await fetch(`${origin}${path}`)).status, 200, path);
  }
  assert.match(await (await fetch(`${origin}/robots.txt`)).text(), new RegExp(`Sitemap: ${origin}/sitemap\\.xml`));
  assert.match(await (await fetch(`${origin}/sitemap.xml`)).text(), new RegExp(`<loc>${origin}/</loc>`));
  for (const path of ['/assets/login', '/assets/docs', '/assets/health']) assert.equal((await fetch(`${origin}${path}`)).status, 404, path);
  assert.equal(response.headers.get('x-powered-by'), null);
});

test('owner setup validates input and establishes a persistent session', async (t) => {
  const { origin, readData } = await startApp(t);
  let response = await fetch(`${origin}/console`, { redirect: 'manual' });
  assert.equal(response.headers.get('location'), '/setup');
  response = await post(origin, '/actions/auth/setup', { displayName: 'Ada', email: 'bad', password: 'short', confirmPassword: 'short' });
  assert.equal(response.status, 303);
  assert.match(await (await fetch(`${origin}${response.headers.get('location')}`)).text(), /Passwords must match and contain at least 12 characters/);
  const cookie = await setupOwner(origin);
  response = await fetch(`${origin}/console`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Good to see you, Ada/);
  assert.equal((await readData()).users.length, 1);
  assert.equal((await fetch(`${origin}/setup`, { redirect: 'manual' })).headers.get('location'), '/login');
});

test('auth routes reject cross-origin requests without changing account data', async (t) => {
  const { origin, readData } = await startApp(t);
  const cookie = await setupOwner(origin);

  const requests = [
    ['/actions/auth/login', {
      email: 'ada@example.com',
      password,
    }],
    ['/actions/auth/register', {
      displayName: 'Grace Hopper',
      email: 'grace@example.com',
      password: 'another-good-password',
      confirmPassword: 'another-good-password',
    }],
    ['/actions/auth/forgot-password', {
      email: 'ada@example.com',
    }],
  ];

  for (const [path, body] of requests) {
    const response = await post(
      origin,
      path,
      body,
      cookie,
      'https://evil.example'
    );

    assert.equal(response.status, 403, path);
  }

  assert.equal((await readData()).users.length, 1);

  const emptyApp = await startApp(t);

  const setupResponse = await post(
    emptyApp.origin,
    '/actions/auth/setup',
    {
      displayName: 'Attacker',
      email: 'attacker@example.com',
      password,
      confirmPassword: password,
    },
    '',
    'https://evil.example'
  );

  assert.equal(setupResponse.status, 403);
  assert.equal((await emptyApp.readData()).users.length, 0);
});

test('API keys are scoped, hashed, validated, protected by CSRF, and revocable', async (t) => {
  const { origin, readData } = await startApp(t);
  const cookie = await setupOwner(origin);
  let response = await post(origin, '/console/keys/create', { name: 'No CSRF', scopes: 'models:read', expires: 'never' }, cookie);
  assert.equal(response.status, 403);
  const consoleHtml = await (await fetch(`${origin}/console/keys`, { headers: { Cookie: cookie } })).text();
  const csrf = consoleHtml.match(/name="csrf" value="([^"]+)"/)[1];
  response = await post(origin, '/console/keys/create', { name: '', scopes: 'models:read', expires: 'never', csrf }, cookie);
  assert.equal(response.status, 400);
  response = await post(origin, '/console/keys/create', { name: 'No scopes', expires: 'never', csrf }, cookie);
  assert.equal(response.status, 400);
  const { response: created, html: createdHtml, secret } = await createKey(origin, cookie);
  assert.equal(created.status, 201);
  assert.match(secret, /^ml_sk_live_[\w-]{40,}$/);
  const nonce = created.headers.get('content-security-policy').match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  assert.ok(createdHtml.includes(`src="/bootstrap.js" nonce="${nonce}"`));
  let data = await readData();
  assert.equal(data.keys[0].scopes.length, 2);
  assert.equal(JSON.stringify(data).includes(secret), false);
  const modelsResponse = await fetch(`${origin}/v1/models`, { headers: { Authorization: `Bearer ${secret}` } });
  assert.equal(modelsResponse.status, 200);
  const catalog = await modelsResponse.json();
  assert.deepEqual(catalog.data.map((model) => model.id), ['MindLarp-Larp-1', 'MindLarp-Larp-1-Code']);
  assert.equal((await fetch(`${origin}/v1/models`, { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  const keyId = data.keys[0].id;
  response = await post(origin, `/console/keys/${keyId}/revoke`, { csrf }, cookie);
  assert.equal(response.status, 303);
  data = await readData();
  assert.ok(data.keys[0].revokedAt);
  assert.equal((await fetch(`${origin}/v1/models`, { headers: { Authorization: `Bearer ${secret}` } })).status, 401);
});

test('unconfigured inference and chat return truthful errors and record request activity', async (t) => {
  const { origin, readData } = await startApp(t);
  const cookie = await setupOwner(origin);
  const { secret } = await createKey(origin, cookie);
  let response = await fetch(`${origin}/v1/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'MindLarp-Larp-1', messages: [{ role: 'user', content: 'Hello' }] }),
  });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'inference_not_configured');
  assert.equal((await readData()).usage[0].status, 503);
  const html = await (await fetch(`${origin}/chat`, { headers: { Cookie: cookie } })).text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
  assert.match(html, /What are you thinking about/);
  response = await fetch(`${origin}/chat/messages`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'MindLarp-Larp-1', message: 'Hello' }) });
  assert.equal(response.status, 403);
  response = await fetch(`${origin}/chat/messages`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, model: 'MindLarp-Larp-1', message: 'Hello' }) });
  assert.equal(response.status, 503);
  const overview = await (await fetch(`${origin}/console`, { headers: { Cookie: cookie } })).text();
  assert.match(overview, /Latest API requests/);
});

test('configured upstream completions proxy JSON and streams with usage accounting', async (t) => {
  const upstream = await startUpstream(t);
  const { origin, readData } = await startApp(t, { upstreamUrl: upstream.url, env: { ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true' } });
  const cookie = await setupOwner(origin);
  const { secret } = await createKey(origin, cookie);
  let response = await fetch(`${origin}/v1/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'MindLarp-Larp-1', messages: [{ role: 'user', content: 'Hello' }] }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).choices[0].message.content, 'A clear answer.');
  response = await fetch(`${origin}/v1/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'MindLarp-Larp-1-Code', messages: [{ role: 'user', content: 'Hello' }], stream: true }),
  });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /text\/event-stream/);
  assert.match(await response.text(), /data: \[DONE\]/);
  assert.equal(upstream.requests[0].url, '/v1/chat/completions');
  const data = await readData();
  const completionUsage = data.usage.find((event) => event.model === 'MindLarp-Larp-1');
  assert.equal(completionUsage.totalTokens, 10);
  assert.equal(completionUsage.promptTokens, 7);
  assert.equal(data.usage.find((event) => event.model === 'MindLarp-Larp-1-Code').status, 200);
});

test('chat persists real upstream answers and billing setup reports missing Stripe', async (t) => {
  const upstream = await startUpstream(t, 'A real upstream answer.');
  const { origin, readData } = await startApp(t, { upstreamUrl: upstream.url, env: { ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true' } });
  const cookie = await setupOwner(origin);
  const html = await (await fetch(`${origin}/chat`, { headers: { Cookie: cookie } })).text();
  const csrf = html.match(/name="csrf" value="([^"]+)"/)[1];
  const response = await fetch(`${origin}/chat/messages`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, model: 'MindLarp-Larp-1', message: 'Hello' }) });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).message, 'A real upstream answer.');
  const data = await readData();
  assert.equal(data.conversations[0].messages.length, 2);
  assert.equal(data.usage[0].totalTokens, 10);
  assert.equal((await fetch(`${origin}/console/billing`, { headers: { Cookie: cookie } })).status, 200);
  assert.equal((await post(origin, '/console/billing/checkout', { csrf }, cookie)).status, 503);
  assert.equal((await post(origin, '/webhooks/stripe', {})).status, 503);
});

test('registration, password changes, logout, and returning-user login work', async (t) => {
  const { origin, readData } = await startApp(t);
  const cookie = await setupOwner(origin);
  let response = await post(origin, '/actions/auth/register', { displayName: 'Grace Hopper', email: 'grace@example.com', password: 'another-good-password', confirmPassword: 'another-good-password' });
  assert.equal(response.status, 303);
  const memberCookie = response.headers.get('set-cookie').split(';')[0];
  let data = await readData();
  assert.equal(data.users.length, 2);
  assert.equal(data.users[1].role, 'member');
  assert.equal((await fetch(`${origin}/console`, { headers: { Cookie: memberCookie } })).status, 200);
  response = await post(origin, '/actions/auth/register', { displayName: 'Duplicate', email: 'grace@example.com', password: 'another-good-password', confirmPassword: 'another-good-password' });
  assert.equal(response.headers.get('location').includes('error=exists'), true);
  const consoleHtml = await (await fetch(`${origin}/console`, { headers: { Cookie: cookie } })).text();
  const csrf = consoleHtml.match(/name="csrf" value="([^"]+)"/)[1];
  response = await post(origin, '/console/settings/password', { currentPassword: password, newPassword: 'a-new-good-password', confirmPassword: 'a-new-good-password', csrf }, cookie);
  assert.equal(response.status, 303);
  response = await post(origin, '/console/logout', { csrf }, cookie);
  assert.equal(response.status, 303);
  assert.equal((await fetch(`${origin}/console`, { headers: { Cookie: cookie }, redirect: 'manual' })).headers.get('location'), '/login');
  response = await post(origin, '/actions/auth/login', { email: 'ada@example.com', password });
  assert.equal(response.status, 303);
  assert.match(response.headers.get('location'), /error=credentials/);
  response = await post(origin, '/actions/auth/login', { email: 'grace@example.com', password: 'another-good-password' });
  assert.equal(response.status, 303);
  response = await post(origin, '/actions/auth/login', { email: 'ada@example.com', password: 'a-new-good-password' });
  assert.equal(response.status, 303);
  assert.equal((await fetch(`${origin}/console`, { headers: { Cookie: response.headers.get('set-cookie').split(';')[0] } })).status, 200);
  data = await readData();
  assert.equal(data.users.length, 2);
});

test('Google and GitHub OAuth report missing configuration or redirect with protected state', async (t) => {
  const unconfigured = await startApp(t);
  assert.equal((await fetch(`${unconfigured.origin}/auth/google`)).status, 503);
  const configured = await startApp(t, { env: { GOOGLE_CLIENT_ID: 'client-id', GOOGLE_CLIENT_SECRET: 'secret', GITHUB_CLIENT_ID: 'github-id', GITHUB_CLIENT_SECRET: 'github-secret', PUBLIC_URL: 'https://mindlarp.test' } });
  for (const provider of ['google', 'github']) {
    const response = await fetch(`${configured.origin}/auth/${provider}`, { redirect: 'manual' });
    assert.equal(response.status, 302);
    const location = new URL(response.headers.get('location'));
    assert.equal(location.hostname, provider === 'google' ? 'accounts.google.com' : 'github.com');
    assert.equal(location.searchParams.get('state').length > 20, true);
    if (provider === 'google') assert.equal(location.searchParams.get('code_challenge_method'), 'S256');
    assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  }
});

test('signed Stripe webhook updates billing and rejects an invalid signature', async (t) => {
  const webhookSecret = 'whsec_mindlarp_test';
  const { origin, readData } = await startApp(t, {
    env: {
      STRIPE_SECRET_KEY: 'sk_test_mindlarp',
      STRIPE_PRICE_ID: 'price_test',
      STRIPE_WEBHOOK_SECRET: webhookSecret,
    },
  });

  await setupOwner(origin);
  const userId = (await readData()).users[0].id;

  async function sendEvent(type, object, { id = `evt_${type.replaceAll('.', '_')}`, created = null } = {}) {
    const payload = JSON.stringify({
      id,
      type,
      ...(created === null ? {} : { created }),
      data: { object },
    });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest('hex');

    return fetch(`${origin}/webhooks/stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': `t=${timestamp},v1=${signature}`,
      },
      body: payload,
    });
  }

  let response = await sendEvent('checkout.session.completed', {
    id: 'cs_test',
    customer: 'cus_test',
    subscription: 'sub_test',
    client_reference_id: userId,
  });

  assert.equal(response.status, 200);

  let billing = (await readData()).users[0].billing;
  assert.equal(billing.stripeCustomerId, 'cus_test');
  assert.equal(billing.subscriptionId, 'sub_test');
  assert.equal(billing.status, 'pending');

  response = await sendEvent('customer.subscription.updated', {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + 86400,
    items: {
      data: [{ price: { id: 'price_test' } }],
    },
  });

  assert.equal(response.status, 200);

  billing = (await readData()).users[0].billing;
  assert.equal(billing.subscriptionId, 'sub_test');
  assert.equal(billing.status, 'active');
  assert.equal(billing.priceId, 'price_test');
  assert.ok(billing.currentPeriodEnd);

  response = await sendEvent('checkout.session.completed', {
    id: 'cs_test',
    customer: 'cus_test',
    subscription: 'sub_test',
    client_reference_id: userId,
  });
  assert.equal(response.status, 200);
  assert.equal((await readData()).users[0].billing.status, 'active');

  response = await sendEvent('customer.subscription.deleted', {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'canceled',
    items: { data: [{ price: { id: 'price_test' } }] },
  }, { id: 'evt_subscription_deleted_new', created: 2000 });
  assert.equal(response.status, 200);
  assert.equal((await readData()).users[0].billing.status, 'canceled');

  response = await sendEvent('customer.subscription.updated', {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    items: { data: [{ price: { id: 'price_test' } }] },
  }, { id: 'evt_subscription_updated_stale', created: 1000 });
  assert.equal(response.status, 200);
  billing = (await readData()).users[0].billing;
  assert.equal(billing.status, 'canceled');

  response = await sendEvent('customer.subscription.updated', {
    id: 'sub_test',
    customer: 'cus_test',
    status: 'active',
    items: { data: [{ price: { id: 'price_other' } }] },
  }, { id: 'evt_subscription_wrong_price', created: 3000 });
  assert.equal(response.status, 400);
  assert.equal((await readData()).users[0].billing.status, 'canceled');

  const invalidPayload = JSON.stringify({
    id: 'evt_invalid',
    type: 'checkout.session.completed',
    data: { object: { client_reference_id: userId } },
  });
  const timestamp = Math.floor(Date.now() / 1000);

  response = await fetch(`${origin}/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=${timestamp},v1=invalid`,
    },
    body: invalidPayload,
  });

  assert.equal(response.status, 400);
});

test('password recovery reports missing SMTP without pretending to send email', async (t) => {
  const { origin } = await startApp(t);
  await setupOwner(origin);
  assert.equal((await fetch(`${origin}/forgot-password`)).status, 200);
  const response = await post(origin, '/actions/auth/forgot-password', { email: 'ada@example.com' });
  assert.equal(response.status, 303);
  const page = await (await fetch(`${origin}${response.headers.get('location')}`)).text();
  assert.match(page, /Password recovery is not configured/);
});

test('SMTP recovery uses a hashed one-time token, revokes sessions, and permits the new login', async (t) => {
  const messages = [];
  const smtp = createTcpServer((socket) => {
    let buffer = '';
    let receiving = false;
    let message = '';
    socket.setEncoding('utf8');
    socket.write('220 localhost ESMTP\r\n');
    socket.on('data', (chunk) => {
      buffer += chunk;
      if (receiving) {
        const end = buffer.indexOf('\r\n.\r\n');
        if (end === -1) return;
        message += buffer.slice(0, end);
        messages.push(message.replace(/=\r?\n/g, '').replace(/=3D/g, '='));
        buffer = buffer.slice(end + 5);
        receiving = false;
        message = '';
        socket.write('250 Accepted\r\n');
      }
      let newline;
      while (!receiving && (newline = buffer.indexOf('\r\n')) !== -1) {
        const line = buffer.slice(0, newline);
        buffer = buffer.slice(newline + 2);
        const command = line.split(' ')[0].toUpperCase();
        if (command === 'EHLO') socket.write('250-localhost\r\n250 SMTPUTF8\r\n');
        else if (command === 'DATA') { receiving = true; socket.write('354 End data with <CR><LF>.<CR><LF>\r\n'); }
        else if (command === 'QUIT') { socket.write('221 Bye\r\n'); socket.end(); }
        else socket.write('250 OK\r\n');
      }
    });
  });
  const port = await listen(smtp);
  t.after(() => close(smtp));
  const { origin, readData } = await startApp(t, { env: { SMTP_HOST: '127.0.0.1', SMTP_PORT: port, SMTP_REQUIRE_TLS: 'false', SMTP_FROM: 'MindLarp <no-reply@example.com>' } });
  const oldCookie = await setupOwner(origin);
  let response = await post(origin, '/actions/auth/forgot-password', { email: 'unknown@example.com' });
  assert.equal(response.headers.get('location'), '/forgot-password?sent=1');
  assert.equal(messages.length, 0);
  response = await post(origin, '/actions/auth/forgot-password', { email: ' ADA@EXAMPLE.COM ' });
  assert.equal(response.status, 303);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /ada@example.com/);
  const token = messages[0].match(/reset-password\?token=([A-Za-z0-9_-]+)/)?.[1];
  assert.ok(token);
  let data = await readData();
  assert.equal(JSON.stringify(data).includes(token), false);
  assert.equal(data.passwordResets.length, 1);
  assert.match(data.passwordResets[0].tokenHash, /^[a-f0-9]{64}$/);
  assert.equal((await fetch(`${origin}/reset-password?token=${token}`)).status, 200);
  response = await post(origin, '/actions/auth/reset-password', { token, password: 'a-reset-good-password', confirmPassword: 'not-the-same-password' });
  assert.match(response.headers.get('location'), /error=invalid/);
  const resetAttempts = await Promise.all([
    post(origin, '/actions/auth/reset-password', { token, password: 'a-reset-good-password', confirmPassword: 'a-reset-good-password' }),
    post(origin, '/actions/auth/reset-password', { token, password: 'a-competing-reset-password', confirmPassword: 'a-competing-reset-password' }),
  ]);
  const successfulReset = resetAttempts.find((attempt) => attempt.headers.get('location') === '/login?reset=success');
  assert.ok(successfulReset);
  assert.equal(resetAttempts.filter((attempt) => attempt.headers.get('location') === '/login?reset=success').length, 1);
  assert.equal(resetAttempts.filter((attempt) => attempt.headers.get('location')?.includes('error=invalid')).length, 1);
  const winningPassword = resetAttempts.indexOf(successfulReset) === 0 ? 'a-reset-good-password' : 'a-competing-reset-password';
  data = await readData();
  assert.equal(data.passwordResets.length, 0);
  assert.equal(data.sessions.length, 0);
  assert.equal((await fetch(`${origin}/console`, { headers: { Cookie: oldCookie }, redirect: 'manual' })).headers.get('location'), '/login');
  assert.match((await post(origin, '/actions/auth/login', { email: 'ada@example.com', password })).headers.get('location'), /error=credentials/);
  response = await post(origin, '/actions/auth/login', { email: 'ada@example.com', password: winningPassword });
  assert.equal(response.status, 303);
  assert.match(response.headers.get('set-cookie'), /^ml_session=/);
  assert.match((await post(origin, '/actions/auth/reset-password', { token, password: 'another-reset-password', confirmPassword: 'another-reset-password' })).headers.get('location'), /error=invalid/);
  assert.match(await (await fetch(`${origin}/login?reset=success`)).text(), /Password updated\. Sign in with your new password\./);
});

test('OAuth never attaches a verified identity to an existing password account by email alone', async (t) => {
  const mockModule = new URL('./mock-oauth.js', import.meta.url).href;
  const { origin, readData } = await startApp(t, {
    env: {
      GOOGLE_CLIENT_ID: 'client-id',
      GOOGLE_CLIENT_SECRET: 'secret',
      NODE_OPTIONS: `--import ${mockModule}`,
    },
  });
  let response = await post(origin, '/actions/auth/setup', { displayName: 'Victim', email: 'victim@example.com', password, confirmPassword: password });
  assert.equal(response.status, 303);

  async function completeGoogle(code) {
    const begin = await fetch(`${origin}/auth/google`, { redirect: 'manual' });
    assert.equal(begin.status, 302);
    const state = new URL(begin.headers.get('location')).searchParams.get('state');
    const cookie = begin.headers.get('set-cookie').split(';')[0];
    return fetch(`${origin}/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`, {
      headers: { Cookie: cookie },
      redirect: 'manual',
    });
  }

  response = await completeGoogle('victim');
  assert.match(response.headers.get('location'), /\/login\?error=oauth$/);
  let data = await readData();
  assert.equal(data.users.length, 1);
  assert.equal(data.users[0].identities.length, 0);

  response = await completeGoogle('oauth');
  assert.equal(response.headers.get('location'), '/console');
  assert.match(response.headers.get('set-cookie'), /ml_session=/);
  data = await readData();
  assert.equal(data.users.length, 2);
  assert.deepEqual(data.users[1].identities, [{ provider: 'google', providerId: 'google-oauth' }]);
});

test('API key creation is capped at ten active keys per account', async (t) => {
  const { origin, readData } = await startApp(t);
  const cookie = await setupOwner(origin);
  for (let index = 0; index < 10; index += 1) {
    const { response } = await createKey(origin, cookie, `Key ${index + 1}`);
    assert.equal(response.status, 201, `key ${index + 1}`);
  }
  const { response, html } = await createKey(origin, cookie, 'One key too many');
  assert.equal(response.status, 400);
  assert.match(html, /at most 10 active API keys/);
  assert.equal((await readData()).keys.length, 10);
});

test('inference requires entitlement and enforces one daily account quota across API keys and chat', async (t) => {
  const upstream = await startUpstream(t);
  const restricted = await startApp(t, {
    upstreamUrl: upstream.url,
    env: {
      STRIPE_SECRET_KEY: 'sk_test_mindlarp',
      STRIPE_PRICE_ID: 'price_test',
      STRIPE_WEBHOOK_SECRET: 'whsec_mindlarp_test',
    },
  });
  const cookie = await setupOwner(restricted.origin);
  const { secret } = await createKey(restricted.origin, cookie);
  let response = await fetch(`${restricted.origin}/v1/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'MindLarp-Larp-1', messages: [{ role: 'user', content: 'Hello' }] }),
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error.code, 'inference_access_denied');
  const chatHtml = await (await fetch(`${restricted.origin}/chat`, { headers: { Cookie: cookie } })).text();
  const csrf = chatHtml.match(/name="csrf" value="([^"]+)"/)[1];
  response = await fetch(`${restricted.origin}/chat/messages`, { method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ csrf, model: 'MindLarp-Larp-1', message: 'Hello' }) });
  assert.equal(response.status, 403);
  assert.equal(upstream.requests.length, 0);

  const limitedUpstream = await startUpstream(t);
  const limited = await startApp(t, { upstreamUrl: limitedUpstream.url, env: { ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true', INFERENCE_DAILY_REQUEST_LIMIT: '1' } });
  const limitedCookie = await setupOwner(limited.origin);
  const firstKey = await createKey(limited.origin, limitedCookie, 'First');
  const secondKey = await createKey(limited.origin, limitedCookie, 'Second');
  for (const [index, key] of [firstKey.secret, secondKey.secret].entries()) {
    response = await fetch(`${limited.origin}/v1/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'MindLarp-Larp-1', messages: [{ role: 'user', content: 'Hello' }] }),
    });
    assert.equal(response.status, index === 0 ? 200 : 429);
    if (index === 1) assert.equal((await response.json()).error.code, 'inference_quota_exceeded');
  }
  assert.equal(limitedUpstream.requests.length, 1);
});

test('upstream errors and oversized responses are bounded and do not leak provider diagnostics', async (t) => {
  const upstream = createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const payload = JSON.parse(body);
      if (payload.messages.at(-1).content === 'oversize') {
        response.writeHead(200, { 'Content-Type': 'application/json' });
        response.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: 'x'.repeat(1_100_000) } }] }));
        return;
      }
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'provider-secret-diagnostic' } }));
    });
  });
  const port = await listen(upstream);
  t.after(() => close(upstream));
  const { origin } = await startApp(t, { upstreamUrl: `http://127.0.0.1:${port}/v1`, env: { ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION: 'true' } });
  const cookie = await setupOwner(origin);
  const { secret } = await createKey(origin, cookie);
  for (const message of ['failure', 'oversize']) {
    const response = await fetch(`${origin}/v1/chat/completions`, {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'MindLarp-Larp-1', messages: [{ role: 'user', content: message }] }),
    });
    assert.equal(response.status, 502);
    const result = await response.json();
    assert.equal(result.error.code, message === 'oversize' ? 'upstream_response_too_large' : 'upstream_request_failed');
    assert.doesNotMatch(JSON.stringify(result), /provider-secret-diagnostic/);
  }
});

test('login rate limits are isolated by account and success cannot clear another account limit', async (t) => {
  const { origin } = await startApp(t);
  await setupOwner(origin);
  await post(origin, '/actions/auth/register', { displayName: 'Grace Hopper', email: 'grace@example.com', password: 'another-good-password', confirmPassword: 'another-good-password' });
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await post(origin, '/actions/auth/login', { email: 'ada@example.com', password: 'wrong-password' });
  }
  let response = await post(origin, '/actions/auth/login', { email: 'ada@example.com', password });
  assert.match(response.headers.get('location'), /error=limit/);
  response = await post(origin, '/actions/auth/login', { email: 'grace@example.com', password: 'another-good-password' });
  assert.match(response.headers.get('set-cookie'), /^ml_session=/);
  response = await post(origin, '/actions/auth/login', { email: 'ada@example.com', password });
  assert.match(response.headers.get('location'), /error=limit/);
});
