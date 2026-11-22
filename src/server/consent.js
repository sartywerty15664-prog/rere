import { createHmac } from 'node:crypto';
import { CONSENT_VERSION } from '../consent.js';
import { safeEqual } from '../security.js';

function consentSecret() {
  return process.env.MINDLARP_CONSENT_SECRET || process.env.DATABASE_URL || '';
}

export function createPersonalDataConsent() {
  const secret = consentSecret();
  if (!secret) throw new Error('A server-side consent signing secret is required.');
  const signature = createHmac('sha256', secret)
    .update(`personal-data:${CONSENT_VERSION}`)
    .digest('base64url');
  return `${CONSENT_VERSION}.${signature}`;
}

export function hasPersonalDataConsent(value) {
  const secret = consentSecret();
  if (!secret || typeof value !== 'string') return false;
  const expected = createHmac('sha256', secret)
    .update(`personal-data:${CONSENT_VERSION}`)
    .digest('base64url');
  return safeEqual(value, `${CONSENT_VERSION}.${expected}`);
}
