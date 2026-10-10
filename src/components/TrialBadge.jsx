import React from 'react';
import { Clock, Lock } from 'lucide-react';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';

/**
 * Badge compatto mostrato nell'header per indicare i giorni di prova rimanenti
 * e lo stato di sola lettura se scaduto.
 */
export default function TrialBadge() {
  const { isSubscribed, isExpired, daysRemaining } = useTrialCountdown();

  if (isSubscribed) return null;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap border border-rose-500/30">
        <Lock className="w-3 h-3" />
        <span>Sola lettura</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[0.65rem] font-semibold whitespace-nowrap border border-emerald-500/30">
      <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
      <span>{daysRemaining} gg rimasti</span>
    </span>
  );
}