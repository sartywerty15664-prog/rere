import { homePage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('The open intelligence model family', 'Meet MindLarp Larp 1 and Larp 1 Code: two AI models for everyday work and deeper reasoning. Coming soon — start a chat or build with one simple API.');

export default function Page() {
  return homePage();
}
