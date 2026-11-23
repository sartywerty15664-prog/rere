import { privacyEn } from './privacy.en.js';
import { privacyRu } from './privacy.ru.js';
import { termsEn } from './terms.en.js';
import { termsRu } from './terms.ru.js';

export const supportEmail = 'hello@mindlarp.ai';

export function privacyDocument(lang = 'en') {
  return lang === 'ru' ? privacyRu : privacyEn;
}

export function termsDocument(lang = 'en') {
  return lang === 'ru' ? termsRu : termsEn;
}

export const legalUi = {
  en: { languageLabel: 'Document language' },
  ru: { languageLabel: 'Язык документа' },
};
