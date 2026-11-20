import { redirect } from 'next/navigation';
import { publicLayout } from '@/src/views/layout.jsx';
import { escapeHtml } from '@/src/html.js';
import { getCurrentAuth } from '@/src/server/auth.js';
import { getStore } from '@/src/server/store.js';

export const metadata = { title: 'Sign in', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const store = await getStore();
  if (!store.data.users.length) redirect('/setup');
  if (await getCurrentAuth()) redirect('/console');

  const query = await searchParams;
  const errors = {
    oauth: 'Social sign-in could not be completed. Try again.',
    google: 'Google sign-in is not configured on this server.',
    github: 'GitHub sign-in is not configured on this server.',
  };
  const error = errors[query.error] || '';
  const content = `<section class="auth-shell">
    <div class="auth-aside">
      <a href="/" class="auth-back">← Back to MindLarp</a>
      <div><span class="section-kicker">YOUR WORKSPACE</span><h1>A place for<br>your next idea<span class="accent-dot">.</span></h1></div>
      <p>One account. Every model.<br>Chat, API, usage, and billing.</p>
    </div>
    <div class="auth-form-wrap"><div class="auth-form">
      <span class="section-kicker">WELCOME BACK</span>
      <h2>Sign in to MindLarp</h2>
      <p>Continue securely with a connected account.</p>
      ${error ? `<div class="alert error" role="alert">${escapeHtml(error)}</div>` : ''}
      <div class="oauth-buttons">
        <a class="oauth-button" href="/auth/google">Google</a>
        <a class="oauth-button" href="/auth/github">GitHub</a>
      </div>
      <p class="auth-hint">Email and password sign-in are no longer available.</p>
    </div></div>
  </section>`;
  return publicLayout({ title: 'Sign in', path: '/console', content, bodyClass: 'auth-page' });
}
