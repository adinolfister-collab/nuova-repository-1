import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, AlertTriangle, Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';
import { cn } from '@/lib/utils';

/**
 * Componente visivo che mostra il countdown dei 45 giorni di prova:
 * - Badge con giorni rimanenti
 * - Barra di progresso temporale (dal verde smeraldo all'ambra e alla scadenza)
 * - Stato di sola lettura con invito al piano quando scaduto
 *
 * Supporta le varianti: 'badge', 'card', 'banner'
 */
export default function TrialCountdownWidget({
  variant = 'card',
  className = '',
  showExpiryDate = true,
}) {
  const {
    daysRemaining,
    percentRemaining,
    percentElapsed,
    isExpired,
    isReadOnly,
    isSubscribed,
    formattedExpiry,
    isGuest,
  } = useTrialCountdown();

  // Se l'utente è già abbonato a pagamento, non serve mostrare il countdown
  if (isSubscribed) {
    return null;
  }

  // Tonalità visiva in base al tempo rimanente
  const isUrgent = daysRemaining <= 7 && !isExpired;
  const colorClass = isExpired
    ? 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30'
    : isUrgent
    ? 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30'
    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';

  const progressIndicatorColor = isExpired
    ? 'bg-rose-500'
    : isUrgent
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  // 1. VARIANTE BADGE (Compatta per Header, TopBar o Kicker)
  if (variant === 'badge') {
    return (
      <div className={cn('inline-flex flex-col gap-1', className)}>
        <div
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap',
            colorClass
          )}
        >
          {isExpired ? (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>Prova terminata • Sola lettura</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>{daysRemaining} {daysRemaining === 1 ? 'giorno rimasto' : 'gg rimasti'}</span>
            </>
          )}
        </div>
        {!isExpired && (
          <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', progressIndicatorColor)}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // 2. VARIANTE BANNER (In cima alle sezioni diario)
  if (variant === 'banner') {
    if (isExpired) {
      return (
        <div
          className={cn(
            'mb-4 rounded-xl border border-rose-500/30 bg-rose-500/[0.06] dark:bg-rose-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
            className
          )}
        >
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Prova di 45 giorni terminata · Modalità sola lettura
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                I tuoi dati storici e grafici restano sempre consultabili. Scegli un piano Premium per inserire nuovi pasti e sintomi.
              </p>
            </div>
          </div>
          <Link
            to="/abbonamento"
            className="shrink-0 rounded-xl bg-terracotta hover:bg-terracotta/90 text-terracotta-foreground text-xs font-semibold px-4 py-2.5 transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Scegli un piano</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      );
    }

    return (
      <div
        className={cn(
          'mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] dark:bg-emerald-950/20 p-3.5 sm:p-4',
          className
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                colorClass
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{daysRemaining} giorni di prova rimasti</span>
            </span>
            {isGuest && (
              <span className="text-[11px] text-muted-foreground">
                · Dati salvati in locale
              </span>
            )}
          </div>
          {showExpiryDate && formattedExpiry && (
            <p className="text-xs text-muted-foreground">
              Valida fino al <span className="font-medium text-foreground">{formattedExpiry}</span>
            </p>
          )}
        </div>

        {/* Barra di progresso temporale */}
        <div className="space-y-1">
          <div className="w-full bg-emerald-950/10 dark:bg-emerald-900/30 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', progressIndicatorColor)}
              style={{ width: `${percentRemaining}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-[10px] text-muted-foreground">
            <span>Inizio 45 giorni</span>
            <span>{percentRemaining}% rimanente</span>
            <span>Scadenza</span>
          </div>
        </div>
      </div>
    );
  }

  // 3. VARIANTE CARD (Predefinita: ricca ed elegante)
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 sm:p-5 transition-all',
        isExpired
          ? 'border-rose-500/30 bg-rose-500/[0.04]'
          : 'border-border bg-card shadow-xs',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
                colorClass
              )}
            >
              {isExpired ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Prova scaduta</span>
                </>
              ) : (
                <>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{daysRemaining} {daysRemaining === 1 ? 'giorno' : 'giorni'} di prova</span>
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              {isExpired ? 'Sola lettura' : 'Accesso completo gratuito'}
            </span>
          </div>
          <h4 className="font-heading text-base font-semibold text-foreground">
            {isExpired
              ? 'I tuoi 45 giorni gratuiti sono terminati'
              : 'Stai utilizzando i 45 giorni gratuiti'}
          </h4>
        </div>

        {isExpired ? (
          <Link
            to="/abbonamento"
            className="shrink-0 rounded-xl bg-terracotta text-terracotta-foreground text-xs font-semibold px-3.5 py-2 hover:bg-terracotta/90 transition-colors shadow-xs"
          >
            Scegli piano
          </Link>
        ) : isGuest ? (
          <Link
            to="/register"
            className="shrink-0 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 transition-colors shadow-xs flex items-center gap-1"
          >
            <span>Salva nel cloud</span>
          </Link>
        ) : null}
      </div>

      {/* Barra di progresso temporale dei 45 giorni */}
      <div className="space-y-1.5 my-3">
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Progresso periodo di prova</span>
          <span className="font-medium text-foreground">
            {isExpired ? '100% completato' : `${daysRemaining} gg rimanenti (${percentRemaining}%)`}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div
            className={cn('h-full transition-all duration-500 rounded-full', progressIndicatorColor)}
            style={{ width: `${isExpired ? 100 : percentRemaining}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>I tuoi dati storici restano sempre al sicuro</span>
        </div>
        {formattedExpiry && (
          <div>
            Scadenza: <span className="font-medium text-foreground">{formattedExpiry}</span>
          </div>
        )}
      </div>
    </div>
  );
}
