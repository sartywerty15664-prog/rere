import { models } from '../content.js';
import { escapeHtml, icon } from '../html.js';
import { publicLayout } from './layout.jsx';
import { trustedStrip } from './trusted.js';

function modelArtwork(model, large = false) {
  return `<div class="model-artwork ${model.accent} ${large ? 'large' : ''}" aria-hidden="true">
    <div class="art-grid"></div><div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div><div class="art-core"><span>${model.index}</span></div>
    <span class="art-label">${model.id}</span>
  </div>`;
}

export function homePage() {
  const features = [
    ['01', 'Deep reasoning', 'Work through ambiguous questions, complex constraints, and the details that matter.'],
    ['02', '512K context', 'Keep large documents, long conversations, and substantial codebases in view.'],
    ['03', 'Tool calling', 'Connect models to your functions and structured workflows with a familiar API.'],
    ['04', 'Streaming by default', 'Build responsive experiences with token-by-token output and clear errors.'],
    ['05', 'Your credentials', 'Create scoped API keys, set expiration, and revoke access immediately.'],
    ['06', 'Visible usage', 'Follow requests, tokens, model activity, and billing from one workspace.'],
  ];
  const content = `<section class="hermes-hero">
    <div class="hero-orbit" aria-hidden="true"><span></span><span></span><span></span><b>M</b></div>
    <div class="hero-terminal-status"><span class="status-dot"></span> MINDLARP / SOL 1 SERIES <span>SYSTEM ONLINE</span></div>
    <h1 data-hero-title>Intelligence.<br><span>In your element.</span></h1>
    <p data-hero-copy>Meet the MindLarp family by GonidonCloud. Two models for fast, focused work and deeper reasoning — in chat, in your code, and in your product.</p>
    <div class="button-row hero-actions"><a href="/chat" class="button button-primary">Start chat ${icon('arrow')}</a><a href="/docs/getting-started" class="button button-ghost">Build with the API <span>↗</span></a></div>
    <div class="hero-capabilities"><span>OPENAI COMPATIBLE</span><span>512K CONTEXT</span><span>TOOL CALLING</span></div>
    <div class="hero-terminal" data-hero-terminal>
      <div class="terminal-bar"><div><i></i><i></i><i></i></div><span>mindlarp — session 001</span><span>UTF-8 / CONNECTED</span></div>
      <div class="terminal-body"><div class="terminal-line"><span class="terminal-prompt">❯</span><span>mindlarp chat --model sol-1-plus</span></div><div class="terminal-line terminal-muted">Loading MindLarp-Sol-1-Plus... <span>done</span></div><div class="terminal-rule"></div><div class="terminal-line"><span class="terminal-prompt">you ›</span><span>Turn a complex idea into a clear plan.</span></div><div class="terminal-line terminal-answer"><span>mindlarp ›</span><p>Start with the outcome. Map the constraints.<br>Then make the next action unmistakable.</p></div><div class="terminal-line terminal-cursor"><span>❯</span><i></i></div></div>
      <div class="terminal-footer"><span><span class="status-dot"></span> MindLarp-Sol-1-Plus</span><span>512K / STREAMING</span></div>
    </div>
  </section>
  ${trustedStrip()}
  <section class="section home-about" data-reveal><div class="section-label"><span>[ 01 ]</span><span>THE MODEL FAMILY</span></div><div class="section-split-heading"><h2>What is MindLarp?</h2><p>A family of AI models designed to work wherever you do. Start with a conversation, then use the same intelligence through one consistent, OpenAI-compatible API. <a href="/docs">Explore the documentation ↗</a></p></div><div class="hermes-feature-grid">${features.map(([index, title, text]) => `<article data-reveal><span>${index}</span><h3>${title}</h3><p>${text}</p><i aria-hidden="true">↗</i></article>`).join('')}</div></section>
  <section class="section home-models"><div class="section-label"><span>[ 02 ]</span><span>CHOOSE YOUR DEPTH</span></div><div class="section-split-heading"><h2>One family.<br>Two ways forward.</h2><p>Move between speed and deeper reasoning without changing your integration.</p></div><div class="home-model-grid">${models.map((model) => `<article class="home-model-card" data-reveal><div class="model-card-top"><span>${model.index} / SOL 1</span><span class="status-dot"></span></div><div class="model-glyph" aria-hidden="true">${model.slug === 'sol-1-plus' ? '✦' : '◈'}</div><span class="micro-label">${model.eyebrow}</span><h3>${model.name}</h3><p>${model.description}</p><dl><div><dt>CONTEXT</dt><dd>${model.context}</dd></div><div><dt>PROFILE</dt><dd>${model.latency}</dd></div></dl><a href="/models/${model.slug}" class="text-link">Explore model ${icon('arrow')}</a></article>`).join('')}</div></section>
  <section class="section home-quickstart"><div class="section-label"><span>[ 03 ]</span><span>QUICKSTART</span></div><div class="quickstart-grid"><div><h2>From zero to<br>first response.</h2><p>One key. One endpoint. No new mental model required.</p><ol class="quickstart-steps"><li><span>01</span><div><strong>Create a scoped API key</strong><small>Your full secret is shown once.</small></div></li><li><span>02</span><div><strong>Choose your model</strong><small>Plus for momentum. Max for depth.</small></div></li><li><span>03</span><div><strong>Make something useful</strong><small>Stream results and inspect real usage.</small></div></li></ol><a href="/docs/getting-started" class="text-link">Read the quickstart ${icon('arrow')}</a></div><div class="code-window"><div class="code-toolbar"><span><i class="window-dot"></i> request.sh</span><button class="copy-button js-copy" data-copy-target="home-code" type="button">${icon('copy')} Copy</button></div><pre id="home-code"><code><span class="code-muted">$</span> curl http://localhost:5173/v1/chat/completions \\
  -H <span class="code-green">"Authorization: Bearer $MINDLARP_API_KEY"</span> \\
  -H <span class="code-green">"Content-Type: application/json"</span> \\
  -d <span class="code-green">'{
    "model": "MindLarp-Sol-1-Plus",
    "messages": [{
      "role": "user",
      "content": "Make the complex clear."
    }]
  }'</span></code></pre><div class="code-result"><span>200 OK</span><span>RESPONSE STREAMING <i></i></span></div></div></div></section>
  <section class="home-console-cta" data-reveal><span class="section-kicker">[ 04 ] YOUR NEXT SESSION</span><h2>Bring the question.<br><span>MindLarp is ready.</span></h2><p>Chat with Sol 1, create an API key, and make your first request.</p><div class="button-row"><a href="/chat" class="button button-primary">Start chat ${icon('arrow')}</a><a href="/console" class="button button-ghost">Open console</a></div><div class="console-cta-word" aria-hidden="true">M_</div></section>`;
  return publicLayout({ title: 'The open intelligence model family', description: 'Meet MindLarp Sol 1 Plus and Sol 1 Max: two AI models for everyday work and deeper reasoning. Start a chat or build with one simple API.', path: '/', content, bodyClass: 'home-page' });
}

