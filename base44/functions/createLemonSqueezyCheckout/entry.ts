import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// Lemon Squeezy checkout builder — READY BUT INACTIVE.
//
// This function is wired to be called from the Abbonamento page once the
// Lemon Squeezy secrets are configured. Until then it returns 503 and the
// page keeps using Stripe (createSubscriptionCheckout).
//
// Required secrets (Settings → Secrets):
//   LEMON_SQUEEZY_API_KEY          Bearer token for the LS REST API
//   LEMON_SQUEEZY_STORE_ID         Numeric store id
//   LEMON_SQUEEZY_VARIANT_ID_MONTHLY   Variant id of the monthly plan
//   LEMON_SQUEEZY_VARIANT_ID_YEARLY    Variant id of the yearly plan
//   LEMON_SQUEEZY_WEBHOOK_SECRET   Webhook signing secret (handleLemonSqueezyWebhook)
//
// Webhook endpoint to register in Lemon Squeezy dashboard:
//   https://ibd-care.base44.app/functions/handleLemonSqueezyWebhook

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = secrets.get('LEMON_SQUEEZY_API_KEY');
    const storeId = secrets.get('LEMON_SQUEEZY_STORE_ID');
    const appId = Deno.env.get('BASE44_APP_ID');
    if (!apiKey || !storeId) {
      return Response.json({ error: 'Lemon Squeezy non configurato' }, { status: 503 });
    }

    let plan = 'monthly';
    try {
      const body = await req.json();
      if (body && body.plan === 'yearly') plan = 'yearly';
    } catch { /* default monthly */ }

    const variantId = plan === 'yearly'
      ? secrets.get('LEMON_SQUEEZY_VARIANT_ID_YEARLY')
      : secrets.get('LEMON_SQUEEZY_VARIANT_ID_MONTHLY');
    if (!variantId) return Response.json({ error: 'Piano non configurato' }, { status: 503 });

    const origin = new URL(req.url).origin;
    const successUrl = `${origin}/abbonamento?checkout=success`;
    const cancelUrl = `${origin}/abbonamento?checkout=cancel`;

    const payload: any = {
      data: {
        type: 'checkouts',
        attributes: {
          store_id: Number(storeId),
          variant_id: Number(variantId),
          urls: { success: successUrl, cancel: cancelUrl },
          checkout_data: {
            custom: { base44_app_id: appId || '' },
          },
        },
      },
    };
    if (user.email) payload.data.attributes.checkout_data.email = user.email;

    const res = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('LemonSqueezy checkout error', data.errors || data);
      return Response.json({ error: (data.errors && data.errors[0] && data.errors[0].detail) || 'Lemon Squeezy error' }, { status: 400 });
    }
    const url = data.data?.attributes?.url;
    if (!url) return Response.json({ error: 'URL di checkout mancante' }, { status: 502 });
    return Response.json({ url, plan });
  } catch (error) {
    console.error('createLemonSqueezyCheckout', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}