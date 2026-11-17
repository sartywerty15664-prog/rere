import { notFound } from 'next/navigation';
import { getModel, models } from '@/src/content.js';
import { modelPage } from '@/src/views/public.js';
import { pageMetadata } from '@/src/server/metadata.js';

export function generateStaticParams() {
  return models.map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({ params }) {
  const model = getModel((await params).slug);
  return model ? pageMetadata(model.name, model.description, `/models/${model.slug}`) : {};
}

export default async function Page({ params }) {
  const model = getModel((await params).slug);
  if (!model) notFound();
  return modelPage(model);
}
