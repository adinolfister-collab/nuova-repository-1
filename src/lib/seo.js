// Central SEO configuration for IBD Care.
// Dominio canonico usato per canonical, og:url e hreflang.
export const SITE_BASE = 'https://ibd-care.it';

// Immagine Open Graph di marca ospitata (sostituisce l'Unsplash hotlinkato).
export const DEFAULT_OG_IMAGE =
  'https://media.base44.com/images/public/6a80de4be246a7b03417c238/3cbe11905_generated_image.png';

// Immagine social dedicata 1200×630 per la demo (generata ad hoc, stile brand).
export const DEMO_OG_IMAGE =
  'https://media.base44.com/images/public/6a80de4be246a7b03417c238/41e1365ec_generated_image.png';

// Title/description di default (Home) — keyword-rich, usati anche come fallback SSR.
export const DEFAULT_TITLE =
  'IBD Care – Diario sintomi IBD, alimentazione e terapie';
export const DEFAULT_DESC =
  'App gratuita per gestire la malattia infiammatoria intestinale (Crohn, colite ulcerosa): diario sintomi, alimentazione, terapie, esami, mappa servizi e notizie IBD. Privata, in 11 lingue.';

// Mappa rotta -> meta. titleKey/descKey sono chiavi i18n (fallback IT automatico).
// noindex = true per route private/admin/auth che non devono essere indicizzate.
const STATIC_ROUTES = [
  { path: '/', titleKey: null, descKey: null },
  { path: '/about', titleKey: 'about.title', descKey: 'about.subtitle' },
  { path: '/privacy', titleKey: 'privacy.title', descKey: 'privacy.subtitle', noindex: true },
  { path: '/demo', titleKey: 'guide.title', descKey: 'share.demo_desc', image: DEMO_OG_IMAGE },
  { path: '/contact', titleKey: 'nav.contact', descKey: 'app.tagline' },
  { path: '/invita', titleKey: 'invite.page_title', descKey: 'invite.page_subtitle' },
  { path: '/news', titleKey: 'news.title', descKey: 'news.page_subtitle' },
  { path: '/community', titleKey: 'community.title', descKey: 'community.subtitle' },
  { path: '/symptoms', titleKey: 'symptoms.title', descKey: 'symptoms.subtitle' },
  { path: '/food', titleKey: 'food.title', descKey: 'food.subtitle' },
  { path: '/meds', titleKey: 'meds.title', descKey: 'meds.subtitle' },
  { path: '/records', titleKey: 'records.title', descKey: 'records.subtitle' },
  { path: '/esami', titleKey: 'exams.title', descKey: 'exams.subtitle' },
  { path: '/trends', titleKey: 'trends.title', descKey: 'trends.subtitle' },
  { path: '/symptom-charts', titleKey: 'symptom_charts.title', descKey: 'symptom_charts.subtitle' },
  { path: '/correlazioni', titleKey: 'correlazioni.title', descKey: 'correlazioni.subtitle' },
  { path: '/assistant', titleKey: 'assistant.title', descKey: 'assistant.subtitle' },
  { path: '/map', titleKey: 'map.title', descKey: 'map.subtitle' },
  { path: '/summary', titleKey: 'summary.title', descKey: 'summary.subtitle' },
  { path: '/abbonamento', titleKey: 'premium.title', descKey: 'premium.subtitle' },
  // noindex: auth, account, shop, admin
  { path: '/login', titleKey: 'auth.login_btn', descKey: 'auth.login_subtitle', noindex: true },
  { path: '/register', titleKey: 'register.create', descKey: 'register.value_sub', noindex: true },
  { path: '/forgot-password', titleKey: 'auth.forgot', descKey: 'auth.login_subtitle', noindex: true },
  { path: '/reset-password', titleKey: 'auth.forgot', descKey: 'auth.login_subtitle', noindex: true },
  { path: '/settings', titleKey: 'settings.title', descKey: 'settings.privacy_desc', noindex: true },
  { path: '/account', titleKey: 'settings.account', descKey: 'settings.privacy_desc', noindex: true },
  { path: '/shop', titleKey: 'shop.title', descKey: 'shop.subtitle', noindex: true },
  { path: '/shop/admin', titleKey: 'shop.admin_title', descKey: 'shop.admin_subtitle', noindex: true },
  { path: '/admin/conversioni', titleKey: 'nav.conversions', descKey: 'app.tagline', noindex: true },
  { path: '/admin/marketing', titleKey: 'app.name', descKey: 'app.tagline', noindex: true },
];

// Rotte con parametro (controllate dopo le statiche).
const PARAM_ROUTES = [
  { path: '/news/:id', titleKey: 'news.title', descKey: 'news.page_subtitle', noindex: true },
  { path: '/shop/:slug', titleKey: 'shop.title', descKey: 'shop.subtitle', noindex: true },
];

function matchParam(routePath, pathname) {
  const pattern = routePath.replace(/:[^/]+/g, '[^/]+');
  const re = new RegExp(`^${pattern}$`);
  return re.test(pathname);
}

export function resolveRouteMeta(pathname, t) {
  const found =
    STATIC_ROUTES.find((r) => r.path === pathname) ||
    PARAM_ROUTES.find((r) => matchParam(r.path, pathname));

  if (!found) {
    return { title: null, description: null, noindex: false, type: 'website', path: pathname };
  }
  return {
    title: found.titleKey ? t(found.titleKey) : null,
    description: found.descKey ? t(found.descKey) : null,
    noindex: !!found.noindex,
    type: 'website',
    path: pathname,
    image: found.image || null,
  };
}

// Helper DOM: aggiorna un meta esistente o lo crea (nessun duplicato).
export function upsertMeta(selector, attrs) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
}

export function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    document.head.appendChild(el);
  }
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
}