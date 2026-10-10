import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Genera varianti di logo come FOTOGRAFIE AI realistiche (non disegni) per la
// dashboard marketing. Il frontend invia una descrizione del soggetto (es.
// "news", "about", "home", "diario sintomi") + un array di angolazioni; il
// backend costruisce un prompt fotografico per ciascuna variante e chiama
// GenerateImage con asServiceRole. Restituisce { logos: [{ url, error }] }.
const PHOTO_BASE = (description) =>
  'Photorealistic editorial photograph, not an illustration, not a drawing, ' +
  'not vector art, not a cartoon — real photographic style, natural lighting, ' +
  'high detail, premium magazine quality. No text, no letters, no words, no logos. ' +
  'Calm, warm, human, reassuring mood suited to a gut-health (IBD: Crohn and Colitis) ' +
  'care app. Palette: deep teal and warm terracotta accents on soft natural tones. ' +
  'Square composition, centered, balanced. Subject: ' + description + '. ';

const DEFAULT_VARIATIONS = [
  'Macro close-up shot, shallow depth of field, soft natural window light, intimate and calm.',
  'Soft-focus environmental photograph, gentle bokeh, muted earthy tones, editorial magazine feel.',
  'Overhead flat-lay composition, diffused daylight, balanced negative space, refined and clean.',
  'Environmental lifestyle photograph, natural ambient light, organic textures, warm and human.',
];

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const description = String(body.description || '').trim().slice(0, 300);
    if (!description) return Response.json({ error: 'Descrizione obbligatoria' }, { status: 400 });
    const variations = Array.isArray(body.variations) && body.variations.length
      ? body.variations.slice(0, 6).map((v) => String(v).slice(0, 1000))
      : DEFAULT_VARIATIONS;

    const promptBase = PHOTO_BASE(description);
    const results = await Promise.all(
      variations.map(async (variation) => {
        try {
          const out = await base44.asServiceRole.integrations.Core.GenerateImage({
            prompt: `${promptBase} ${variation}`,
          });
          return { url: out?.url || null, error: out?.url ? null : 'Nessun URL' };
        } catch (e) {
          console.error('generateLogoVariants', e);
          return { url: null, error: e?.message || 'errore generazione' };
        }
      })
    );

    return Response.json({ logos: results });
  } catch (error) {
    console.error('generateLogoVariants fatal', error);
    return Response.json({ error: error.message || 'Errore generazione loghi' }, { status: 500 });
  }
}