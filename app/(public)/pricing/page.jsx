import { pricingPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Pricing', 'Launch pricing for the MindLarp model family. All models are currently free.', '/pricing');

export default function Page() {
  return pricingPage();
}
