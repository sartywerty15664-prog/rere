import { headers } from 'next/headers';
import { consoleLayout, publicLayout } from '../views/layout.js';

export async function htmlResponse(content, title, status = 200, { user, csrf, path = '', bodyClass = '' } = {}) {
  const nonce = (await headers()).get('x-nonce') || '';
  const markup = user
    ? consoleLayout({ title, path, content, user, csrf, nonce })
    : publicLayout({ title, path, content, bodyClass, nonce });
  return new Response(markup, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}
