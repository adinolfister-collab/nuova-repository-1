import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

// Trova discussioni community attive e membri con esperienze simili a partire
// dal messaggio/intento dell'utente. Accessibile a tutti (anche ospiti): legge
// i CommunityMessage pubblici (read aperto) e, se l'utente e' loggato, il suo
// diario per calcolare la similarita' di profilo. Non espone PII: restituisce
// solo id (per il DM), nome pubblico e un motivo aggregato.

const STOP_WORDS = new Set([
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'una', 'uno', 'di', 'a', 'da', 'in',
  'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ma', 'se', 'che', 'come', 'mio',
  'mia', 'miei', 'mie', 'ho', 'mi', 'ti', 'si', 'sono', 'essere', 'fare', 'sto',
  'andare', 'venire', 'questo', 'quello', 'questi', 'quelli', 'molto', 'poco',
  'piu', 'meno', 'anche', 'ogni', 'tutto', 'tutti', 'me', 'te', 'noi', 'voi',
  'cerco', 'vorrei', 'voglio', 'posso', 'devo', 'faccio', 'sentito', 'sento',
  'the', 'a', 'an', 'is', 'are', 'was', 'i', 'me', 'my', 'we', 'you', 'to', 'of',
  'and', 'or', 'but', 'in', 'on', 'for', 'with', 'how', 'what', 'why',
]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function scoreMessage(msg, queryTokens) {
  if (!queryTokens.length) return 0;
  const contentTokens = tokenize(msg.content || '');
  const catTokens = tokenize(msg.category || '');
  let hits = 0;
  for (const t of queryTokens) {
    if (contentTokens.includes(t)) hits += 2;
    if (catTokens.includes(t)) hits += 1;
  }
  // bonus partita esatta su categoria
  return hits;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    const body = await req.json().catch(() => ({}));
    const query = String(body?.query || '');

    // CommunityMessage ha read aperto a tutti: leggiamo l'attivita' recente.
    const messages = await base44.asServiceRole.entities.CommunityMessage.list(
      '-created_date',
      120
    );

    // Separa thread radice (parent_id vuoto) e risposte
    const roots = messages.filter((m) => !m.parent_id);
    const repliesByParent = new Map();
    for (const m of messages) {
      if (m.parent_id) {
        const arr = repliesByParent.get(m.parent_id) || [];
        arr.push(m);
        repliesByParent.set(m.parent_id, arr);
      }
    }

    const queryTokens = tokenize(query);

    // --- Threads: score per keyword/category match + attivita' (risposte) ---
    const threads = roots
      .map((m) => {
        const replies = repliesByParent.get(m.id) || [];
        const score = scoreMessage(m, queryTokens) + Math.min(replies.length, 3);
        return {
          id: m.id,
          category: m.category || 'generale',
          snippet: (m.content || '').slice(0, 160),
          author: m.author_name || 'Utente',
          replies: replies.length,
          score,
        };
      })
      .filter((t) => t.score > 0 || queryTokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    // --- Persone: autori attivi recenti, con similarita' di profilo ---
    // Profilo dell'utente loggato (sintomi/pasti/terapie) per matching
    let profile = null;
    if (user) {
      try {
        const [syms, foods, meds] = await Promise.all([
          base44.entities.SymptomEntry.list('-created_date', 40).catch(() => []),
          base44.entities.FoodEntry.list('-created_date', 40).catch(() => []),
          base44.entities.Medication.list('-created_date', 20).catch(() => []),
        ]);
        const painLocations = new Set(
          syms.map((s) => s.pain_location).filter(Boolean)
        );
        const medsNames = new Set(
          meds.map((m) => (m.name || '').toLowerCase()).filter(Boolean)
        );
        const foodReactions = new Set(
          foods
            .map((f) => f.reaction)
            .filter((r) => r && r !== 'nessuna')
        );
        profile = { painLocations, medsNames, foodReactions };
      } catch (e) {
        profile = null;
      }
    }

    // Mappa autori -> { id, name, messages, queryHits, sharedSignals }
    const authors = new Map();
    for (const m of messages) {
      const uid = m.created_by_id;
      if (!uid) continue;
      if (user && uid === user.id) continue; // escludi se stesso
      const a =
        authors.get(uid) ||
        { id: uid, name: m.author_name || 'Utente', messages: 0, queryHits: 0, sharedSignals: 0 };
      a.messages += 1;
      a.queryHits += scoreMessage(m, queryTokens);
      // similarita' profilo: categorie di cui ha parlato che matchano il profilo
      if (profile) {
        const c = (m.content || '').toLowerCase();
        for (const pl of profile.painLocations) {
          if (c.includes(String(pl).toLowerCase().replace(/_/g, ' '))) a.sharedSignals += 1;
        }
        for (const mn of profile.medsNames) {
          if (mn && c.includes(mn)) a.sharedSignals += 2;
        }
      }
      authors.set(uid, a);
    }

    const people = Array.from(authors.values())
      .map((a) => ({
        id: a.id,
        name: a.name,
        reason: buildReason(a, profile),
        score: a.queryHits * 2 + a.sharedSignals + Math.min(a.messages, 5),
      }))
      .filter((p) => p.score > 0 || queryTokens.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return Response.json({ threads, people, isGuest: !user });
  } catch (error) {
    console.error('findSupportMatches', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildReason(a, profile) {
  const parts = [];
  if (a.queryHits > 0) parts.push('ha parlato di questo tema di recente');
  if (profile && a.sharedSignals > 0) {
    if (profile.medsNames.size) parts.push('condivide una terapia simile');
    else parts.push('segnali di salute affini');
  }
  if (!parts.length) parts.push('attivo nella community');
  return parts.join(' · ');
}