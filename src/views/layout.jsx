import { headers } from 'next/headers';
import { StaticContent } from '@/components/static-content.jsx';
import { TrustedController } from '@/components/trusted-controller.jsx';
import { icon } from '../html.js';
import { openWebuiUrl } from '../server/config.js';

export const navigation = [
  ['Models', '/models'],
  ['Docs', '/docs'],
  ['Pricing', '/pricing'],
  ['Changelog', '/changelog'],
];

export const socialLinks = [
  ['GitHub', 'https://github.com/ClodLeGrande'],
  ['YouTube', 'https://www.youtube.com/@ClodLeGrande'],
  ['Hugging Face', 'https://huggingface.co/mindlarp'],
  ['Telegram', 'https://t.me/ClodLeGrande'],
  ['Discord', 'https://discord.com/invite/clodlegrande'],
];

export function Icon({ name, className = '' }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: icon(name) }} />;
}

export function Brand() {
  return <><span className="brand-mark" aria-hidden="true"><img src="/assets/logo.png" alt="" width="434" height="298" /></span><span className="brand-word">mindlarp<span className="brand-cursor">_</span></span></>;
}

function renderContent(content) {
  return typeof content === 'string' ? <StaticContent html={content} /> : content;
}

export async function publicLayout({ path = '/', content, bodyClass = '' }) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  const siteUrl = (process.env.PUBLIC_URL || 'https://mindlarp.ai').replace(/\/$/, '');
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Organization', name: 'MindLarp', url: siteUrl,
    logo: `${siteUrl}/assets/logo.png`, parentOrganization: { '@type': 'Organization', name: 'ClodLeGrande' },
    sameAs: socialLinks.map(([, href]) => href),
  }).replaceAll('<', '\\u003c');

  return <div className={`public-page ${bodyClass}`}>
    <a className="skip-link" href="#main">Skip to content</a>
    <div className="announcement"><span><span className="status-dot" /> LARP 1 SERIES / COMING SOON</span><a href="/changelog">READ THE ANNOUNCEMENT <Icon name="arrow" /></a></div>
    <header className="public-header">
      <a href="/" className="brand" aria-label="MindLarp home"><Brand /></a>
      <button className="icon-button nav-toggle" type="button" aria-label="Toggle navigation" aria-expanded="false"><Icon name="menu" /></button>
      <aside className="public-rail">
        <nav className="rail-nav" aria-label="Main navigation">{navigation.map(([label, href]) => {
          const active = path === href || (href !== '/' && path.startsWith(`${href}/`));
          return <a key={href} className={`rail-link ${active ? 'active' : ''}`} href={href} aria-current={active ? 'page' : undefined}>{label}</a>;
        })}</nav>
        <div className="rail-bottom"><a className="header-console" href="/console">Console</a><a className="button button-primary header-chat" href="/chat">Start chat <Icon name="arrow" /></a></div>
      </aside>
    </header>
    <main id="main" className="public-main">{renderContent(content)}</main>
    <footer className="public-footer">
      <div className="footer-top"><div><a href="/" className="brand"><Brand /></a><p>Two models. One API.<br />Intelligence for whatever comes next.</p></div><a href="/chat" className="button button-primary">Start a conversation <Icon name="arrow" /></a></div>
      <div className="footer-grid">
        <div><span className="footer-label">/ EXPLORE</span><a href="/models">Models</a><a href="/pricing">Pricing</a><a href="/changelog">Changelog</a></div>
        <div><span className="footer-label">/ DEVELOPERS</span><a href="/docs">Documentation</a><a href="/docs/api-reference">API reference</a><a href="/console">Console</a></div>
        <div><span className="footer-label">/ COMPANY</span><a href="mailto:hello@mindlarp.ai">Contact</a><a href="/legal">Legal &amp; privacy</a><a href="/status">System status</a></div>
        <div className="footer-system"><span className="footer-label">/ SYSTEM</span><span className="system-status"><span className="status-dot" /> Platform online</span><small>Made by ClodLeGrande</small></div>
      </div>
      <div className="footer-socials" aria-label="Social links">{socialLinks.map(([label, href]) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`MindLarp on ${label}`}>{label} <Icon name="arrow" /></a>)}</div>
      <div className="footer-bottom"><span>{`© ${new Date().getFullYear()} ClodLeGrande`}</span><span>MINDLARP / CLODLEGRANDE</span></div>
    </footer>
    <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: structuredData }} />
    <TrustedController />
  </div>;
}

export function consoleLayout({ path, content, user, csrf }) {
  const items = [['/console', 'Overview', 'home'], [openWebuiUrl(), 'Chat', 'arrow'], ['/console/keys', 'API keys', 'key'], ['/console/usage', 'Usage', 'chart'], ['/console/billing', 'Billing', 'chart'], ['/console/settings', 'Settings', 'settings']];
  return <div className="console-page">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="console-sidebar">
      <div className="console-sidebar-head"><a href="/" className="brand"><Brand /></a><span className="console-badge">WORKSPACE / 01</span></div>
      <nav className="console-nav" aria-label="Console navigation">{items.map(([href, label, iconName]) => <a key={href} href={href} className={`console-nav-link ${path === href ? 'active' : ''}`} aria-current={path === href ? 'page' : undefined}><Icon name={iconName} /> {label}<span>↗</span></a>)}</nav>
      <div className="console-sidebar-bottom">
        <div className="console-connection"><span className="status-dot" /> CONNECTED</div>
        <a href="/docs" className="console-nav-link"><Icon name="arrow" /> Documentation</a>
        <form method="post" action="/console/logout"><input type="hidden" name="csrf" value={csrf} /><button className="console-nav-link logout-button" type="submit"><Icon name="logout" /> Sign out</button></form>
        <div className="user-chip"><span className="avatar">{user.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{user.displayName}</strong><small>{user.email}</small></span></div>
      </div>
    </aside>
    <main id="main" className="console-main">{renderContent(content)}</main>
  </div>;
}
