import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const secretKey = secrets.get('STRIPE_SECRET_KEY');
    if (!secretKey) return Response.json({ error: 'Stripe non configurato' }, { status: 500 });
    if (!user.email) return Response.json({ error: 'Email mancante' }, { status: 400 });

    const headers = {
      'Authorization': `Bearer ${secretKey}`,
      'Stripe-Version': '2025-10-29.clover'
    };

    const custRes = await fetch(`https://api.stripe.com/v1/customers?email=${encodeURIComponent(user.email)}&limit=20`, { headers });
    const custData = await custRes.json();
    const customer = (custData.data || []).find((c) => (c.email || '').toLowerCase() === user.email.toLowerCase());
    if (!customer) return Response.json({ error: 'Nessun cliente Stripe trovato' }, { status: 404 });

    const origin = new URL(req.url).origin;
    const body = new URLSearchParams();
    body.set('customer', customer.id);
    body.set('return_url', `${origin}/abbonamento`);

    const portalRes = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': crypto.randomUUID() },
      body
    });
    const session = await portalRes.json();
    if (!portalRes.ok) {
      console.error('billing portal error', session.error);
      return Response.json({ error: session.error?.message || 'Stripe error' }, { status: 400 });
    }
    return Response.json({ url: session.url });
  } catch (error) {
    console.error('createBillingPortalSession', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}