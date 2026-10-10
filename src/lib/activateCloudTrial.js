import { base44 } from '@/api/base44Client';
import { getDemoTrialState, clearDemoTrialFlag } from '@/lib/demoTrial';

// Trial cloud alla registrazione: ogni utente registrato (nuovo o esistente,
// via email o Google) riceve una trial cloud con scrittura abilitata e Cary
// reale. I giorni si calcolano dallo stato della demo device localStorage:
//   - demo attiva  -> giorni residui trasferiti (max 30)
//   - demo scaduta -> GRACE_DAYS (7) di benvenuto nel cloud
//   - mai avviata  -> TRIAL_FRESH_DAYS (30) freschi
// Una sola trial per account: idempotente, non riattiva se free_until già
// presente (futuro o passato).

export const TRIAL_FRESH_DAYS = 45;
export const GRACE_DAYS = 7;
const DAY_MS = 86400000;

// Calcola i giorni di trial cloud: 45 giorni completi garantiti alla registrazione
export function computeCloudTrialDays() {
  return { days: TRIAL_FRESH_DAYS, source: 'fresh' };
}

// Attiva la trial cloud per l'utente autenticato, se non ne ha già una.
// Idempotente: se free_until futuro già presente non sovrascrive; se passato
// (expired) non riattiva (una sola trial per account). Usata da AuthContext
// per il percorso Google OAuth e per gli utenti esistenti 'none' (retroattivo).
// Ritorna { activated: true, days, source, freeUntil } o { activated: false, reason }.
export async function activateCloudTrial(knownUser) {
  let user = knownUser;
  if (!user) {
    try {
      user = await base44.auth.me();
    } catch (_) {
      return { activated: false, reason: 'no_user' };
    }
  }
  // Già abbonato: non toccare.
  const sub = user.subscription_status;
  if (['active', 'lifetime', 'three_months'].includes(sub)) {
    return { activated: false, reason: 'subscribed' };
  }
  // Idempotenza: free_until già impostato (futuro = attivo, passato = scaduto).
  if (user.free_until) {
    const endMs = new Date(user.free_until).getTime();
    if (!isNaN(endMs)) {
      if (endMs > Date.now()) return { activated: false, reason: 'already_active' };
      return { activated: false, reason: 'already_expired' };
    }
  }
  const { days, source } = computeCloudTrialDays();
  const freeUntil = new Date(Date.now() + days * DAY_MS).toISOString();
  try {
    await base44.auth.updateMe({ free_until: freeUntil });
    // Svuota il flag demo device (NON i dati guest, migrati a parte da AppLayout).
    clearDemoTrialFlag();
    try {
      base44.analytics.track({ eventName: 'trial_activated', properties: { source, days } });
    } catch (_) { /* noop */ }
    return { activated: true, days, source, freeUntil };
  } catch (e) {
    return { activated: false, reason: 'update_failed' };
  }
}