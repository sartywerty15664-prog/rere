import { privacyPage } from '@/src/views/legal.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Privacy Policy', 'How MindLarp collects, processes, stores, and protects personal data.', '/privacy');

export default function Page() {
  return privacyPage('en');
}
