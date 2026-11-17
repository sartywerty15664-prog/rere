import { getStore } from './store.js';
import { hashToken, safeEqual } from '../security.js';

export async function apiKeyAuth(request, scope) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return { error: [401, 'Missing bearer API key.', 'authentication_error', 'missing_api_key'] };
  const secret = header.slice(7).trim();
  const store = await getStore();
  const key = store.data.keys.find((item) => safeEqual(item.hash, hashToken(secret)));
  if (!key || key.revokedAt || (key.expiresAt && Date.parse(key.expiresAt) <= Date.now())) return { error: [401, 'Invalid or expired API key.', 'authentication_error', 'invalid_api_key'] };
  if (!key.scopes.includes(scope)) return { error: [403, `This key lacks the ${scope} scope.`, 'permission_error', 'insufficient_scope'] };
  if (!key.lastUsedAt || Date.now() - Date.parse(key.lastUsedAt) > 60_000) {
    await store.update((data) => {
      const stored = data.keys.find((item) => item.id === key.id);
      if (stored) stored.lastUsedAt = new Date().toISOString();
    });
  }
  return { key };
}
