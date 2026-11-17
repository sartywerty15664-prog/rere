import { homePage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('The open intelligence model family', 'Meet MindLarp Sol 1 Plus and Sol 1 Max: two AI models for everyday work and deeper reasoning. Start a chat or build with one simple API.');

export default function Page() {
  return homePage();
}
