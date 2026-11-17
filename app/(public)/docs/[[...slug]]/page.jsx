import { notFound } from 'next/navigation';
import { docsPage, getDocsPage } from '@/src/views/docs.js';
import { pageMetadata } from '@/src/server/metadata.js';

const routes = { '': 'introduction', 'getting-started': 'quickstart', models: 'models', authentication: 'authentication', 'api-reference': 'api', errors: 'errors' };

function pageDetails(slug = []) {
  const key = routes[slug.join('/')];
  return key ? { key, page: getDocsPage(key), path: slug.length ? `/docs/${slug.join('/')}` : '/docs' } : null;
}

export async function generateMetadata({ params }) {
  const details = pageDetails((await params).slug);
  return details ? pageMetadata(details.page.title, details.page.lead, details.path) : {};
}

export default async function Page({ params }) {
  const details = pageDetails((await params).slug);
  if (!details) notFound();
  return docsPage(details.key, details.path);
}