export function modelsPage() {
  const rows = models.map((model) => `<a class="model-row" href="/models/${model.slug}"><span class="model-row-index">${model.index}</span><div><h2>${model.name}</h2><p>${model.description}</p></div><div class="model-row-meta"><span>${model.context} context</span><span>${model.latency}</span></div>${icon('arrow')}</a>`).join('');
  const content = `<section class="page-hero"><span class="section-kicker">THE MINDLARP FAMILY</span><h1>Choose your<br>way of thinking<span class="accent-dot">.</span></h1><p>Two models. One coherent family. Each is tuned for a different balance of speed, capability, and depth.</p></section><section class="model-list">${rows}</section><section class="section comparison-section"><span class="section-kicker">AT A GLANCE</span><h2>Compare the family.</h2><div class="table-wrap"><table class="comparison-table"><thead><tr><th>Model</th><th>Best for</th><th>Context</th><th>Input / 1M</th><th>Output / 1M</th></tr></thead><tbody>${models.map((m) => `<tr><td><a href="/models/${m.slug}">${m.name}</a></td><td>${m.latency}</td><td>${m.context}</td><td>${m.inputPrice}</td><td>${m.outputPrice}</td></tr>`).join('')}</tbody></table></div></section>`;
  return publicLayout({ title: 'Models', path: '/models', content });
}

