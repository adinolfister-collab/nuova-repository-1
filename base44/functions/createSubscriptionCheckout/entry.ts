import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

// Web-only Stripe checkout for the non-Android fallback. The 30-day trial is
// now app-side (getSubscriptionStatus), so no Stripe-side trial_period_days
// is applied here — avoids a double free period.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let plan = 'monthly';
    try {
      const body = await req.json();
      if (body && body.plan === 'yearly') plan = 'yearly';
    } catch { /* default monthly */ }

    const secretKey = secrets.get('STRIPE_SECRET_KEY');
    const priceId = plan === 'yearly'
      ? (secrets.get('STRIPE_PREMIUM_ANNUAL_PRICE_ID') || secrets.get('STRIPE_ANNUAL_PRICE_ID'))
      : (secrets.get('STRIPE_PREMIUM_MONTHLY_PRICE_ID') || secrets.get('STRIPE_PRICE_ID_MONTHLY_EUR'));
    const appId = Deno.env.get('BASE44_APP_ID');
    if (!secretKey) return Response.json({ error: 'Stripe non configurato' }, { status: 500 });
    if (!priceId) return Response.json({ error: 'Piano non ancora configurato' }, { status: 503 });

    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/abbonamento?checkout=success`;
    const cancelUrl = `${origin}/abbonamento?checkout=cancel`;

    const body = new URLSearchParams();
    body.set('mode', 'subscription');
    body.set('line_items[0][price]', priceId);
    body.set('line_items[0][quantity]', '1');
    body.set('metadata[base44_app_id]', appId || '');
    body.set('subscription_data[metadata][base44_app_id]', appId || '');
    body.set('success_url', successUrl);
    body.set('cancel_url', cancelUrl);
    body.set('allow_promotion_codes', 'true');
    if (user.email) body.set('customer_email', user.email);

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Stripe-Version': '2025-10-29.clover',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': crypto.randomUUID()
      },
      body
    });
    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe checkout error', session.error);
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createSubscriptionCheckout', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}