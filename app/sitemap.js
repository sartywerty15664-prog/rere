import { publicPaths, publicUrl } from '@/src/server/metadata.js';

export const dynamic = 'force-dynamic';

export default function sitemap() {
  return publicPaths.map((path) => ({ url: `${publicUrl()}${path}`, changeFrequency: path === '/' ? 'weekly' : 'monthly', priority: path === '/' ? 1 : 0.8 }));
}
