import { notFoundPage } from '@/src/views/public.js';

export const metadata = { title: 'Page not found', robots: { index: false, follow: false } };

export default function NotFound() {
  return notFoundPage();
}
