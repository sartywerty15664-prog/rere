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
  if (!stripe || !user.billing?.stripeCustomerId) return htmlResponse(billingContent({ user, csrf: session.csrf, configured: billingConfigured() }), 'Billing', 503, options);
  try {
    const portal = await stripe.billingPortal.sessions.create({ customer: user.billing.stripeCustomerId, return_url: `${publicUrl(new URL(request.url).origin)}/console/billing` });
    return formRedirect(request, portal.url);
  } catch (error) {
    console.error(`Stripe portal: ${error.message}`);
    return htmlResponse(billingContent({ user, csrf: session.csrf, configured: billingConfigured(), error: 'The Stripe customer portal is unavailable right now.' }), 'Billing', 502, options);
  }
}
