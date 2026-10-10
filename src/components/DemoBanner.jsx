import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, RotateCcw, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { clearAllGuestEntries } from '@/lib/guestEntries';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';

// Banner demo con countdown dei 45 giorni e barra di avanzamento temporale.
// Mostrato in cima alle pagine diario ai visitatori non autenticati durante la prova.
// Alla scadenza lascia il posto al ReadonlyBanner e disabilita gli input.
export default function DemoBanner({ className = '', onReset }) {
  const { t } = useI18n();
  const { daysRemaining, percentRemaining, isExpired, resetTrial } = useTrialCountdown();

  if (isExpired) return null;

  const handleReset = () => {
    clearAllGuestEntries();
    resetTrial();
    onReset?.();
  };

  return (
    <div className={`mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] dark:bg-emerald-950/20 px-4 py-3 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <Eye className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground">{t('demo.mode_title')}</p>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                ✨ {daysRemaining} gg rimasti
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-snug mt-0.5">
              Stai provando la demo guidata con 45 giorni gratuiti senza carta di credito.
            </p>
          </div>
        </div>
        <Link
          to="/register"
          className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2.5 transition-all shadow-sm flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Inizia 45 Giorni Gratis</span>
        </Link>
      </div>

      {/* Barra temporale di progresso dei 45 giorni */}
      <div className="w-full bg-emerald-950/10 dark:bg-emerald-900/30 rounded-full h-1 mt-2.5 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
          style={{ width: `${percentRemaining}%` }}
        />
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-500/15">
        <p className="text-[11px] text-muted-foreground leading-snug pr-2">
          {percentRemaining}% della prova ancora disponibile · Dati salvati in locale
        </p>
        <button
          onClick={handleReset}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          <RotateCcw className="w-3 h-3" /> {t('demo.reset')}
        </button>
      </div>
    </div>
  );
}