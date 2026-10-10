import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Creates a short-lived shareable report token. Authenticated users store
// their report payload; a public share_id is returned to build the /report/:id
// link. Expires after 30 days.
const TTL_DAYS = 30;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }
    const reportType = body.report_type === 'weekly' ? 'weekly' : 'monthly';
    const reportData = body.report_data;
    if (!reportData || typeof reportData !== 'object') {
      return Response.json({ error: 'report_data mancante' }, { status: 400 });
    }

    // Short public token (12 hex chars).
    const buf = new Uint8Array(6);
    crypto.getRandomValues(buf);
    const shareId = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');

    const expiresAt = new Date(Date.now() + TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

    await base44.entities.ShareableReport.create({
      share_id: shareId,
      user_id: user.id,
      report_type: reportType,
      report_data: reportData,
      expires_at: expiresAt,
    } as any);

    return Response.json({ shareId, expiresAt });
  } catch (error) {
    console.error('createShareableReport', error);
    return Response.json({ error: 'Impossibile creare il link di condivisione' }, { status: 502 });
  }
}