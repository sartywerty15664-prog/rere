import { randomUUID } from 'node:crypto';
import { getStore } from './store.js';
import { planDailyLimit, planForPriceId } from './plans.js';

export function getUsageStats(store, userId, days, now = Date.now()) {
  const current = new Date(now);
  const start = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - days + 1);
  const events = store.data.usage.filter((event) => event.userId === userId && Date.parse(event.createdAt) >= start.getTime());
  const daily = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + offset);
    const key = date.toISOString().slice(0, 10);
    daily.push({ key, label: date.toISOString().slice(0, 10), shortLabel: new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date), requests: events.filter((event) => event.createdAt.slice(0, 10) === key).length });
  }
  const byModel = new Map();
  for (const event of events) {
    if (!event.model) continue;
    const item = byModel.get(event.model) || { model: event.model, requests: 0, tokens: 0 };
    item.requests += 1;
    item.tokens += event.totalTokens || 0;
    byModel.set(event.model, item);
  }
  const requests = events.length;
  const successful = events.filter((event) => event.status >= 200 && event.status < 400).length;
  const activeKeys = store.data.keys.filter((key) => key.userId === userId && !key.revokedAt && (!key.expiresAt || Date.parse(key.expiresAt) > now)).length;
  return { requests, activeKeys, successRate: requests ? Math.round((successful / requests) * 1000) / 10 : 0, promptTokens: events.reduce((sum, event) => sum + (event.promptTokens || 0), 0), completionTokens: events.reduce((sum, event) => sum + (event.completionTokens || 0), 0), tokens: events.reduce((sum, event) => sum + (event.totalTokens || 0), 0), daily, models: [...byModel.values()].sort((a, b) => b.requests - a.requests) };
}

export async function reserveInferenceAccess(userId, endpoint) {
  const store = await getStore();
  const reservationId = randomUUID();
  const now = new Date();
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);
  let error = null;

  await store.update((data) => {
    const user = data.users.find((item) => item.id === userId);
    if (!user) {
      error = [401, 'The account for this credential no longer exists.', 'authentication_error', 'invalid_account'];
      return;
    }

    const subscribed = ['active', 'trialing'].includes(user.billing?.status);
    if (!subscribed && process.env.ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION !== 'true') {
      error = [403, 'An active subscription is required for model inference.', 'permission_error', 'inference_access_denied'];
      return;
    }

    const plan = planForPriceId(user.billing?.priceId);
    const dailyLimit = plan ? planDailyLimit(plan) : Number(process.env.INFERENCE_DAILY_REQUEST_LIMIT || 0);
    if (dailyLimit > 0) {
      const requests = data.usage.filter((event) => event.userId === userId
        && ['/chat', '/v1/chat/completions'].includes(event.endpoint)
        && Date.parse(event.createdAt) >= start.getTime()).length;
      if (requests >= dailyLimit) {
        error = [429, 'The daily inference request limit for this account has been reached.', 'rate_limit_error', 'inference_quota_exceeded'];
        return;
      }
    }

    // Reserve quota inside the same serializable store transaction as the
    // count. Concurrent requests therefore cannot all pass a stale pre-check.
    data.usage.unshift({
      id: reservationId,
      keyId: null,
      userId,
      endpoint,
      model: null,
      status: 102,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      createdAt: now.toISOString(),
    });
  });

  return { error, reservationId: error ? null : reservationId };
}

export async function getInferenceAccessError(userId) {
  const result = await reserveInferenceAccess(userId, '/v1/chat/completions');
  return result.error;
}

export async function recordUsage({ key = null, userId = null, endpoint, model = null, status, usage = null, reservationId = null }) {
  const store = await getStore();
  const event = { id: randomUUID(), keyId: key?.id || null, userId: key?.userId || userId, endpoint, model, status, promptTokens: usage?.prompt_tokens || 0, completionTokens: usage?.completion_tokens || 0, totalTokens: usage?.total_tokens || 0, createdAt: new Date().toISOString() };

  if (reservationId) {
    await store.update((data) => {
      const reserved = data.usage.find((item) => item.id === reservationId && item.userId === event.userId && item.status === 102);
      if (!reserved) return;
      Object.assign(reserved, event, { id: reservationId });
    });
    return;
  }

  await store.appendUsageEvent(event);
}
