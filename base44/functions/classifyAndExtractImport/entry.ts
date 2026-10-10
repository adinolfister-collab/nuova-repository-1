import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Scanner smart unificato: classifica un documento/immagine in una di
// 4 categorie e ne estrae i dati con Cary.
//  - referto_medico: delega a scanMedicalDocument (logica + dedupe esistenti)
//  - attivita: schermata app salute -> data, passi, kcal, distanza
//  - etichetta: etichetta nutrizionale -> nome + valori per 100g
//  - piatto: foto pasto -> items con valori stimati
// L'utente rivede sempre i dati prima del salvataggio (lato frontend).
// Le immagini devono essere URL pubblici (media.base44.com) per la visione AI.

const ALLOWED_HOSTS = new Set(['media.base44.com', 'static.wixstatic.com']);

function validFileUrl(fileUrl) {
  if (!fileUrl || typeof fileUrl !== 'string' || fileUrl.length > 2048) return false;
  let p;
  try { p = new URL(fileUrl); } catch { return false; }
  return p.protocol === 'https:' && ALLOWED_HOSTS.has(p.hostname);
}

function num(v, dec) {
  const n = Number(v);
  if (!isFinite(n) || n < 0) return 0;
  const r = Math.round(n * (dec ? Math.pow(10, dec) : 1)) / (dec ? Math.pow(10, dec) : 1);
  return r;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUrl = body && body.file_url;
    if (!validFileUrl(fileUrl)) return Response.json({ error: 'file_url non valido' }, { status: 400 });

    // 1) Classificazione
    const cls = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sei Cary. Osserva l'immagine o il documento allegato e classificalo in UNA di queste categorie:
- "referto_medico": referto, esame, visita, lettera medica, prescrizione o altro documento sanitario
- "attivita": schermata di un'app di salute/fitness (Samsung Health, Apple Health, Google Fit, Fitbit) che mostra passi, calorie consumate o distanza
- "etichetta": etichetta nutrizionale di un alimento con valori per 100g e porzione
- "piatto": foto di un piatto o pasto pronto
Rispondi SOLO con la categoria.`,
      file_urls: [fileUrl],
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: { category: { type: 'string', enum: ['referto_medico', 'attivita', 'etichetta', 'piatto'] } },
        required: ['category']
      }
    });
    const category = (cls && cls.category) || 'referto_medico';

    // 2) Estrazione per categoria
    if (category === 'referto_medico') {
      const res = await base44.functions.invoke('scanMedicalDocument', { file_url: fileUrl });
      return Response.json({
        category,
        extracted: res.data && res.data.extracted,
        duplicate: res.data && res.data.duplicate
      });
    }

    if (category === 'attivita') {
      const ex = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Sei Cary. Leggi la schermata di un'app di salute (Samsung Health, Apple Health, Google Fit o simile). Estrai la data di riferimento e i valori di attività fisica visibili (passi, calorie consumate, distanza). Date in formato AAAA-MM-GG. Se un valore non è visibile usa 0.`,
        file_urls: [fileUrl],
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            entry_date: { type: 'string', description: 'Data in AAAA-MM-GG' },
            steps: { type: 'number' },
            kcal_expended: { type: 'number' },
            distance_km: { type: 'number' }
          },
          required: ['entry_date', 'steps', 'kcal_expended', 'distance_km']
        }
      });
      return Response.json({
        category,
        extracted: {
          entry_date: (ex && ex.entry_date) || new Date().toISOString().slice(0, 10),
          steps: num(ex && ex.steps),
          kcal_expended: num(ex && ex.kcal_expended),
          distance_m: Math.round(num(ex && ex.distance_km) * 1000)
        }
      });
    }

    if (category === 'etichetta') {
      const ex = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Sei Cary. Leggi l'etichetta nutrizionale dell'alimento. Estrai il nome e i valori nutrizionali PER 100g o 100ml (calorie, proteine, carboidrati). Se un valore non è leggibile stimane uno ragionevole. Indica l'unità di misura predefinita e il peso di una porzione in grammi se presente (altrimenti 0).`,
        file_urls: [fileUrl],
        model: 'gemini_3_flash',
        response_json_schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            kcal: { type: 'number' },
            proteine: { type: 'number' },
            carboidrati: { type: 'number' },
            default_unit: { type: 'string', enum: ['g', 'ml', 'porzione', 'cucchiaio', 'tazza', 'fetta'] },
            portion_grams: { type: 'number' }
          },
          required: ['name', 'kcal', 'proteine', 'carboidrati']
        }
      });
      return Response.json({
        category,
        extracted: {
          name: String((ex && ex.name) || '').slice(0, 120),
          kcal: num(ex && ex.kcal),
          proteine: num(ex && ex.proteine, 1),
          carboidrati: num(ex && ex.carboidrati, 1),
          default_unit: (ex && ex.default_unit) || 'g',
          portion_grams: num(ex && ex.portion_grams)
        }
      });
    }

    // piatto
    const ex = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Sei Cary. Osserva la foto del piatto/pasto. Identifica gli alimenti riconoscibili, stima le quantità in grammi e i valori nutrizionali totali (kcal, proteine, carboidrati) per ciascun alimento. I valori sono sempre stimati. Riconosci il tipo di pasto (colazione/pranzo/cena/spuntino) dall'aspetto. Non inventare alimenti non riconoscibili: omettili.`,
      file_urls: [fileUrl],
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          meal_type: { type: 'string', enum: ['colazione', 'pranzo', 'cena', 'spuntino'] },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                qty: { type: 'number', description: 'grammi stimati' },
                kcal: { type: 'number' },
                proteine: { type: 'number' },
                carboidrati: { type: 'number' }
              },
              required: ['name', 'qty', 'kcal', 'proteine', 'carboidrati']
            }
          }
        },
        required: ['meal_type', 'items']
      }
    });
    const items = ((ex && ex.items) || []).filter((i) => i && i.name).map((i) => ({
      name: String(i.name).slice(0, 80),
      qty: String(Math.max(0, Math.round(Number(i.qty) || 0))),
      unit: 'g',
      kcal: num(i.kcal),
      proteine: num(i.proteine, 1),
      carboidrati: num(i.carboidrati, 1),
      kcal_source: 'cary'
    }));
    return Response.json({
      category,
      extracted: {
        meal_type: (ex && ex.meal_type) || 'pranzo',
        items
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}