import { pricingPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Pricing', 'Launch pricing for the MindLarp model family. Models are coming soon and will be free at launch.', '/pricing');

export default function Page() {
  return pricingPage();
}
