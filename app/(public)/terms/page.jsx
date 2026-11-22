import { termsPage } from '@/src/views/legal.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('User Agreement', 'MindLarp public offer: terms of service, payment, refunds, and liability.', '/terms');

export default function Page() {
  return termsPage('en');
}
