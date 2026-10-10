import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Genera un logo 512×512 coerente col brand IBD Care usando il logo attuale
// come riferimento di stile. Admin-only.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let body = {};
    try { body = await req.json(); } catch { /* no body */ }
    const referenceUrl = typeof body.referenceUrl === 'string' ? body.referenceUrl : undefined;

    const prompt =
      'A clean, minimalist app logo icon for "IBD Care", a health app for IBD (Crohn\'s disease and ulcerative colitis) patients. ' +
      'Flat vector style, centered on a solid deep teal (#1f4e57) background. ' +
      'A simple, elegant abstract mark combining a soft leaf shape with a subtle heart/pulse-line motif, in warm terracotta (#c47b5a) and soft cream tones. ' +
      'No text, no letters, no words. Rounded, friendly, medical yet approachable. ' +
      'Square 1:1 composition with generous padding. Modern, premium, calm.';

    const result = await base44.asServiceRole.integrations.Core.GenerateImage({
      prompt,
      existing_image_urls: referenceUrl ? [referenceUrl] : undefined,
    });

    return Response.json({ url: result.url });
  } catch (error) {
    console.error('generateAppLogo error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}