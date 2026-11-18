import { escapeHtml, icon } from '../html.js';
import { openWebuiUrl } from '../server/config.js';

const navigation = [
  ['Models', '/models'],
  ['Docs', '/docs'],
  ['Pricing', '/pricing'],
  ['Changelog', '/changelog'],
];

const socialLinks = [
  ['GitHub', 'https://github.com/ClodLeGrande'],
  ['YouTube', 'https://www.youtube.com/@ClodLeGrande'],
  ['Hugging Face', 'https://huggingface.co/ClodLeGrande'],
  ['Telegram', 'https://t.me/ClodLeGrande'],
  ['Discord', 'https://discord.com/invite/clodlegrande'],
];

export function brand() {
  return '<span class="brand-mark" aria-hidden="true"><img src="/assets/logo.png" alt="" width="434" height="298"></span><span class="brand-word">mindlarp<span class="brand-cursor">_</span></span>';
}

export function publicLayout({ title, description = 'A family of AI models for clear thinking and ambitious ideas.', path = '/', content, bodyClass = '', nonce = '' }) {
  const siteUrl = (process.env.PUBLIC_URL || 'https://mindlarp.ai').replace(/\/$/, '');
  const canonical = `${siteUrl}${path === '' ? '/' : path}`;
  const noindex = path === '/console' || bodyClass.includes('auth-page') || title === 'Page not found';
  const nav = navigation.map(([label, href]) => {
    const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
    return `<a class="rail-link ${active ? 'active' : ''}" href="${href}" ${active ? 'aria-current="page"' : ''}>${label}</a>`;
  }).join('');
  const socials = socialLinks.map(([label, href]) => `<a href="${href}" target="_blank" rel="noreferrer" aria-label="MindLarp on ${label}">${label} ${icon('arrow')}</a>`).join('');
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization', name: 'MindLarp', url: siteUrl,
    logo: `${siteUrl}/assets/logo.png`, parentOrganization: { '@type': 'Organization', name: 'ClodLeGrande' },
    sameAs: socialLinks.map(([, href]) => href),
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07070d">
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="MindLarp">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="en_US">
  <meta property="og:title" content="${escapeHtml(title)} · MindLarp">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${siteUrl}/assets/og.svg">
  <meta property="og:image:alt" content="MindLarp — the open intelligence model family">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)} · MindLarp">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${siteUrl}/assets/og.svg">
  <title>${escapeHtml(title)} · MindLarp</title>
  <link rel="icon" href="/assets/logo.png" type="image/png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="stylesheet" href="/assets/style.css">
  <script type="application/ld+json" nonce="${nonce}">${structuredData}</script>
  <script type="module" src="/bootstrap.js" nonce="${nonce}"></script>
</head>
<body class="public-page ${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="announcement"><span><span class="status-dot"></span> SOL 1 SERIES / NOW AVAILABLE</span><a href="/changelog">READ THE RELEASE NOTES ${icon('arrow')}</a></div>
  <header class="public-header">
    <a href="/" class="brand" aria-label="MindLarp home">${brand()}</a>
    <button class="icon-button nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false">${icon('menu')}</button>
    <aside class="public-rail"><nav class="rail-nav" aria-label="Main navigation">${nav}</nav><div class="rail-bottom"><a class="header-console" href="/console">Console</a><a class="button button-primary header-chat" href="/chat">Start chat ${icon('arrow')}</a></div></aside>
  </header>
  <main id="main" class="public-main">${content}</main>
  <footer class="public-footer">
    <div class="footer-top"><div><a href="/" class="brand">${brand()}</a><p>Two models. One API.<br>Intelligence for whatever comes next.</p></div><a href="/chat" class="button button-primary">Start a conversation ${icon('arrow')}</a></div>
    <div class="footer-grid">
      <div><span class="footer-label">/ EXPLORE</span><a href="/models">Models</a><a href="/pricing">Pricing</a><a href="/changelog">Changelog</a></div>
      <div><span class="footer-label">/ DEVELOPERS</span><a href="/docs">Documentation</a><a href="/docs/api-reference">API reference</a><a href="/console">Console</a></div>
      <div><span class="footer-label">/ COMPANY</span><a href="mailto:hello@mindlarp.ai">Contact</a><a href="/legal">Legal & privacy</a><a href="/status">System status</a></div>
      <div class="footer-system"><span class="footer-label">/ SYSTEM</span><span class="system-status"><span class="status-dot"></span> Platform online</span><small>Made by ClodLeGrande</small></div>
    </div>
    <div class="footer-socials" aria-label="Social links">${socials}</div>
    <div class="footer-bottom"><span>© ${new Date().getFullYear()} ClodLeGrande</span><span>MINDLARP / CLODLEGRANDE</span></div>
  </footer>
</body>
</html>`;
}

export function consoleLayout({ title, path, content, user, csrf, nonce = '' }) {
  const items = [
    ['/console', 'Overview', 'home'],
    [openWebuiUrl(), 'Chat', 'arrow'],
    ['/console/keys', 'API keys', 'key'],
    ['/console/usage', 'Usage', 'chart'],
    ['/console/billing', 'Billing', 'chart'],
    ['/console/settings', 'Settings', 'settings'],
  ];
  const nav = items.map(([href, label, iconName]) => {
    const active = path === href;
    return `<a href="${href}" class="console-nav-link ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(iconName)} ${label}<span>↗</span></a>`;
  }).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#07070d">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(title)} · MindLarp Console</title>
  <link rel="icon" href="/assets/logo.png" type="image/png">
  <link rel="stylesheet" href="/assets/style.css">
  <script type="module" src="/bootstrap.js" nonce="${nonce}"></script>
</head>
<body class="console-page">
  <a class="skip-link" href="#main">Skip to content</a>
  <aside class="console-sidebar">
    <div class="console-sidebar-head"><a href="/" class="brand">${brand()}</a><span class="console-badge">WORKSPACE / 01</span></div>
    <nav class="console-nav" aria-label="Console navigation">${nav}</nav>
    <div class="console-sidebar-bottom">
      <div class="console-connection"><span class="status-dot"></span> CONNECTED</div>
      <a href="/docs" class="console-nav-link">${icon('arrow')} Documentation</a>
      <form method="post" action="/console/logout"><input type="hidden" name="csrf" value="${csrf}"><button class="console-nav-link logout-button" type="submit">${icon('logout')} Sign out</button></form>
      <div class="user-chip"><span class="avatar">${escapeHtml(user.displayName.slice(0, 1).toUpperCase())}</span><span><strong>${escapeHtml(user.displayName)}</strong><small>${escapeHtml(user.email)}</small></span></div>
    </div>
  </aside>
  <main id="main" class="console-main">${content}</main>
</body>
</html>`;
}
