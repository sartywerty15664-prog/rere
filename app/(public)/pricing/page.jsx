import { pricingPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Pricing', 'Pricing information for the MindLarp model family. Final prices will be published before launch.', '/pricing');

export default function Page() {
  return pricingPage();
}
