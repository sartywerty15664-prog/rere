import { randomUUID } from 'node:crypto';
import { getStore } from './store.js';

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

export async function getInferenceAccessError(userId) {
  const store = await getStore();
  const user = store.data.users.find((item) => item.id === userId);
  if (!user) return [401, 'The account for this credential no longer exists.', 'authentication_error', 'invalid_account'];

  const subscribed = ['active', 'trialing'].includes(user.billing?.status);
  if (!subscribed && process.env.ALLOW_INFERENCE_WITHOUT_SUBSCRIPTION !== 'true') {
    return [403, 'An active subscription is required for model inference.', 'permission_error', 'inference_access_denied'];
  }

  const dailyLimit = Number(process.env.INFERENCE_DAILY_REQUEST_LIMIT || 0);
  if (dailyLimit > 0) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const requests = store.data.usage.filter((event) => event.userId === userId && ['/chat', '/v1/chat/completions'].includes(event.endpoint) && Date.parse(event.createdAt) >= start.getTime()).length;
    if (requests >= dailyLimit) return [429, 'The daily inference request limit for this account has been reached.', 'rate_limit_error', 'inference_quota_exceeded'];
  }

  return null;
}

export async function recordUsage({ key = null, userId = null, endpoint, model = null, status, usage = null }) {
  const store = await getStore();
  await store.update((data) => {
    const event = { id: randomUUID(), keyId: key?.id || null, userId: key?.userId || userId, endpoint, model, status, promptTokens: usage?.prompt_tokens || 0, completionTokens: usage?.completion_tokens || 0, totalTokens: usage?.total_tokens || 0, createdAt: new Date().toISOString() };
    data.usage.unshift(event);
    const retainedIds = new Set(data.usage.filter((item) => item.userId === event.userId).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, 10000).map((item) => item.id));
    data.usage = data.usage.filter((item) => item.userId !== event.userId || retainedIds.has(item.id));
  });
}
