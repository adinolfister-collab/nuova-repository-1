import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Stima i valori nutrizionali (kcal, proteine e carboidrati per 100 g) di un
// alimento non presente nel catalogo, usando Cary (InvokeLLM con contesto da
// internet). L'utente può poi confermare o modificare i valori prima di
// salvarli. Funzione di sola stima: nessun accesso a dati utente, accessibile
// anche agli ospiti non autenticati.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const name = body && body.name && String(body.name).trim().slice(0, 120);
    if (!name) return Response.json({ error: 'Nome alimento mancante' }, { status: 400 });

    const prompt = `Sei un assistente nutrizionale (Cary) per pazienti con IBD. 
Stima i valori nutrizionali dell'alimento indicato, inteso come alimento COTTO e PRONTO DA MANGIARE (valori tipici per 100 g o 100 ml).
Restituisci SOLO un oggetto JSON con:
- "kcal": calorie per 100 g (numero intero, media 0-900)
- "proteine": grammi di proteine per 100 g (numero con 1 decimale)
- "carboidrati": grammi di carboidrati per 100 g (numero con 1 decimale)
- "note": breve nota (max 60 caratteri) se utile, altrimenti stringa vuota

Alimento: "${name}"

Rispondi esclusivamente con il JSON, nient'altro.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      response_json_schema: {
        type: 'object',
        properties: {
          kcal: { type: 'number' },
          proteine: { type: 'number' },
          carboidrati: { type: 'number' },
          note: { type: 'string' }
        },
        required: ['kcal', 'proteine', 'carboidrati']
      }
    });

    const data = typeof result === 'object' && result ? result : null;
    const kcal = Math.max(0, Math.round(Number(data && data.kcal) || 0));
    const proteine = Math.max(0, Math.round((Number(data && data.proteine) || 0) * 10) / 10);
    const carboidrati = Math.max(0, Math.round((Number(data && data.carboidrati) || 0) * 10) / 10);
    const note = data && data.note ? String(data.note).slice(0, 120) : '';

    return Response.json({ kcal, proteine, carboidrati, note });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}