export function modelPage(model) {
  const content = `<section class="model-detail-hero"><div><a href="/models" class="back-link">← All models</a><span class="section-kicker">${model.eyebrow}</span><h1>${model.name}<span class="accent-dot">.</span></h1><p>${model.longDescription}</p><div class="button-row"><a href="/console/keys" class="button button-primary">Use ${model.shortName} ${icon('arrow')}</a><a href="/docs/api-reference" class="button button-ghost">API reference</a></div></div>${modelArtwork(model, true)}</section>
  <section class="model-specs"><div><span>CONTEXT WINDOW</span><strong>${model.context}</strong><small>tokens</small></div><div><span>INPUT</span><strong>${model.inputPrice}</strong><small>per 1M tokens</small></div><div><span>OUTPUT</span><strong>${model.outputPrice}</strong><small>per 1M tokens</small></div><div><span>LATENCY</span><strong class="spec-text">${model.latency}</strong><small>response profile</small></div></section>
  <section class="section"><div class="section-heading"><div><span class="section-kicker">CAPABILITIES</span><h2>Made for the whole task.</h2></div></div><div class="capability-grid">${model.capabilities.map((capability, i) => `<div><span>0${i + 1}</span><h3>${capability}</h3><p>${['Generate clear, useful text that stays aligned with your instructions and tone.', 'Connect models to your tools with structured, reliable function calls.', 'Get valid structured output that fits naturally into your application.', 'Deliver answers token by token for fast, responsive experiences.'][i]}</p></div>`).join('')}</div></section>
  <section class="section"><div class="section-heading"><div><span class="section-kicker">MAKE A REQUEST</span><h2>Meet ${model.shortName} in code.</h2></div></div><div class="code-window"><div class="code-toolbar"><span>request.sh</span><button class="copy-button js-copy" data-copy-target="model-code" type="button">${icon('copy')} Copy</button></div><pre id="model-code"><code>curl https://api.mindlarp.ai/v1/chat/completions \\
  -H <span class="code-green">"Authorization: Bearer $MINDLARP_API_KEY"</span> \\
  -H <span class="code-green">"Content-Type: application/json"</span> \\
  -d <span class="code-green">'{
    "model": "${model.id}",
    "messages": [{"role": "user", "content": "Explain your approach."}]
  }'</span></code></pre></div></section>
  <section class="model-next"><span>NOT SURE WHICH TO CHOOSE?</span><h2>Start with Plus.<br>Move up to Max.</h2><a href="/models" class="text-link">Compare all models ${icon('arrow')}</a></section>`;
  return publicLayout({ title: model.name, description: model.description, path: `/models/${model.slug}`, content });
}

export function pricingPage() {
  const content = `<section class="page-hero"><span class="section-kicker">SIMPLE, USAGE-BASED PRICING</span><h1>Pay for thinking.<br>Nothing else<span class="accent-dot">.</span></h1><p>Start free, pay for the tokens you use, and manage an optional subscription securely with Stripe.</p></section><section class="pricing-grid">${models.map((model) => `<article class="pricing-card ${model.slug === 'sol-1-plus' ? 'featured' : ''}"><span class="micro-label">${model.eyebrow}</span><h2>${model.shortName}</h2><p>${model.description}</p><div class="price-line"><span>Input</span><strong>${model.inputPrice}<small> / 1M tokens</small></strong></div><div class="price-line"><span>Output</span><strong>${model.outputPrice}<small> / 1M tokens</small></strong></div><a href="/console/keys" class="button ${model.slug === 'sol-1-plus' ? 'button-primary' : 'button-ghost'}">Build with ${model.shortName} ${icon('arrow')}</a></article>`).join('')}</section><section class="section faq-section"><span class="section-kicker">QUESTIONS, ANSWERED</span><h2>The useful details.</h2><details><summary>How does token billing work? ${icon('plus')}</summary><p>You are billed separately for input and output tokens. Cached input, when available, appears as a separate line item in usage.</p></details><details><summary>Can I set spending limits? ${icon('plus')}</summary><p>Workspace-level usage is visible in the console. Key expiration and scoped permissions help limit access.</p></details><details><summary>Is there a free tier? ${icon('plus')}</summary><p>New workspaces can explore the platform with trial capacity. Production usage is billed according to the rates above.</p></details></section>`;
  return publicLayout({ title: 'Pricing', path: '/pricing', content });
}

export function changelogPage() {
  const content = `<section class="page-hero compact"><span class="section-kicker">CHANGELOG</span><h1>New thoughts.<br>Better thinking.</h1></section><section class="changelog-list"><article><time datetime="2026-11-07">NOV 07, 2026</time><span class="release-tag">MAJOR</span><h2>Meet the MindLarp Sol 1 family.</h2><p>Our first coherent family of models is here: Sol 1 Plus for everyday intelligence and Sol 1 Max for your most demanding work.</p><ul><li>Two production model identifiers</li><li>Function calling and structured JSON output</li><li>Streaming chat completions</li><li>Workspace console with scoped API keys</li></ul></article><article><time datetime="2026-11-07">NOV 07, 2026</time><span class="release-tag">PLATFORM</span><h2>A clearer developer console.</h2><p>Manage credentials, understand usage, and configure your workspace without losing your train of thought.</p></article></section>`;
  return publicLayout({ title: 'Changelog', path: '/changelog', content });
}

