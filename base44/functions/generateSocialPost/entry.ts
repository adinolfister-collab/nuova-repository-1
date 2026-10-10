import { createClientFromRequest } from 'npm:@base44/sdk@0.8.48';

// Genera copy per post social (Facebook/Instagram, LinkedIn, X/Twitter) per la
// dashboard marketing admin. Usa InvokeLLM con prompt strutturato per piattaforma.
// Restituisce { platform: { text, hashtags, cta } } o un set di 4 varianti.
// Genera inoltre una singola immagine AI (GenerateImage) con prompt visivo
// derivato dall'argomento, e restituisce image_url. Se deepLink è presente,
// l'AI lo incorpora nel testo del post.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const topic = String(body.topic || '').trim().slice(0, 500);
    if (!topic) return Response.json({ error: 'Argomento mancante' }, { status: 400 });
    const tone = String(body.tone || 'incoraggiante').trim().slice(0, 40);
    const lang = String(body.lang || 'it').trim().slice(0, 5);
    const platform = String(body.platform || 'all').trim();
    const cta = String(body.cta || 'Gratis per sempre, senza carta di credito').trim().slice(0, 120);
    const deepLink = String(body.deepLink || '').trim().slice(0, 300);

    const LANG_NAME = {
      it: 'italiano', en: 'inglese', es: 'spagnolo', fr: 'francese',
      de: 'tedesco', pt: 'portoghese', ru: 'russo', pl: 'polacco',
      ro: 'rumeno', sq: 'albanese', zh: 'cinese',
    };
    const langName = LANG_NAME[lang] || 'italiano';

    const APP_CONTEXT = `Sei il copywriter dell'app "IBD Care", un'app gratuita per sempre (freemium, senza pubblicità) per gestire la malattia infiammatoria intestinale (IBD: morbo di Crohn, colite ulcerosa).
Funzioni: diario sintomi, diario alimentare, promemoria terapie, scanner esami, grafici e correlazioni, riepilogo PDF per il medico, mappa servizi, assistente AI, community di supporto. Dati privati e GDPR-compliant.
Piani: l'app è gratis per sempre, senza carta di credito; le funzioni avanzate sono con abbonamento a partire da €0,99/mese, disdici quando vuoi. Campagna Founder: i primi 50 ricevono Premium a vita.
Puoi menzionare la prova gratuita di 30 giorni (demo) E la narrativa "gratis per sempre, senza carta di credito" quando coerenti con la CTA fornita. NON menzionare MAI "14 giorni"/"14gg" o periodi di prova diversi da 30 giorni. Includi sempre la CTA fornita dall'admin senza contraddirla.
Tono richiesto: ${tone}. Scrivi in ${langName}.`;

    const linkInstruction = deepLink
      ? `Includi in modo naturale questo link nel testo del post (non negli hashtag): ${deepLink}`
      : '';

    const PLATFORM_SPEC = {
      facebook: `Post per Facebook/Instagram: max 280 caratteri, emoji misurati (2-4), 3-5 hashtag in fondo su riga separata, CTA chiara e calorosa, prima persona o "noi di IBD Care".`,
      linkedin: `Post per LinkedIn: tono professionale ed empatico, max 600 caratteri, rivolto a community sanitaria/pazienti/ caregiver, value-driven, 3 hashtag pertinenti, CTA orientata alla prova.`,
      x: `Tweet per X/Twitter: max 200 caratteri (incluse hashtag), incisivo, 2-3 hashtag, emoji opzionale, CTA breve.`,
      instagram: `Didascalia Instagram: max 500 caratteri, emoji coerenti (3-6), 5-8 hashtag su riga separata, testo visuale e accogliente, CTA al download/prova.`,
    };

    // Prompt visivo automatico per l'immagine AI, derivato dall'argomento.
    const VISUAL_PROMPT = `Clean, calming social media hero image for a health & wellness app about inflammatory bowel disease (IBD / Crohn's / colitis). Soft navy blue and warm terracotta palette, gentle natural lighting, minimal composition, reassuring and hopeful mood, no text, no words, no watermark, photorealistic editorial style. Visual concept inspired by: ${topic}`;

    // Genera l'immagine AI; non blocca i post se fallisce.
    const generateImage = async () => {
      try {
        const out = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: VISUAL_PROMPT,
        });
        return out?.url || null;
      } catch (e) {
        console.error('generateSocialPost image', e);
        return null;
      }
    };

    if (platform !== 'all') {
      const spec = PLATFORM_SPEC[platform] || PLATFORM_SPEC.facebook;
      const prompt = `${APP_CONTEXT}

${spec}

Argomento del post: """${topic}"""
Call to action da includere: ${cta}
${linkInstruction}

Restituisci SOLO un JSON con questa struttura:
{"text": "...", "hashtags": ["#...", "..."], "cta": "..."}
Il campo text non deve contenere gli hashtag (vanno nell'array hashtags). La cta può essere incorporata nel text o indicata separatamente.`;

      const [llmResult, imageUrl] = await Promise.all([
        base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              hashtags: { type: 'array', items: { type: 'string' } },
              cta: { type: 'string' },
            },
            required: ['text'],
          },
        }),
        generateImage(),
      ]);
      return Response.json({ platform, post: llmResult, image_url: imageUrl });
    }

    // all: genera 4 varianti in un'unica chiamata
    const prompt = `${APP_CONTEXT}

Genera 4 varianti dello stesso post per piattaforme diverse, partendo da questo argomento:
"""${topic}"""
Call to action da includere: ${cta}
${linkInstruction}

${PLATFORM_SPEC.facebook}
${PLATFORM_SPEC.linkedin}
${PLATFORM_SPEC.x}
${PLATFORM_SPEC.instagram}

Restituisci SOLO un JSON con questa struttura:
{"facebook": {"text":"...","hashtags":[...],"cta":"..."}, "linkedin": {...}, "x": {...}, "instagram": {...}
Ogni oggetto ha text, hashtags (array), cta. Il campo text non contiene gli hashtag.`;

    const [llmResult, imageUrl] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            facebook: { type: 'object', properties: { text: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' } } },
            linkedin: { type: 'object', properties: { text: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' } } },
            x: { type: 'object', properties: { text: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' } } },
            instagram: { type: 'object', properties: { text: { type: 'string' }, hashtags: { type: 'array', items: { type: 'string' } }, cta: { type: 'string' } } },
          },
        },
      }),
      generateImage(),
    ]);
    return Response.json({ platform: 'all', posts: llmResult, image_url: imageUrl });
  } catch (error) {
    console.error('generateSocialPost', error);
    return Response.json({ error: error.message || 'Errore generazione' }, { status: 500 });
  }
}