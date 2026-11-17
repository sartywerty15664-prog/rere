import { pricingPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Pricing', 'Simple, usage-based pricing for the MindLarp model family.', '/pricing');

export default function Page() {
  return pricingPage();
}
