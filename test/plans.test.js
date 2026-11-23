import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedStripePriceIds, planDailyLimit, planForPriceId } from '../src/server/plans.js';

test('subscription price IDs map to the correct plan-specific daily quota', () => {
  const keys = [
    'STRIPE_PRICE_ID', 'STRIPE_PRICE_ID_PRO', 'STRIPE_PRICE_ID_PLUS', 'STRIPE_PRICE_ID_STUDIO',
    'INFERENCE_DAILY_REQUEST_LIMIT_PRO', 'INFERENCE_DAILY_REQUEST_LIMIT_PLUS', 'INFERENCE_DAILY_REQUEST_LIMIT_STUDIO',
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.STRIPE_PRICE_ID = 'price_default_test';
    process.env.STRIPE_PRICE_ID_PRO = 'price_pro_test';
    process.env.STRIPE_PRICE_ID_PLUS = 'price_plus_test';
    process.env.STRIPE_PRICE_ID_STUDIO = 'price_studio_test';
    process.env.INFERENCE_DAILY_REQUEST_LIMIT_PRO = '777';
    delete process.env.INFERENCE_DAILY_REQUEST_LIMIT_PLUS;
    delete process.env.INFERENCE_DAILY_REQUEST_LIMIT_STUDIO;

    assert.deepEqual(acceptedStripePriceIds(), [
      'price_default_test', 'price_pro_test', 'price_plus_test', 'price_studio_test',
    ]);
    assert.equal(planForPriceId('price_pro_test')?.id, 'pro');
    assert.equal(planForPriceId('price_plus_test')?.id, 'plus');
    assert.equal(planForPriceId('price_studio_test')?.id, 'studio');
    assert.equal(planForPriceId('price_unknown_test'), null);
    assert.equal(planDailyLimit(planForPriceId('price_pro_test')), 777);
    assert.equal(planDailyLimit(planForPriceId('price_plus_test')), 2500);
    assert.equal(planDailyLimit(planForPriceId('price_studio_test')), 10000);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
