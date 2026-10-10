import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';

export const TRIAL_DAYS = 45;
export const TRIAL_STORAGE_KEY = 'ibd_demo_trial_start';
export const DAY_MS = 86400000;
export const TOTAL_TRIAL_MS = TRIAL_DAYS * DAY_MS;

/**
 * Hook che gestisce il countdown dei 45 giorni di prova gratuita:
 * - Salva e legge lo stato di inizio in localStorage (ospiti/demo)
 * - Sincronizza con la scadenza cloud dell'account (free_until) se autenticato
 * - Calcola giorni, ore rimanenti e percentuale di avanzamento
 * - Verifica la scadenza e fornisce lo stato canWrite / isReadOnly per bloccare l'input dati
 */
export function useTrialCountdown() {
  const { user, isAuthenticated, authChecked } = useAuth();
  const { isSubscribed, status: subStatus } = useSubscription();

  // Helper di lettura da localStorage
  const getLocalStart = useCallback(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(TRIAL_STORAGE_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      return !isNaN(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }, []);

  const [localStartMs, setLocalStartMs] = useState(getLocalStart);
  const [now, setNow] = useState(() => Date.now());

  // Assicura che la prova in localStorage sia inizializzata se non ancora presente
  const startTrial = useCallback((forceTimestamp = null) => {
    if (typeof window === 'undefined') return Date.now();
    try {
      const ts = forceTimestamp || Date.now();
      localStorage.setItem(TRIAL_STORAGE_KEY, String(ts));
      setLocalStartMs(ts);
      return ts;
    } catch {
      return Date.now();
    }
  }, []);

  // Ripristina o azzera la prova locale
  const resetTrial = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(TRIAL_STORAGE_KEY);
      setLocalStartMs(null);
    } catch {
      /* ignore */
    }
  }, []);

  // Se l'ospite naviga senza trial salvata, la avvia automaticamente
  useEffect(() => {
    if (!isAuthenticated && !localStartMs) {
      startTrial();
    }
  }, [isAuthenticated, localStartMs, startTrial]);

  // Timer di aggiornamento ogni 60 secondi (e all'avvio)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Calcolo delle date di inizio e fine
  const { startMs, endMs, source } = useMemo(() => {
    // 1. Utente autenticato con data cloud free_until
    if (isAuthenticated && user?.free_until) {
      const cloudEnd = new Date(user.free_until).getTime();
      if (!isNaN(cloudEnd) && cloudEnd > 0) {
        return {
          startMs: cloudEnd - TOTAL_TRIAL_MS,
          endMs: cloudEnd,
          source: 'cloud',
        };
      }
    }

    // 2. Fallback su localStorage (ospite o utente senza free_until impostato)
    const start = localStartMs || now;
    return {
      startMs: start,
      endMs: start + TOTAL_TRIAL_MS,
      source: 'local',
    };
  }, [isAuthenticated, user?.free_until, localStartMs, now]);

  // Calcoli derivati
  const msRemaining = Math.max(0, endMs - now);
  const isTimeExpired = now >= endMs;

  // Se l'utente è abbonato attivo, non è mai scaduto
  const isPaidSubscriber = isSubscribed || ['active', 'lifetime', 'three_months'].includes(subStatus);
  const isExpired = !isPaidSubscriber && isTimeExpired;

  // Permesso di scrittura: bloccato solo se la prova è scaduta e non c'è abbonamento
  const canWrite = isPaidSubscriber || !isTimeExpired;
  const isReadOnly = isExpired;

  const daysRemaining = Math.max(0, Math.ceil(msRemaining / DAY_MS));
  const hoursRemaining = Math.max(0, Math.ceil(msRemaining / 3600000));

  // Percentuale rimanente (100% all'inizio -> 0% a scadenza)
  const percentRemaining = Math.min(
    100,
    Math.max(0, Math.round((msRemaining / TOTAL_TRIAL_MS) * 100))
  );
  // Percentuale consumata (0% all'inizio -> 100% a scadenza) per progress bar
  const percentElapsed = 100 - percentRemaining;

  // Data formattata in italiano
  const formattedExpiry = useMemo(() => {
    try {
      return new Date(endMs).toLocaleDateString('it-IT', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  }, [endMs]);

  // Guardia per proteggere azioni di scrittura: esegue fn solo se canWrite
  const guardAction = useCallback(
    (actionFn, onBlocked) => {
      if (canWrite) {
        return actionFn ? actionFn() : true;
      }
      if (onBlocked) {
        onBlocked();
      }
      return false;
    },
    [canWrite]
  );

  return {
    daysRemaining,
    hoursRemaining,
    percentRemaining,
    percentElapsed,
    isExpired,
    canWrite,
    isReadOnly,
    isSubscribed: isPaidSubscriber,
    isGuest: !isAuthenticated,
    authChecked,
    trialStartMs: startMs,
    trialEndMs: endMs,
    source,
    formattedExpiry,
    startTrial,
    resetTrial,
    guardAction,
  };
}
