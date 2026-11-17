import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONSENT_STORAGE_KEY,
  CONSENT_SYNC_KEY,
  CONSENT_VISITOR_KEY,
  CONSENT_POLICY_VERSION,
  DEFAULT_CONSENT,
  getVisitorId,
  hasConsent,
  normalizeConsent,
  readConsent,
  saveConsent,
  syncConsentToServer,
} from '../src/consent.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test('consent defaults to denied and unknown categories are never granted', () => {
  const storage = memoryStorage();
  assert.equal(readConsent(storage), null);
  assert.equal(hasConsent('analyticsCookies', storage), false);
  assert.equal(hasConsent('unknown', storage), false);
  assert.deepEqual(DEFAULT_CONSENT, { personalData: false, analyticsCookies: false });
});

test('consent preferences persist independently and can be read back', () => {
  const storage = memoryStorage();
  const savedAt = new Date('2026-11-17T12:00:00.000Z');
  const record = saveConsent(
    { personalData: true, analyticsCookies: false },
    { storage, eventTarget: null, now: savedAt, decision: 'customized' },
  );

  assert.equal(record.version, CONSENT_POLICY_VERSION);
  assert.equal(record.personalData, true);
  assert.equal(record.analyticsCookies, false);
  assert.equal(record.decision, 'customized');
  assert.equal(hasConsent('personalData', storage), true);
  assert.equal(hasConsent('analyticsCookies', storage), false);
  assert.equal(JSON.parse(storage.getItem(CONSENT_STORAGE_KEY)).savedAt, savedAt.toISOString());
});

test('old, malformed, and expired choices are rejected', () => {
  assert.equal(normalizeConsent(null), null);
  assert.equal(normalizeConsent({ version: 'old', savedAt: new Date().toISOString() }), null);
  assert.equal(normalizeConsent({ version: CONSENT_POLICY_VERSION, savedAt: 'not-a-date' }), null);
  assert.equal(normalizeConsent({
    version: CONSENT_POLICY_VERSION,
    savedAt: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(),
    personalData: true,
    analyticsCookies: true,
  }), null);
});

test('storage failures do not produce a successful consent record', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('blocked'); } };
  assert.throws(() => saveConsent({ analyticsCookies: true }, { storage, eventTarget: null }));
});

test('browser identifier is generated once and reused', () => {
  const storage = memoryStorage();
  const expected = '2b7e1516-28ae-4f3c-ae2d-123456789abc';
  const cryptoRef = { randomUUID: () => expected };
  assert.equal(getVisitorId(storage, cryptoRef), expected);
  assert.equal(getVisitorId(storage, { randomUUID: () => 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa' }), expected);
  assert.equal(storage.getItem(CONSENT_VISITOR_KEY), expected);
});

test('server synchronization sends only preference data and marks success', async () => {
  const storage = memoryStorage();
  const savedAt = new Date().toISOString();
  const record = {
    personalData: false,
    analyticsCookies: true,
    decision: 'customized',
    version: CONSENT_POLICY_VERSION,
    savedAt,
  };
  const visitorId = '2b7e1516-28ae-4f3c-ae2d-123456789abc';
  storage.setItem(CONSENT_VISITOR_KEY, visitorId);
  let request;

  const result = await syncConsentToServer(record, {
    storage,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true }) };
    },
  });

  assert.deepEqual(result, { ok: true });
  assert.equal(request.url, '/api/consent');
  assert.equal(request.options.method, 'POST');
  assert.equal(request.options.credentials, 'same-origin');
  assert.deepEqual(JSON.parse(request.options.body), {
    visitorId,
    personalData: false,
    analyticsCookies: true,
    decision: 'customized',
    version: CONSENT_POLICY_VERSION,
  });
  assert.equal(storage.getItem(CONSENT_SYNC_KEY), savedAt);
});

test('failed server synchronization does not mark the choice as synced', async () => {
  const storage = memoryStorage();
  storage.setItem(CONSENT_VISITOR_KEY, '2b7e1516-28ae-4f3c-ae2d-123456789abc');
  await assert.rejects(
    syncConsentToServer({
      personalData: false,
      analyticsCookies: false,
      decision: 'necessary_only',
      version: CONSENT_POLICY_VERSION,
      savedAt: new Date().toISOString(),
    }, {
      storage,
      fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    }),
  );
  assert.equal(storage.getItem(CONSENT_SYNC_KEY), null);
});