export function legalPage() {
  const content = `<article class="prose-page"><span class="section-kicker">LEGAL & PRIVACY</span><h1>Plain language.<br>Clear boundaries.</h1><p class="lead">This starter policy explains how the MindLarp website and console handle account and usage data. Review it with legal counsel before a public launch.</p><h2>Account data</h2><p>MindLarp stores the name and email address used to create your workspace. Passwords and session tokens are stored only as cryptographic hashes.</p><h2>API credentials</h2><p>Full API keys are displayed once at creation. Only a cryptographic hash, prefix, and last four characters are retained. Revoking a key prevents future use.</p><h2>Usage data</h2><p>The console records request metadata such as model, status, timestamp, and token counts to provide usage reporting. Configure retention and production privacy terms before accepting customer traffic.</p><h2>Data control</h2><p>You may revoke credentials and sign out of sessions at any time. For account or data questions, contact <a href="mailto:privacy@mindlarp.ai">privacy@mindlarp.ai</a>.</p><h2>Acceptable use</h2><p>Do not use the service to break the law, harm others, compromise systems, or infringe intellectual property rights. Keep credentials private and use appropriate safeguards in your application.</p></article>`;
  return publicLayout({ title: 'Legal & privacy', path: '/legal', content });
}

export function statusPage() {
  const content = `<section class="page-hero compact"><span class="section-kicker">SYSTEM STATUS</span><h1>A clear view<br>of the system.</h1><p><span class="status-dot"></span> Local website and console operational</p></section><section class="status-list"><div><span><span class="status-dot"></span> Website</span><strong>Operational</strong></div><div><span><span class="status-dot"></span> Console</span><strong>Operational</strong></div><div><span><span class="status-dot"></span> Authentication</span><strong>Operational</strong></div><div><span><span class="status-dot"></span> Model inference</span><strong class="muted">Requires API configuration</strong></div></section>`;
  return publicLayout({ title: 'System status', path: '/status', content });
}

export function notFoundContent() {
  return `<section class="not-found"><span class="section-kicker">ERROR / 404</span><h1>Lost train<br>of thought<span class="accent-dot">.</span></h1><p>This page does not exist. The idea might still be out there.</p><a class="button button-primary" href="/">Back to home ${icon('arrow')}</a></section>`;
}

export function notFoundPage() {
  return publicLayout({ title: 'Page not found', path: '', content: notFoundContent() });
}

export function authContent({ mode, error = '', notice = '', values = {} }) {
  const setup = mode === 'setup';
  const register = mode === 'register';
  const login = mode === 'login';
  const action = `/actions/auth/${mode}`;
  const heading = setup ? 'Create the owner account' : register ? 'Create your account' : 'Sign in to MindLarp';
  const googleIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.7 4.7 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.4 2.9-7.5Z"/><path fill="currentColor" d="M12 22c2.7 0 5-.9 6.6-2.3l-3.3-2.6c-.9.6-2 1-3.3 1a5.9 5.9 0 0 1-5.5-4H3.3v2.6A10 10 0 0 0 12 22Z" opacity=".75"/><path fill="currentColor" d="M6.5 14a6 6 0 0 1 0-3.9V7.5H3.3a10 10 0 0 0 0 9l3.2-2.6Z" opacity=".55"/><path fill="currentColor" d="M12 6a5.4 5.4 0 0 1 3.8 1.5l2.9-2.9A10 10 0 0 0 3.3 7.5l3.2 2.6A5.9 5.9 0 0 1 12 6Z" opacity=".9"/></svg>';
  const githubIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 .8a11.4 11.4 0 0 0-3.6 22.2c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.4-1.3-5.4-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.5 4.3 18.5 4.6 18.5 4.6c.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.4 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A11.4 11.4 0 0 0 12 .8Z"/></svg>';
  const oauth = login || register ? `<div class="oauth-divider">OR CONTINUE WITH</div><div class="oauth-buttons"><a class="oauth-button" href="/auth/google">${googleIcon} Google</a><a class="oauth-button" href="/auth/github">${githubIcon} GitHub</a></div>` : '';
  const content = `<section class="auth-shell"><div class="auth-aside"><a href="/" class="auth-back">← Back to MindLarp</a><div><span class="section-kicker">YOUR WORKSPACE</span><h1>A place for<br>your next idea<span class="accent-dot">.</span></h1></div><p>One account. Every model.<br>Chat, API, usage, and billing.</p></div><div class="auth-form-wrap"><form class="auth-form" method="post" action="${action}"><span class="section-kicker">${setup ? 'FIRST TIME SETUP' : register ? 'JOIN MINDLARP' : 'WELCOME BACK'}</span><h2>${heading}</h2><p>${setup ? 'The first account owns this MindLarp instance.' : register ? 'Create an account to chat and build with the API.' : 'Use your password or a connected social account.'}</p>${error ? `<div class="alert error" role="alert">${escapeHtml(error)}</div>` : ''}${notice ? `<div class="alert success" role="status">${escapeHtml(notice)}</div>` : ''}${!login ? `<label>Your name<input type="text" name="displayName" autocomplete="name" required maxlength="80" value="${escapeHtml(values.displayName || '')}" placeholder="Ada Lovelace"></label>` : ''}<label>Email address<input type="email" name="email" autocomplete="email" required maxlength="254" value="${escapeHtml(values.email || '')}" placeholder="you@company.com"></label><label>Password<input type="password" name="password" autocomplete="${login ? 'current-password' : 'new-password'}" required minlength="12" placeholder="${login ? 'Your password' : 'At least 12 characters'}"></label>${!login ? '<label>Confirm password<input type="password" name="confirmPassword" autocomplete="new-password" required minlength="12" placeholder="Repeat your password"></label>' : ''}<button class="button button-primary button-full" type="submit">${setup ? 'Create workspace' : register ? 'Create account' : 'Sign in'} ${icon('arrow')}</button>${oauth}<p class="auth-switch">${login ? '<a href="/forgot-password">Forgot password?</a><br>New to MindLarp? <a href="/register">Create an account</a>' : 'Already registered? <a href="/login">Sign in</a>'}</p><p class="auth-hint">OAuth buttons require provider credentials on the server. Passwords always remain optional for social accounts.</p></form></div></section>`;
  return content;
}

