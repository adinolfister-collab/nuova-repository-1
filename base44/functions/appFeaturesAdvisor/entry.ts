import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Assistente pubblico che consiglia all'utente cosa può ottenere dall'app IBD Care
// in base alla sua domanda o ai suoi bisogni. Non richiede login: è visibile anche
// a visitatori non autenticati sulla pagina di abbonamento.
const SYSTEM = `Sei l'assistente di "IBD Care", un'app privata per gestire la malattia infiammatoria intestinale (IBD: morbo di Crohn, colite ulcerosa).
Funzioni dell'app:
- Diario dei sintomi (dolore, stanchezza, scariche, consistenza feci, sangue, umore).
- Tracciamento alimentare con tollerabilità e reazioni.
- Promemoria terapie (farmaci, biologici, integratori) con orari.
- Scanner esami sanitari: scansiona referti (esami del sangue, calprotectina fecale, colonscopia, ecografia), estrae i valori con AI e crea una cronologia con confronto nel tempo e export PDF per il medico.
- Grafici di andamento sintomi e correlazioni con i pasti.
- Riepilogo PDF personalizzato da portare in visita.
- Mappa dei servizi (centri IBD, farmacie, bagni pubblici, pronto soccorso).
- Assistente AI personale.
- Board community di supporto.
- Backup sicuro e protezione dati (GDPR).

Piani:
- Base gratuito: diario sintomi (massimo 2 registrazioni/giorno) e mappa dei servizi.
- Premium €0,99/mese con 14 giorni di prova gratuita: tutte le funzioni illimitate, incluso scanner esami, grafici, riepilogo PDF, assistente e community.

Compito: rispondi in modo breve, chiaro e rassicurante, consigliando le funzioni dell'app più adatte al bisogno espresso dall'utente. Se l'utente descrive sintomi o situazione clinica, suggerisci le funzioni utili (diario sintomi, scanner esami, riepilogo PDF per il medico) e ricorda che l'app non sostituisce il parere medico. Scrivi nella lingua dell'utente (se non chiaro, italiano).`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const question = body && body.question && String(body.question).trim().slice(0, 500);
    if (!question) return Response.json({ error: 'Domanda mancante' }, { status: 400 });
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const conv = history.map((h) => `${h.role === 'user' ? 'Utente' : 'Assistente'}: ${h.text}`).join('\n');
    const prompt = `${SYSTEM}\n\n${conv}\n\nUtente: ${question}\n\nAssistente:`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'gemini_3_flash'
    });

    const answer = typeof result === 'string' ? result : (result && result.answer ? result.answer : 'Non sono riuscito a rispondere.');
    return Response.json({ answer });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}