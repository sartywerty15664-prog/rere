import { privacyPage } from '@/src/views/legal.js';
import { pageMetadata } from '@/src/server/metadata.js';

export const metadata = pageMetadata('Политика конфиденциальности', 'Порядок сбора, обработки, хранения и защиты персональных данных пользователей MindLarp.', '/ru/privacy', 'ru_RU');

export default function Page() {
  return privacyPage('ru');
}
