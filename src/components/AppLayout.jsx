import React, { useContext, useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import MobileTopNav from '@/components/MobileTopNav';
import MobileBottomNav from '@/components/MobileBottomNav';
import SiteMenu from '@/components/SiteMenu';
import ExploreLabel from '@/components/ExploreLabel';
import DemoExpiredGate from '@/components/DemoExpiredGate';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import ShareMenu from '@/components/ShareMenu';
import PageRatingWidget from '@/components/PageRatingWidget';
import { guestHasAnyEntries, syncGuestEntriesToCloud } from '@/lib/guestEntries';
import { getDemoTrialState, ensureDemoTrialStarted, isDemoEnabledPath } from '@/lib/demoTrial';
import { useToast } from '@/components/ui/use-toast';
import { PersistentTabContext } from '@/components/PersistentTabs';

// Layout mobile-first unico per tutti i breakpoint: header universale in alto,
// bottom tab bar su mobile, contenuto centrato a piena larghezza (nessuna
// sidebar fissa, nessun toggle vista-desktop). Il blocco "Esplora la rivista"
// è la navigazione tra sezioni, sempre presente in fondo al contenuto.
//
// Per gli ospiti anonimi sulle rotte demo-enabled: avvia la trial device di
// 30gg al primo ingresso e, una volta scaduta, mostra il DemoExpiredGate a
// tutto schermo al posto del contenuto (la demo è l'unica trial gratuita).
export default function AppLayout({ children }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const { isActive: isTabActive = true } = useContext(PersistentTabContext);
  const [syncingGuest, setSyncingGuest] = useState(false);

  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  const gateGuest = !isAuthenticated && isDemoEnabledPath(path);
  // Avvia la trial demo device al primo ingresso in una rotta demo-enabled,
  // in modo sincrono: così il DemoBanner legge subito i 30 giorni rimasti
  // invece di mostrare 0 al primo paint. Idempotente.
  if (gateGuest && !getDemoTrialState().started) {
    ensureDemoTrialStarted();
  }
  const trial = getDemoTrialState();
  const demoExpired = gateGuest && trial.expired;

  // Al primo mount autenticato, migra le registrazioni guest dal dispositivo
  // alle entità cloud dell'utente, poi svuota la cache locale.
  useEffect(() => {
    if (!isTabActive) return;
    if (!isAuthenticated) return;
    if (!guestHasAnyEntries()) return;
    let cancelled = false;
    (async () => {
      setSyncingGuest(true);
      try {
        const n = await syncGuestEntriesToCloud();
        if (!cancelled && n > 0) {
          toast({ title: t('guest.synced_title'), description: t('guest.synced_desc') });
        }
      } catch {
        /* keep local entries on failure — user can retry next mount */
      } finally {
        if (!cancelled) setSyncingGuest(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await base44.auth.logout();
  };

  if (syncingGuest) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('guest.syncing')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ display: isTabActive ? undefined : 'none' }}
    >
      <MobileTopNav user={user} isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <MobileBottomNav isAuthenticated={isAuthenticated} />
      <ScrollToTopButton />
      <main className="min-h-screen pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:px-10 pt-5 md:py-10 pb-28 md:pb-12 max-w-4xl mx-auto">
        {demoExpired ? (
          <DemoExpiredGate />
        ) : (
          <>
            <ExploreLabel />
            {children}
            <div className="mt-8 md:mt-10 flex items-center gap-3 py-4 border-y border-border">
              <span className="font-heading text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t('share.page')}
              </span>
              <ShareMenu variant="inline" />
            </div>
            <SiteMenu />
            <div className="mt-8 md:mt-10 flex justify-center">
              <PageRatingWidget />
            </div>
          </>
        )}
      </main>
    </div>
  );
}