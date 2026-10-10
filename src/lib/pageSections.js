// Mappa un pathname dell'app a una macro-sezione per il tracking page-view.
// Usato dal beacon lato client; le sezioni devono restare allineate con
// l'enum dell'entita' PageView.
const DIARY_PATHS = [
  '/symptoms', '/food', '/meds', '/records', '/esami',
  '/analisi', '/trends', '/symptom-charts', '/correlazioni',
];

// Pagine di acquisizione/autenticazione: funnel di conversione -> Abbonamento
const ACQUISITION_PATHS = [
  '/login', '/register', '/demo', '/forgot-password', '/reset-password',
];

// Feature di valore premium/utility -> Strumenti
const TOOLS_PATHS = [
  '/assistant', '/summary', '/map', '/trend-mensili',
];

export function mapPathToSection(pathname) {
  const p = pathname || '/';
  if (
    p === '/' ||
    p.startsWith('/about') ||
    p.startsWith('/contact') ||
    p.startsWith('/news')
  ) {
    return 'Home';
  }
  if (ACQUISITION_PATHS.some((s) => p === s || p.startsWith(s + '/'))) return 'Abbonamento';
  if (TOOLS_PATHS.some((s) => p === s || p.startsWith(s + '/'))) return 'Strumenti';
  if (DIARY_PATHS.some((s) => p === s || p.startsWith(s + '/'))) return 'Diario';
  if (p.startsWith('/shop')) return 'Negozio';
  if (p.startsWith('/community') || p.startsWith('/supporto')) return 'Community';
  if (p.startsWith('/abbonamento')) return 'Abbonamento';
  if (p.startsWith('/account') || p.startsWith('/settings')) return 'Account';
  return 'Altro';
}

export const PAGE_SECTIONS = [
  'Home', 'Diario', 'Negozio', 'Community', 'Abbonamento', 'Strumenti', 'Account', 'Altro',
];