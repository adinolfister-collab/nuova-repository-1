import { base44 } from '@/api/base44Client';

// Trial demo device: 45 giorni a partire dalla prima visita a una rotta
// demo-enabled. Salvata in localStorage (chiave ibd_demo_trial_start).
// La demo è l'unica trial gratuita: alla scadenza l'ospite deve registrarsi.
export const DEMO_TRIAL_DAYS = 45;
const STORAGE_KEY = 'ibd_demo_trial_start';
const DAY_MS = 86400000;

// Rotte in cui la demo è attiva: entrando qui la trial device parte (se non
// già attiva) e, una volta scaduta, l'ospite vede il DemoExpiredGate a tutto
// schermo. Le pagine marketing/news/community/auth/restano pubbliche.
export const DEMO_ENABLED_PATHS = new Set([
  '/symptoms', '/food', '/meds', '/meds/calendar', '/records', '/esami',
  '/trends', '/symptom-charts', '/correlazioni', '/assistant', '/map', '/summary',
]);

export function isDemoEnabledPath(path) {
  return DEMO_ENABLED_PATHS.has(path);
}

export function getDemoTrialState() {
  if (typeof window === 'undefined') {
    return { started: false, startMs: null, daysRemaining: 0, expired: false, trialEnd: null };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { started: false, startMs: null, daysRemaining: 0, expired: false, trialEnd: null };
  }
  const startMs = Number(raw);
  if (!startMs || isNaN(startMs)) {
    return { started: false, startMs: null, daysRemaining: 0, expired: false, trialEnd: null };
  }
  const trialEnd = startMs + DEMO_TRIAL_DAYS * DAY_MS;
  const daysRemaining = Math.max(0, Math.ceil((trialEnd - Date.now()) / DAY_MS));
  const expired = Date.now() >= trialEnd;
  return { started: true, startMs, daysRemaining, expired, trialEnd };
}

let startedTracked = false;
let expiredTracked = false;

// Avvia la trial device di 30gg se non già attiva. Idempotente. Traccia
// 'demo_trial_started' al primo avvio e 'demo_trial_expired' alla prima
// scadenza rilevata (best-effort, errori silenziosi).
// Rimuove il flag demo device dal localStorage. Chiamata dopo che la trial
// device è stata trasferita nel cloud (registrazione): i dati guest restano
// e vengono migrati separatamente da AppLayout.
export function clearDemoTrialFlag() {
  if (typeof window === 'undefined') return;
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* noop */ }
}

export function ensureDemoTrialStarted() {
  if (typeof window === 'undefined') return;
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) {
    const st = getDemoTrialState();
    if (st.expired && !expiredTracked) {
      expiredTracked = true;
      try { base44.analytics.track({ eventName: 'demo_trial_expired' }); } catch (_) { /* noop */ }
    }
    return;
  }
  localStorage.setItem(STORAGE_KEY, String(Date.now()));
  if (!startedTracked) {
    startedTracked = true;
    try {
      base44.analytics.track({ eventName: 'demo_trial_started', properties: { days: DEMO_TRIAL_DAYS } });
    } catch (_) { /* noop */ }
  }
}