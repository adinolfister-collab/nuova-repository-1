import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  MousePointerClick,
  Users,
  Clock,
  Globe2,
  TrendingDown,
  FileText,
  Compass,
  Monitor,
  Layers,
  Eye,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import ReportTable from '@/components/admin/ReportTable';
import TrialUsersTable from '@/components/admin/TrialUsersTable';
import DemoGuestReport from '@/components/admin/DemoGuestReport';
import AdminCrashes from '@/components/admin/AdminCrashes';
import DormantRemindersPanel from '@/components/admin/DormantRemindersPanel';
import ReengagementCampaignButton from '@/components/admin/ReengagementCampaignButton';
import { cn } from '@/lib/utils';

const RANGES = [
  { value: 'today', label: 'Oggi' },
  { value: '7d', label: '7 giorni' },
  { value: '30d', label: '30 giorni' },
  { value: '90d', label: '90 giorni' },
  { value: 'all', label: 'Totale' },
];

const FUNNEL_COLORS = [
  'bg-chart-1',
  'bg-chart-2',
  'bg-chart-3',
  'bg-chart-4',
  'bg-chart-5',
];

const DEVICE_LABELS = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };

// Etichette leggibili per le feature tracciate negli eventi ospiti
const GUEST_FEATURE_LABELS = {
  symptom_write: 'Sintomi',
  food_write: 'Diario alimentare',
  med_write: 'Terapie',
  dose_write: 'Dose terapia',
  record_write: 'Referti',
  community_post: 'Community',
  assistant_msg: 'Assistente Cary',
  exam_scan: 'Scanner esami',
  pdf_export: 'Export PDF',
  food_report: 'Report gastro',
  chart_range: 'Range grafico',
  diary_save: 'Salvataggio diario',
  register_nudge_shown: 'Nudge registrazione',
  demo_gate_shown: 'Gate demo (viste)',
  demo_gate_registered: 'Gate demo (registrati)',
};

const GUEST_SOURCE_LABELS = {
  used: 'Usato (demo)',
  demo: 'Interazione demo',
  blocked: 'Bloccato (paywall)',
};

// Etichette leggibili per i percorsi (path nudi -> nomi in italiano)
const PAGE_LABELS = {
  '/': 'Home',
  '/about': 'Chi siamo',
  '/privacy': 'Privacy',
  '/demo': 'Demo',
  '/scarica': 'Scarica app',
  '/contact': 'Contatti',
  '/news': 'IBD News',
  '/community': 'Community',
  '/supporto': 'Supporto',
  '/symptoms': 'Sintomi',
  '/food': 'Diario alimentare',
  '/meds': 'Farmaci',
  '/records': 'Cartelle cliniche',
  '/esami': 'Esami',
  '/trends': 'Andamenti',
  '/symptom-charts': 'Grafici sintomi',
  '/correlazioni': 'Correlazioni',
  '/assistant': 'Assistente Cary',
  '/map': 'Mappa servizi',
  '/summary': 'Riepilogo',
  '/abbonamento': 'Abbonamento',
  '/shop': 'Negozio',
  '/settings': 'Impostazioni',
  '/account': 'Account',
  '/login': 'Login',
  '/register': 'Registrati',
  '/forgot-password': 'Password dimenticata',
  '/reset-password': 'Reset password',
  '/admin/conversioni': 'Conversioni',
  '/admin/marketing': 'Marketing',
  '/shop/admin': 'Gestione negozio',
};

// Nomi dei paesi da inglese a italiano (fallback: nome originale)
const COUNTRY_IT = {
  'Italy': 'Italia',
  'United States': 'Stati Uniti',
  'United Kingdom': 'Regno Unito',
  'Germany': 'Germania',
  'France': 'Francia',
  'Spain': 'Spagna',
  'Switzerland': 'Svizzera',
  'Netherlands': 'Paesi Bassi',
  'Belgium': 'Belgio',
  'Portugal': 'Portogallo',
  'Russia': 'Russia',
  'Poland': 'Polonia',
  'Romania': 'Romania',
  'Albania': 'Albania',
  'Greece': 'Grecia',
  'Sweden': 'Svezia',
  'Norway': 'Norvegia',
  'Denmark': 'Danimarca',
  'Finland': 'Finlandia',
  'Austria': 'Austria',
  'Ireland': 'Irlanda',
  'Croatia': 'Croazia',
  'Czech Republic': 'Repubblica Ceca',
  'Czechia': 'Cechia',
  'Hungary': 'Ungheria',
  'Brazil': 'Brasile',
  'Argentina': 'Argentina',
  'Mexico': 'Messico',
  'Canada': 'Canada',
  'Australia': 'Australia',
  'Japan': 'Giappone',
  'China': 'Cina',
  'India': 'India',
  'Turkey': 'Turchia',
  'Egypt': 'Egitto',
  'Morocco': 'Marocco',
  'South Africa': 'Sudafrica',
  'United Arab Emirates': 'Emirati Arabi Uniti',
  'Saudi Arabia': 'Arabia Saudita',
  'Israel': 'Israele',
  'Singapore': 'Singapore',
  'South Korea': 'Corea del Sud',
  'Indonesia': 'Indonesia',
};

