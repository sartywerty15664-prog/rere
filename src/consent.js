export const CONSENT_STORAGE_KEY = 'mindlarp.consent.v2';
export const CONSENT_POLICY_VERSION = '2026-11-18';
export const CONSENT_CATEGORIES = Object.freeze(['personalData', 'analyticsCookies']);

export const DEFAULT_CONSENT = Object.freeze({
  personalData: false,
  analyticsCookies: false,
});

export function normalizeConsent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== CONSENT_POLICY_VERSION) return null;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return null;
  const age = Date.now() - Date.parse(value.savedAt);
  if (age < -5 * 60 * 1000 || age > 180 * 24 * 60 * 60 * 1000) return null;
  return {
    personalData: value.personalData === true,
    analyticsCookies: value.analyticsCookies === true,
    version: CONSENT_POLICY_VERSION,
    savedAt: value.savedAt,
  };
}

export function readConsent(storage) {
  try {
    const target = storage || globalThis.localStorage;
    return normalizeConsent(JSON.parse(target.getItem(CONSENT_STORAGE_KEY) || 'null'));
  } catch {
    return null;
  }
}

export function hasConsent(category, storage) {
  if (!CONSENT_CATEGORIES.includes(category)) return false;
  return readConsent(storage)?.[category] === true;
}

export function saveConsent(choice, {
  storage = globalThis.localStorage,
  eventTarget = globalThis.window,
  now = new Date(),
} = {}) {
  const record = {
    personalData: choice?.personalData === true,
    analyticsCookies: choice?.analyticsCookies === true,
    version: CONSENT_POLICY_VERSION,
    savedAt: now.toISOString(),
  };
  storage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  try {
    eventTarget?.dispatchEvent(new CustomEvent('mindlarp:consent-change', { detail: { ...record } }));
  } catch {
    // The saved preference remains valid where CustomEvent is unavailable.
  }
  return record;
}

export function loadConsentedScripts(documentRef = globalThis.document) {
  if (!documentRef) return;
  const origin = documentRef.location?.origin || globalThis.location?.origin;
  if (!origin) return;

  for (const placeholder of documentRef.querySelectorAll('script[data-consent-category][data-consent-src]')) {
    const category = placeholder.dataset.consentCategory;
    if (!hasConsent(category) || placeholder.dataset.consentLoaded === 'true') continue;

    let parsed;
    try {
      parsed = new URL(placeholder.dataset.consentSrc, origin);
    } catch {
      continue;
    }
    if (parsed.origin !== origin) continue;

    const script = documentRef.createElement('script');
    script.src = parsed.href;
    script.async = true;
    if (placeholder.dataset.consentType === 'module') script.type = 'module';
    placeholder.dataset.consentLoaded = 'true';
    placeholder.after(script);
  }
}
