// Template preconfigurati per la dashboard marketing admin.
// Ogni template precompila argomento, tono suggerito e CTA.
export const SOCIAL_TEMPLATES = [
  {
    id: 'launch',
    label: 'Lancio app',
    topic: 'IBD Care è online: il diario di salute privato e gratis per sempre per chi vive con Crohn o colite ulcerosa. Sintomi, alimentazione, terapie, esami e community, in un\'unica app, senza carta di credito.',
    tone: 'incoraggiante',
    cta: 'Inizia gratis per sempre, senza carta di credito',
  },
  {
    id: 'diary',
    label: 'Diario sintomi',
    topic: 'Registrare ogni giorno dolore, stanchezza e scariche aiuta a capire la tua malattia e a spiegarla meglio al medico. Bastano 30 secondi al giorno.',
    tone: 'rassicurante',
    cta: 'Inizia il tuo diario oggi, gratis per sempre',
  },
  {
    id: 'freemium',
    label: 'Freemium',
    topic: 'IBD Care è gratis per sempre, senza pubblicità e senza carta di credito: il diario di salute completo per chi vive con Crohn o colite ulcerosa, aperto a chiunque voglia capire se è la app giusta.',
    tone: 'sereno',
    cta: 'Crea un account gratis per sempre',
  },
  {
    id: 'scanner',
    label: 'Scanner esami',
    topic: 'Scansiona i referti con il telefono: l\'AI estrae i valori e crea una cronologia con confronto nel tempo, pronta per la visita specialistica.',
    tone: 'pratico',
    cta: 'Prova lo scanner esami, gratis per sempre',
  },
  {
    id: 'community',
    label: 'Community',
    topic: 'Non sei solo: nella community IBD Care trovi chi vive la tua stessa condizione, in 11 lingue, con traduzione automatica dei messaggi.',
    tone: 'caloroso',
    cta: 'Unisciti alla community, gratis per sempre',
  },
  {
    id: 'news',
    label: 'IBD News',
    topic: 'Aggiornamenti, studi e notizie sulla malattia infiammatoria intestinale: in IBD Care trovi una sezione dedicata alle ultime novità su Crohn e colite ulcerosa, sempre aggiornata.',
    tone: 'informativo',
    cta: 'Leggi le ultime news su IBD Care',
    deepLink: '/news',
  },
];

export const PLATFORMS = [
  { id: 'facebook', label: 'Facebook / IG', accent: 'text-blue-600' },
  { id: 'linkedin', label: 'LinkedIn', accent: 'text-sky-700' },
  { id: 'x', label: 'X / Twitter', accent: 'text-slate-800' },
  { id: 'instagram', label: 'Instagram', accent: 'text-pink-600' },
];

export const TONES = ['incoraggiante', 'rassicurante', 'pratico', 'entusiasta', 'sereno', 'caloroso', 'professionale', 'informativo'];

export const LANGS = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'ru', label: 'Русский' },
  { code: 'pl', label: 'Polski' },
  { code: 'ro', label: 'Română' },
  { code: 'sq', label: 'Shqip' },
  { code: 'zh', label: '中文' },
];

// Base URL usata per comporre i deep link nei post social.
// Personalizzabile: dominio custom se connesso, fallback sul dominio base44.
export const APP_BASE_URL = 'https://ibd-care.it';

// Pagine dell'app selezionabili come deep link da includere nei post.
// Il primo elemento (path vuoto) equivale a "nessun link".
export const APP_PAGES = [
  { path: '', label: 'Nessun link' },
  { path: '/', label: 'Home' },
  { path: '/demo', label: 'Demo interattiva' },
  { path: '/scarica', label: 'Scarica app' },
  { path: '/abbonamento', label: 'Abbonamento' },
  { path: '/community', label: 'Community' },
  { path: '/supporto', label: 'Supporto' },
  { path: '/about', label: 'About' },
  { path: '/contact', label: 'Contatti' },
  { path: '/privacy', label: 'Privacy' },
  { path: '/news', label: 'News IBD' },
  { path: '/symptoms', label: 'Diario sintomi' },
  { path: '/food', label: 'Diario alimentare' },
  { path: '/meds', label: 'Terapie' },
  { path: '/meds/calendar', label: 'Calendario terapie' },
  { path: '/records', label: 'Cartella clinica' },
  { path: '/esami', label: 'Esami' },
  { path: '/trends', label: 'Trend' },
  { path: '/symptom-charts', label: 'Grafici sintomi' },
  { path: '/correlazioni', label: 'Correlazioni' },
  { path: '/analisi', label: 'Analisi' },
  { path: '/trend-mensili', label: 'Trend mensili' },
  { path: '/assistant', label: 'Assistente AI' },
  { path: '/map', label: 'Mappa servizi' },
  { path: '/summary', label: 'Riepilogo' },
  { path: '/shop', label: 'Shop' },
];