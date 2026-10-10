// Contenuto strutturato del "Report accessi IBD Care" (Guest / Demo-Trial /
// Utente loggato). Consumato sia dalla pagina admin (JSX) sia dal generatore
// PDF, per mantenere una singola fonte di verità. Stringhe in italiano: il
// report è uno strumento interno amministrativo.

export const ACCESS_REPORT = {
  title: 'Report accessi IBD Care',
  subtitle: 'Cosa si può fare in app: Guest · Demo-Trial · Utente loggato',
  generatedLabel: 'Generato il',
  intro:
    "L'app è pubblica (nessun login obbligatorio). La modalità dipende da autenticazione e stato abbonamento/trial.",

  modes: [
    {
      mode: 'Guest',
      when: 'Visitatore non autenticato su pagine pubbliche',
      storage: '— (sola lettura)',
      premium: 'No',
    },
    {
      mode: 'Demo-Trial',
      when: 'Guest entra in una pagina demo-enabled → contatore 45 giorni sul dispositivo',
      storage: 'localStorage (solo dispositivo)',
      premium: 'Sì (trattato come Premium)',
    },
    {
      mode: 'Utente loggato',
      when: 'Account registrato e autenticato',
      storage: 'Cloud (entità con RLS privata)',
      premium: 'Dipende dallo stato abbonamento',
    },
  ],

  subscriptionStates: [
    { state: 'trialing / active', desc: 'Trial 45gg attivo, abbonamento Stripe attivo → accesso pieno incluso Premium' },
    { state: 'expired', desc: 'Trial già consumata, nessun abbonamento → diario in sola lettura, scritture e Premium bloccati dal paywall' },
    { state: 'none', desc: 'Mai iscritto, nessuna trial → come expired' },
  ],

  sections: [
    {
      title: '1. Guest (ospite non autenticato, pagine pubbliche)',
      rows: [
        { area: 'Home', can: 'Hero marketing, CTA "Prova demo" e "Registrati", anteprime editoriali' },
        { area: 'Pagine pubbliche', can: '/about, /privacy, /contact, /scarica navigabili liberamente' },
        { area: 'Notizie IBD', can: '/news e /news/:id — lettura articoli e dettaglio' },
        { area: 'Community', can: '/community — lettura bacheca pubblica' },
        { area: 'Mappa servizi', can: '/map — ricerca centri IBD, bagni, farmacie' },
        { area: 'Shop', can: '/shop e /shop/:slug — vetrina prodotti (standby)' },
        { area: 'Abbonamento', can: '/abbonamento — visualizzazione piani Premium' },
        { area: 'Auth', can: 'Login / Register / Forgot / Reset — avvio registrazione' },
        { area: 'Demo', can: '/demo — interfaccia con dati simulati' },
        { area: 'Pagine demo-enabled', can: '/symptoms, /food, /meds, /esami, /trends… → entra in Demo-Trial' },
      ],
    },
    {
      title: '2. Demo-Trial (guest nei 45 giorni, dati in locale)',
      rows: [
        { area: 'Sintomi', can: 'CRUD sintomi (scala Bristol) salvati in locale' },
        { area: 'Diario alimentare', can: 'Pasti con item, calorie, tag trigger, tolleranza in locale; correlazione trigger visibile' },
        { area: 'Farmaci', can: 'Gestione terapie + dosi in locale; correlazione terapia→sintomi visibile' },
        { area: 'Calendario farmaci', can: 'Vedere/marcare assunzioni' },
        { area: 'Cartella esami', can: 'Timeline, confronto, calendario scrivibili in locale; Scanner AI e Import → GuestSignupCard' },
        { area: 'Andamenti', can: '/trends, /symptom-charts, /correlazioni, /analisi, /trend-mensili su dati locali' },
        { area: 'Assistente AI', can: 'Risposte simulate (demo) — nessun credito consumato' },
        { area: 'Riepilogo', can: '/summary — sintesi dati locali' },
        { area: 'Prepara la visita', can: 'Calcolo HBI / Partial Mayo live; salvataggio storico richiede registrazione' },
        { area: 'Report PDF / condivisione', can: 'Richiede Premium + autenticazione → nudge registrazione' },
      ],
    },
    {
      title: '3a. Utente loggato — Premium attivo (trial/abbonato)',
      rows: [
        { area: 'Diario completo', can: 'CRUD cloud su sintomi, food, farmaci, dosi, esami — privato (RLS)' },
        { area: 'Correlazioni', can: 'Trigger, terapia, cottura calcolate sui dati reali' },
        { area: 'Scanner esami AI + Import', can: 'Attivi (consumano crediti integrazione)' },
        { area: 'Assistente AI', can: 'Risposte reali LLM sui propri dati' },
        { area: 'Prepara la visita', can: 'Calcolo HBI/Mayo + salvataggio storico su cloud' },
        { area: 'Report PDF professionali', can: 'Esportazione PDF medico (sintomi, food, esami, dashboard clinico)' },
        { area: 'Report condivisibili', can: 'Link pubblico 30 giorni (/report/:shareId)' },
        { area: 'Calendario farmaci + promemoria', can: 'Notifiche assunzione (workflow)' },
        { area: 'Community', can: 'Post, reazioni, menzioni, DM, traduzioni' },
        { area: 'Account / Impostazioni', can: 'Profilo, lingua, export GDPR, ticket supporto, elimina account' },
      ],
    },
    {
      title: '3b. Utente loggato — Free / Trial scaduta (sola lettura)',
      rows: [
        { area: 'Tutte le pagine', can: 'Leggere i dati già registrati (banner "sola lettura")' },
        { area: 'Scritture', can: 'Bloccate → PremiumPaywall' },
        { area: 'Funzioni Premium', can: 'Bloccate → paywall o PremiumLockedCard' },
        { area: 'Pagine pubbliche + community lettura', can: 'Accessibili' },
        { area: 'Abbonamento', can: 'Pagare per riattivare (Stripe / Play Billing)' },
      ],
    },
  ],

  conversionFlow: [
    'Guest → entra in /symptoms → Demo-Trial (45gg, localStorage)',
    'Demo-Trial → registra → Utente loggato (dati migrati nel cloud automaticamente)',
    'Utente loggato trialing 45gg → Premium attivo',
    'Utente loggato scaduto → sola lettura + paywall → abbonati',
    'Demo-Trial 45gg scaduti → DemoExpiredGate → registra',
  ],

  notes: [
    'Le funzioni Premium con vere chiamate AI/LLM (Scanner, Assistente, PDF, correlazioni) consumano credit di integrazione — per questo sono gated.',
    'Per guest/demo le risposte AI sono simulate (demoResponses) per mostrare valore senza consumare crediti né innescare paywall (try before you buy).',
    'Piani Stripe attivi: €49,99/anno, €4,99/mese.',
  ],
};