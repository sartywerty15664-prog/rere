import { modelsPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Models', 'Explore MindLarp Sol 1 Plus and Sol 1 Max.', '/models');

export default function Page() {
  return modelsPage();
}