export function authPage(options) {
  const title = options.mode === 'setup' ? 'Set up workspace' : options.mode === 'register' ? 'Create account' : 'Sign in';
  return publicLayout({ title, path: '/console', content: authContent(options), bodyClass: 'auth-page' });
}

export function forgotPasswordPage({ error = '', notice = '', email = '' } = {}) {
  const content = `<section class="auth-shell"><div class="auth-aside"><a href="/" class="auth-back">← Back to MindLarp</a><div><span class="section-kicker">ACCOUNT RECOVERY</span><h1>Back to<br>your next idea<span class="accent-dot">.</span></h1></div><p>A secure, one-time link.<br>Valid for 30 minutes.</p></div><div class="auth-form-wrap"><form class="auth-form" method="post" action="/actions/auth/forgot-password"><span class="section-kicker">RESET PASSWORD</span><h2>Recover your account</h2><p>Enter your account email. If it matches an account, we will send password reset instructions.</p>${error ? `<div class="alert error" role="alert">${escapeHtml(error)}</div>` : ''}${notice ? `<div class="alert success" role="status">${escapeHtml(notice)}</div>` : ''}<label>Email address<input type="email" name="email" autocomplete="email" required maxlength="254" value="${escapeHtml(email)}" placeholder="you@company.com"></label><button class="button button-primary button-full" type="submit">Send reset link ${icon('arrow')}</button><p class="auth-switch">Remembered your password? <a href="/login">Sign in</a></p></form></div></section>`;
  return publicLayout({ title: 'Recover account', path: '/forgot-password', content, bodyClass: 'auth-page' });
}

export function resetPasswordPage({ token = '', error = '' } = {}) {
  const content = `<section class="auth-shell"><div class="auth-aside"><a href="/" class="auth-back">← Back to MindLarp</a><div><span class="section-kicker">ACCOUNT RECOVERY</span><h1>A fresh start.<br>Same workspace<span class="accent-dot">.</span></h1></div><p>Choose a strong password.<br>Existing sessions will be signed out.</p></div><div class="auth-form-wrap"><form class="auth-form" method="post" action="/actions/auth/reset-password"><span class="section-kicker">NEW PASSWORD</span><h2>Choose a new password</h2><p>Use at least 12 characters. This reset link can only be used once.</p>${error ? `<div class="alert error" role="alert">${escapeHtml(error)}</div>` : ''}<input type="hidden" name="token" value="${escapeHtml(token)}"><label>New password<input type="password" name="password" autocomplete="new-password" required minlength="12" maxlength="1024" placeholder="At least 12 characters"></label><label>Confirm new password<input type="password" name="confirmPassword" autocomplete="new-password" required minlength="12" maxlength="1024" placeholder="Repeat your password"></label><button class="button button-primary button-full" type="submit">Update password ${icon('arrow')}</button><p class="auth-switch"><a href="/forgot-password">Request a new reset link</a></p></form></div></section>`;
  return publicLayout({ title: 'Choose a new password', path: '/reset-password', content, bodyClass: 'auth-page' });
}