function pageLabel(path) {
  if (!path || path === 'Unknown') return 'Percorso non rilevato';
  if (PAGE_LABELS[path]) return PAGE_LABELS[path];
  if (path.startsWith('/shop/') && path !== '/shop/admin') return 'Prodotto negozio';
  if (path.startsWith('/news/')) return 'Articolo news';
  // Qualsiasi altro path non mappato corrisponde a una rotta inesistente (404)
  return 'Pagina non trovata';
}

function countryLabel(c) {
  if (!c || c === 'Unknown') return 'Non rilevato';
  return COUNTRY_IT[c] || c;
}

function formatDuration(sec) {
  if (!sec || sec < 1) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

export default function AdminConversions() {
  const { user } = useAuth();
  const [range, setRange] = useState('7d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke('getConversionFunnel', { range })
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  if (user && user.role !== 'admin') return <Navigate to="/" replace />;
  if (!user) return null;

  const visite = data?.visite || 0;
  const visitatoriUnici = data?.visitatoriUnici || 0;
  const visitatoriAnonimi = data?.visitatoriAnonimi || 0;
  const visitatoriLoggati = data?.visitatoriLoggati || 0;
  const avgSessionSec = data?.avgSessionSec || 0;
  const funnel = data?.funnel || [];
  const topCountries = (data?.topCountries || []).map((c) => ({
    key: c.country || 'Unknown',
    label: countryLabel(c.country),
    views: c.sessions,
    sessions: c.sessions,
  }));
  const topPages = (data?.topPages || []).map((p) => ({
    ...p,
    label: pageLabel(p.key),
  }));
  const topReferrers = data?.topReferrers || [];
  const devices = (data?.devices || []).map((d) => ({
    key: DEVICE_LABELS[d.key] || d.key,
    views: d.views,
    sessions: d.sessions,
  }));
  const sectionDuration = data?.sectionDuration || [];
  const guestStats = data?.guestStats || null;
  const maxFunnel = Math.max(1, ...funnel.map((f) => f.value));
  const premiumRate =
    visite > 0 && funnel.length
      ? Math.round(((funnel[funnel.length - 1]?.value || 0) / visite) * 100)
      : 0;
  const totalViews = topPages.reduce((a, p) => a + (p.views || 0), 0) || visite;

  return (
    <AppLayout>
      <PageHeader
        title="Conversioni"
        subtitle="Report dettagliati: pagine visitate, provenienza, paese, dispositivo, tempo di permanenza e funnel di conversione."
      />

      {/* Range filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              'px-3.5 py-1.5 rounded-full text-sm border transition-colors',
              range === r.value
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border hover:bg-accent'
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard icon={MousePointerClick} label="Visite totali" value={loading ? '—' : visite} sub="sessioni uniche" />
        <StatCard
          icon={Users}
          label="Visitatori unici"
          value={loading ? '—' : visitatoriUnici}
          sub={loading ? 'anonimi + loggati' : `${visitatoriAnonimi} anonimi · ${visitatoriLoggati} loggati`}
        />
        <StatCard icon={Clock} label="Permanenza media" value={loading ? '—' : formatDuration(avgSessionSec)} sub="per sessione" />
        <StatCard icon={TrendingDown} label="Conversione Premium" value={loading ? '—' : `${premiumRate}%`} sub="abbonamento / visite" />
      </div>

      {/* Funnel */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
            <Layers className="w-4 h-4 text-terracotta" />
            Funnel di conversione
          </h2>
          {loading ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground">Caricamento…</div>
          ) : (
            <div className="space-y-3">
              {funnel.map((step, i) => {
                const widthPct = Math.max(2, Math.round((step.value / maxFunnel) * 100));
                return (
                  <div key={step.key}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium">{step.label}</span>
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{step.value}</span>
                        {i > 0 && <span className="ml-2 text-xs">{step.pct}% del precedente</span>}
                      </span>
                    </div>
                    <div className="h-8 w-full rounded-lg bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-lg flex items-center justify-end pr-2 text-xs font-medium text-white transition-all',
                          FUNNEL_COLORS[i % FUNNEL_COLORS.length]
                        )}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione Ospiti (attivita' demo) */}
      <Card className="mb-6">
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold mb-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-terracotta" />
            Ospiti — attivita' in demo mode
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Salvataggi del diario, interazioni demo (assistente/scanner/PDF) e tentativi bloccati sui premium da visitatori anonimi.
          </p>
          {loading || !guestStats ? (
            <Loading />
          ) : guestStats.total === 0 ? (
            <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
              Nessuna attivita' ospite registrata nel periodo.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
                <StatCard icon={MousePointerClick} label="Eventi totali" value={guestStats.total} sub="azione ospiti" />
                <StatCard icon={Users} label="Visitatori distinti" value={guestStats.distinctVisitors} sub="ospiti unici" />
                <StatCard icon={Clock} label="Sessioni distinte" value={guestStats.distinctSessions} sub="sessioni demo" />
                <StatCard icon={TrendingDown} label="Demo → registrazione" value={`${guestStats.demoToRegistrationRate}%`} sub={`${guestStats.demoToRegistration} convertiti`} />
              </div>
              {guestStats.gateShown > 0 && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                  <StatCard icon={Eye} label="Gate demo mostrato" value={guestStats.gateShown} sub="viste gate scaduto" />
                  <StatCard icon={Users} label="Registrazioni da gate" value={guestStats.gateRegistered} sub="click Registrati" />
                  <StatCard icon={TrendingDown} label="Conversione gate" value={`${guestStats.gateConversionRate}%`} sub="registrati / viste" />
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-heading text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Per funzione</h3>
                  <ReportTable
                    rows={guestStats.byFeature.map((f) => ({
                      key: GUEST_FEATURE_LABELS[f.feature] || f.feature,
                      views: f.count,
                      sessions: f.count,
                    }))}
                    total={guestStats.total}
                    emptyText="Nessun evento."
                  />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Per tipo azione</h3>
                  <ReportTable
                    rows={guestStats.bySource.map((s) => ({
                      key: GUEST_SOURCE_LABELS[s.source] || s.source,
                      views: s.count,
                      sessions: s.count,
                    }))}
                    total={guestStats.total}
                    emptyText="Nessun evento."
                    barColor="bg-chart-2"
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DemoGuestReport />

      {/* Pagine visitate + Provenienza */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-terracotta" />
              Pagine più visitate
            </h2>
            {loading ? (
              <Loading />
            ) : (
              <ReportTable rows={topPages} total={totalViews} emptyText="Nessuna page-view registrata." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <Compass className="w-4 h-4 text-terracotta" />
              Provenienza visitatori
            </h2>
            {loading ? (
              <Loading />
            ) : (
              <ReportTable rows={topReferrers} total={visite} emptyText="Nessun referrer registrato." barColor="bg-chart-2" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Paesi + Dispositivi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <Globe2 className="w-4 h-4 text-terracotta" />
              Nazionalità (paesi top)
            </h2>
            {loading ? (
              <Loading />
            ) : (
              <ReportTable rows={topCountries} total={visite} emptyText="Nessun dato di visita." barColor="bg-chart-4" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-terracotta" />
              Dispositivi
            </h2>
            {loading ? (
              <Loading />
            ) : (
              <ReportTable rows={devices} total={visite} emptyText="Nessun dato dispositivo." barColor="bg-chart-5" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Permanenza per sezione */}
      <Card>
        <CardContent className="pt-5">
          <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-terracotta" />
            Permanenza per sezione
          </h2>
          {loading ? (
            <Loading />
          ) : sectionDuration.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Nessun dato di permanenza.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 font-medium">Sezione</th>
                  <th className="py-2 font-medium text-right">Tempo medio</th>
                  <th className="py-2 font-medium text-right">View</th>
                </tr>
              </thead>
              <tbody>
                {sectionDuration.map((s) => (
                  <tr key={s.section} className="border-b border-border last:border-0">
                    <td className="py-2.5 font-medium">{s.section}</td>
                    <td className="py-2.5 text-right font-medium tabular-nums">{formatDuration(s.avgSec)}</td>
                    <td className="py-2.5 text-right text-muted-foreground tabular-nums">{s.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Utenti & Trial */}
      <div className="mt-6">
        <TrialUsersTable />
      </div>

      {/* Campagna re-engagement one-shot (dormienti storici) */}
      <ReengagementCampaignButton />

      {/* Promemoria inserimenti 48h */}
      <DormantRemindersPanel />

      {/* Crash monitor */}
      <AdminCrashes />
    </AppLayout>
  );
}

function Loading() {
  return <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Caricamento…</div>;
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-8 h-8 rounded-lg bg-terracotta/15 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-terracotta" />
          </span>
          <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        </div>
        <p className="text-2xl font-heading font-semibold">{value}</p>
        {sub && <p className="text-[0.65rem] text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}