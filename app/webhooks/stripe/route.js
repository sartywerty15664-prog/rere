import { getStripe } from '@/src/server/config.js';
import { json, readBody } from '@/src/server/responses.js';
import { getStore } from '@/src/server/store.js';

export const runtime = 'nodejs';

export async function POST(request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) return json({ error: 'Stripe webhook is not configured.' }, 503);
  const { text, error } = await readBody(request, 262_144);
  if (error) return error;
  let event;
  try {
    event = stripe.webhooks.constructEvent(text, request.headers.get('stripe-signature') || '', webhookSecret);
  } catch {
    return json({ error: 'Invalid webhook signature.' }, 400);
  }
  const object = event.data.object;
  const supported = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type);
  if (!supported) return json({ received: true });
  if (event.type.startsWith('customer.subscription.') && !object.items?.data?.some((item) => item.price?.id === process.env.STRIPE_PRICE_ID)) {
    return json({ error: 'Unexpected subscription price.' }, 400);
  }
  const store = await getStore();
  const user = store.data.users.find((item) => item.id === object.client_reference_id || item.id === object.metadata?.userId || item.billing?.stripeCustomerId === object.customer);
  if (!user) return json({ received: true });
  if (event.type.startsWith('customer.subscription.') && user.billing?.subscriptionId && user.billing.subscriptionId !== object.id) return json({ received: true });
  if (event.type === 'checkout.session.completed' && user.billing?.subscriptionId === object.subscription && user.billing.status && user.billing.status !== 'pending') return json({ received: true });

  await store.update((data) => {
    const stored = data.users.find((item) => item.id === user.id);
    const billing = stored.billing || {};
    if (billing.processedStripeEventIds?.includes(event.id)) return;
    if (Number.isFinite(event.created) && Number.isFinite(billing.lastStripeEventCreated) && event.created < billing.lastStripeEventCreated) return;
    stored.billing = {
      ...billing,
      stripeCustomerId: String(object.customer || billing.stripeCustomerId || ''),
      subscriptionId: object.subscription || object.id,
      status: event.type === 'checkout.session.completed' ? 'pending' : object.status,
      priceId: object.items?.data?.find((item) => item.price?.id === process.env.STRIPE_PRICE_ID)?.price?.id || billing.priceId || process.env.STRIPE_PRICE_ID,
      currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : billing.currentPeriodEnd || null,
      lastStripeEventCreated: Number.isFinite(event.created) ? Math.max(event.created, billing.lastStripeEventCreated || 0) : billing.lastStripeEventCreated,
      processedStripeEventIds: [event.id, ...(billing.processedStripeEventIds || [])].slice(0, 100),
    };
  });
  return json({ received: true });
}
