import { changelogPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Changelog', 'The latest MindLarp models and platform improvements.', '/changelog');

export default function Page() {
  return changelogPage();
}
