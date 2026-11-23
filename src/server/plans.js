import { plans } from '../content.js';

export function acceptedStripePriceIds() {
  return [process.env.STRIPE_PRICE_ID, ...plans.map((plan) => process.env[plan.priceEnv])].filter(Boolean);
}

export function planForPriceId(priceId) {
  if (!priceId) return null;
  return plans.find((plan) => process.env[plan.priceEnv] && process.env[plan.priceEnv] === priceId) || null;
}

export function planDailyLimit(plan) {
  const configured = Number(process.env[plan.limitEnv]);
  return Number.isInteger(configured) && configured > 0 ? configured : plan.dailyLimit;
}
