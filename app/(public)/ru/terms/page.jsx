import { termsPage } from '@/src/views/legal.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Пользовательское соглашение', 'Публичная оферта MindLarp: условия предоставления услуг, оплата, возвраты и ответственность.', '/ru/terms', 'ru_RU');

export default function Page() {
  return termsPage('ru');
}
