export const CONSENT_STORAGE_KEY = 'mindlarp.consent.v2';
export const CONSENT_VISITOR_KEY = 'mindlarp.visitor.v1';
export const CONSENT_SYNC_KEY = 'mindlarp.consent.synced.v1';
export const CONSENT_POLICY_VERSION = '2026-11-18';
export const CONSENT_CATEGORIES = Object.freeze(['personalData', 'analyticsCookies']);

export const DEFAULT_CONSENT = Object.freeze({
  personalData: false,
  analyticsCookies: false,
});

const DECISIONS = ['accept_all', 'necessary_only', 'customized'];

export function normalizeConsent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.version !== CONSENT_POLICY_VERSION) return null;
  if (typeof value.savedAt !== 'string' || !Number.isFinite(Date.parse(value.savedAt))) return null;
  const age = Date.now() - Date.parse(value.savedAt);
  if (age < -5 * 60 * 1000 || age > 180 * 24 * 60 * 60 * 1000) return null;
  return {
    personalData: value.personalData === true,
    analyticsCookies: value.analyticsCookies === true,
    decision: DECISIONS.includes(value.decision) ? value.decision : 'customized',
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

export function getVisitorId(storage = globalThis.localStorage, cryptoRef = globalThis.crypto) {
  let id = storage.getItem(CONSENT_VISITOR_KEY);
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return id;

  if (cryptoRef?.randomUUID) {
    id = cryptoRef.randomUUID();
  } else {
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
      const random = Math.random() * 16 | 0;
      return (character === 'x' ? random : (random & 0x3 | 0x8)).toString(16);
    });
  }

  storage.setItem(CONSENT_VISITOR_KEY, id);
  return id;
}

export function saveConsent(choice, {
  storage = globalThis.localStorage,
  eventTarget = globalThis.window,
  now = new Date(),
  decision = 'customized',
} = {}) {
  const record = {
    personalData: choice?.personalData === true,
    analyticsCookies: choice?.analyticsCookies === true,
    decision: DECISIONS.includes(decision) ? decision : 'customized',
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

export async function syncConsentToServer(record, {
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!fetchImpl) throw new Error('Fetch is unavailable.');
  const visitorId = getVisitorId(storage);
  if (storage.getItem(CONSENT_SYNC_KEY) === record.savedAt) return { skipped: true };

  const response = await fetchImpl('/api/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
    body: JSON.stringify({
      visitorId,
      personalData: record.personalData,
      analyticsCookies: record.analyticsCookies,
      decision: record.decision,
      version: record.version,
    }),
  });

  if (!response.ok) throw new Error('Consent preferences were not stored on the server.');
  const result = await response.json();
  if (result?.ok !== true) throw new Error('Consent storage returned an invalid response.');
  storage.setItem(CONSENT_SYNC_KEY, record.savedAt);
  return result;
}

export function loadConsentedScripts(documentRef = globalThis.document) {
  if (!documentRef) return;
  const origin = documentRef.location?.origin || globalThis.location?.origin;
  if (!origin) return;

  // Remove managed script elements when their category is no longer allowed.
  // Removing a script element cannot undo code that has already executed; integrations
  // must also handle the revocation event and delete any data they control.
  for (const script of documentRef.querySelectorAll('script[data-consent-managed="true"]')) {
    const category = script.dataset.consentCategory;
    if (hasConsent(category)) continue;
    script.remove();
    for (const placeholder of documentRef.querySelectorAll('script[data-consent-category][data-consent-src]')) {
      if (placeholder.dataset.consentCategory === category) placeholder.dataset.consentLoaded = 'false';
    }
    try {
      globalThis.window?.dispatchEvent(new CustomEvent('mindlarp:consent-revoked', { detail: { category } }));
    } catch {
      // Revocation remains saved even when custom events are unavailable.
    }
  }

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
    script.dataset.consentManaged = 'true';
    script.dataset.consentCategory = category;
    if (placeholder.dataset.consentType === 'module') script.type = 'module';
    placeholder.dataset.consentLoaded = 'true';
    placeholder.after(script);
  }
}
