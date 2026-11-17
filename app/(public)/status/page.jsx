import { statusPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('System status', 'Current MindLarp website, console, and model service status.', '/status');

export default function Page() {
  return statusPage();
}
