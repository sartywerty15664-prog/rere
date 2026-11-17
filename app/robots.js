import { publicUrl } from '@/src/server/config.js';

export const dynamic = 'force-dynamic';

export default function robots() {
  return { rules: { userAgent: '*', allow: '/', disallow: ['/console', '/chat', '/auth'] }, sitemap: `${publicUrl()}/sitemap.xml` };
}
