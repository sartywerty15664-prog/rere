import { legalPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Legal & privacy', 'How MindLarp handles account, credential, and usage data.', '/legal');

export default function Page() {
  return legalPage();
}
