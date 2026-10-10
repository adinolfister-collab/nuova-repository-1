import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { useWriteGate } from '@/hooks/usePremiumGate';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';

// Mostrato in cima alle pagine diario quando i 45 giorni di prova sono scaduti:
// i dati e lo storico restano in sola lettura; per inserire nuovi dati è richiesto un piano.
export default function ReadonlyBanner() {
  const { t } = useI18n();
  const { isReadOnly: gateReadOnly } = useWriteGate();
  const { isReadOnly: countdownReadOnly } = useTrialCountdown();
  const isReadOnly = gateReadOnly || countdownReadOnly;

  if (!isReadOnly) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] dark:bg-rose-950/20 px-4 py-3 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
        <Lock className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{t('trial.expired_title')}</p>
        <p className="text-xs text-muted-foreground leading-snug">{t('trial.readonly_hint')}</p>
      </div>
      <Link
        to="/abbonamento"
        className="shrink-0 rounded-lg bg-terracotta text-terracotta-foreground text-xs font-semibold px-3 py-2 hover:bg-terracotta/90 transition-colors flex items-center gap-1 shadow-xs"
      >
        <span>{t('trial.cta_subscribe')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}