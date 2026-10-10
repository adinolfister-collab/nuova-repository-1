import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { FREE_SAVES, readGuestSaveCount, writeGuestSaveCount } from '@/lib/guestSaveCount';
import { trackGuestActivity } from '@/lib/guestTracking';

/**
 * Gate for guest (unauthenticated) data-saving actions.
 *  - kind === 'diary': il salvataggio NON blocca mai l'ospite (demo libera).
 *    Ogni multiplo di FREE_SAVES (3, 6, 9...) mostra un nudge positivo non
 *    bloccante che invita a registrarsi per rendere i dati permanenti.
 *  - kind === 'cloud': azioni che richiedono un account (export/sync) restano
 *    bloccate per gli ospiti.
 * Gli utenti autenticati passano sempre.
 */
export function useGuestSaveGate() {
  const { isAuthenticated, authChecked } = useAuth();
  const isGuest = authChecked && !isAuthenticated;
  const [count, setCount] = useState(() => readGuestSaveCount());
  const [showNudge, setShowNudge] = useState(false);

  const remaining = Math.max(0, FREE_SAVES - count);
  const canSave = true;

  const attemptSave = useCallback((kind = 'diary') => {
    if (!isGuest) return true;
    if (kind === 'cloud') {
      trackGuestActivity('diary_save', 'blocked');
      return false;
    }
    // diary: conta il salvataggio e mostra il suggerimento di sincronizzazione con 45 giorni gratis
    const next = readGuestSaveCount() + 1;
    writeGuestSaveCount(next);
    setCount(next);
    trackGuestActivity('diary_save', 'used');
    if (next === 1 || next % FREE_SAVES === 0) {
      trackGuestActivity('register_nudge_shown', 'used');
      setShowNudge(true);
    }
    return true;
  }, [isGuest]);

  return { isGuest, count, remaining, canSave, attemptSave, showNudge, setShowNudge };
}