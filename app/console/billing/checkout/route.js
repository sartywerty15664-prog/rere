import { requireUser, requireCsrf } from '@/src/server/auth.js';
import { billingConfigured, getStripe, publicUrl } from '@/src/server/config.js';
import { htmlResponse } from '@/src/server/html.jsx';
import { billingContent } from '@/src/views/console.js';
import { notFoundContent } from '@/src/views/public.js';
import { formRedirect, readForm } from '@/src/server/responses.js';

export async function POST(request) {
  const auth = await requireUser();
  const { body, error: bodyError } = await readForm(request);
  if (bodyError) return bodyError;
  if (!requireCsrf(Object.fromEntries(body), auth)) return htmlResponse(notFoundContent(), 'Forbidden', 403);
  const { user, session } = auth;
  const stripe = getStripe();
  const options = { user, csrf: session.csrf, path: '/console/billing' };
  if (!billingConfigured()) return htmlResponse(billingContent({ user, csrf: session.csrf, configured: false }), 'Billing', 503, options);
  try {
    const checkout = await stripe.checkout.sessions.create({ mode: 'subscription', line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }], client_reference_id: user.id, customer: user.billing?.stripeCustomerId || undefined, customer_email: user.billing?.stripeCustomerId ? undefined : user.email, success_url: `${publicUrl(new URL(request.url).origin)}/console/billing?checkout=success`, cancel_url: `${publicUrl(new URL(request.url).origin)}/console/billing?checkout=cancelled`, metadata: { userId: user.id }, subscription_data: { metadata: { userId: user.id } } });
    if (!checkout.url) throw new Error('Stripe did not return a checkout URL.');
    return formRedirect(request, checkout.url);
  } catch (error) {
    console.error(`Stripe checkout: ${error.message}`);
    return htmlResponse(billingContent({ user, csrf: session.csrf, configured: billingConfigured(), error: 'Stripe checkout could not be started. Try again or check the server configuration.' }), 'Billing', 502, options);
  }
}
