import React from 'react';
import { Link } from 'react-router-dom';
import {
  Newspaper, Users, Activity, Utensils, Info, Mail,
  Pill, FileText, ScanLine, LineChart, BarChart3, Bot, MapPin, Stethoscope,
  FileBarChart, Settings as SettingsIcon, User, GitCompare, ShoppingBag, CreditCard, BookOpen,
  TrendingUp, Megaphone, Eye, PieChart, CalendarRange, Inbox, Smartphone, Flame,
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { isPremiumRoute } from '@/lib/premiumRoutes';
import PremiumLockBadge from '@/components/PremiumLockBadge';
import { useOpenTicketCount } from '@/hooks/useOpenTicketCount';
import { cn } from '@/lib/utils';

// Sezione "Esplora la rivista": voci raggruppate in 6 sezioni tematiche,
// ciascuna con intestazione serif. App pubblica: nessuna voce bloccata;
// account/settings nascoste ai guest; le voci admin solo per role=admin.
const DIARIO = [
  { to: '/symptoms', key: 'nav.symptoms', icon: Activity },
  { to: '/visita', key: 'nav.visita', icon: Stethoscope },
  { to: '/food', key: 'nav.food', icon: Utensils },
  { to: '/meds', key: 'nav.meds', icon: Pill },
  { to: '/records', key: 'nav.records', icon: FileText },
  { to: '/esami', key: 'nav.esami', icon: ScanLine },
];

const ANALISI = [
  { to: '/analisi', key: 'nav.analisi', icon: PieChart },
  { to: '/trends', key: 'nav.trends', icon: LineChart },
  { to: '/symptom-charts', key: 'nav.symptom_charts', icon: BarChart3 },
  { to: '/correlazioni', key: 'nav.correlazioni', icon: GitCompare },
  { to: '/calorie-analysis', key: 'nav.calorie_analysis', icon: Flame },
  { to: '/summary', key: 'nav.summary', icon: FileBarChart },
];

const COMMUNITY = [
  { to: '/community', key: 'nav.community', icon: Users },
  { to: '/news', key: 'nav.news', icon: Newspaper },
];

const RISORSE = [
  { to: '/assistant', key: 'nav.assistant', icon: Bot },
  { to: '/trend-mensili', key: 'nav.trend_mensili', icon: CalendarRange },
  { to: '/map', key: 'nav.map', icon: MapPin },
  { to: '/demo', key: 'nav.guide', icon: BookOpen },
  { to: '/about', key: 'nav.about', icon: Info },
  { to: '/contact', key: 'nav.contact', icon: Mail },
];

// Account: mostra Impostazioni/Profilo solo se autenticato.
const ACCOUNT_BASE = [
  { to: '/abbonamento', key: 'nav.abbonamento', icon: CreditCard },
  { to: '/shop', key: 'nav.shop', icon: ShoppingBag },
];
const ACCOUNT_AUTH = [
  { to: '/settings', key: 'nav.settings', icon: SettingsIcon },
  { to: '/account', key: 'settings.account', icon: User },
];

const ADMIN_ITEMS = [
  { to: '/admin/conversioni', key: 'nav.conversions', icon: TrendingUp },
  { to: '/admin/marketing', key: 'nav.marketing', icon: Megaphone },
  { to: '/admin/guest-preview', key: 'nav.guest_preview', icon: Eye },
  { to: '/admin/supporto', key: 'nav.admin_support', icon: Inbox },
  { to: '/admin/business', key: 'nav.business', icon: LineChart },
  { to: '/admin/access-report', key: 'nav.access_report', icon: FileText },
  { to: '/shop/admin', key: 'shop.admin_nav', icon: ShoppingBag },
  { to: '/admin/screenshots', key: 'nav.screenshots', icon: Smartphone },
  { to: '/admin/play-store', key: 'nav.play_store', icon: FileText },
];

function MenuCard({ item, t, isExpired, openTicketCount }) {
  const showSupportDot = item.to === '/admin/supporto' && openTicketCount > 0;
  return (
    <Link
      to={item.to}
      className={cn(
        'group flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-sm transition-all hover:shadow-md',
        item.admin
          ? 'border-primary/30 bg-primary/5 hover:border-primary/50'
          : 'border-border bg-card hover:border-terracotta/50'
      )}
    >
      <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors', item.admin ? 'bg-primary/10' : 'bg-accent group-hover:bg-terracotta/15')}>
        <item.icon className={cn('w-5 h-5', item.admin ? 'text-primary' : 'text-primary')} />
      </span>
      <span className="flex-1 min-w-0 font-heading text-base md:text-lg font-medium tracking-tight truncate text-foreground">
        {t(item.key)}
      </span>
      {isExpired && isPremiumRoute(item.to) && <PremiumLockBadge size="nav" className="ml-1" />}
      {showSupportDot && (
        <span className="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 text-[0.65rem] font-semibold rounded-full bg-red-500 text-white animate-pulse shrink-0">
          {openTicketCount}
        </span>
      )}
      {item.admin && <span className="text-[0.6rem] font-semibold uppercase tracking-wide bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">Admin</span>}
    </Link>
  );
}

function Group({ titleKey, items, t, isExpired, openTicketCount }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-px w-5 bg-terracotta/60" />
        <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-terracotta">
          {t(titleKey)}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {items.map((item) => (
          <MenuCard key={item.to} item={item} t={t} isExpired={isExpired} openTicketCount={openTicketCount} />
        ))}
      </div>
    </div>
  );
}

export default function SiteMenu() {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const { isExpired } = useSubscription();
  const isAdmin = user?.role === 'admin';
  const openTicketCount = useOpenTicketCount(isAdmin);

  const accountItems = isAuthenticated
    ? [...ACCOUNT_AUTH, ...ACCOUNT_BASE]
    : ACCOUNT_BASE;
  const adminItems = isAdmin ? ADMIN_ITEMS.map((it) => ({ ...it, admin: true })) : [];

  return (
    <section className="my-8 md:my-10">
      <div className="flex items-start gap-3 mb-5">
        <div className="mt-2 h-10 w-1.5 rounded-full bg-terracotta shrink-0" />
        <div className="max-w-2xl">
          <p className="font-heading text-xl md:text-2xl font-semibold text-primary tracking-tight leading-snug">
            {t('home.explore_title') || 'Esplora la rivista'}
          </p>
          <p className="mt-1 text-sm md:text-[0.95rem] text-muted-foreground leading-relaxed">
            {t('home.explore_desc') || "Tutte le sezioni dell'app, a portata di tap."}
          </p>
        </div>
      </div>

      <div className="space-y-7">
        <Group titleKey="nav.group_diario" items={DIARIO} t={t} isExpired={isExpired} />
        <Group titleKey="nav.group_analisi" items={ANALISI} t={t} isExpired={isExpired} />
        <Group titleKey="nav.group_community" items={COMMUNITY} t={t} isExpired={isExpired} />
        <Group titleKey="nav.group_risorse" items={RISORSE} t={t} isExpired={isExpired} />
        <Group titleKey="nav.group_account" items={accountItems} t={t} isExpired={isExpired} />
        {adminItems.length > 0 && (
          <Group titleKey="nav.group_admin" items={adminItems} t={t} isExpired={isExpired} openTicketCount={openTicketCount} />
        )}
      </div>
    </section>
  );
}