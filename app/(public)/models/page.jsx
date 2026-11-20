import { modelsPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Models', 'Explore MindLarp Larp 1 and Larp 1 Code. Coming soon.', '/models');

export default function Page() {
  return modelsPage();
}
