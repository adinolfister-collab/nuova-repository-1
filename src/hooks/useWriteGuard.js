import { useCallback } from 'react';
import { useRegisterGate } from '@/hooks/useRegisterGate';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useGuestSaveGate } from '@/hooks/useGuestSaveGate';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';
import { trackTrialFeature } from '@/lib/trialTracking';
import { trackGuestActivity } from '@/lib/guestTracking';

// Combined write gate for diary pages. In demo mode (unauthenticated guest)
// writes are allowed during the 45-day trial and persisted to localStorage;
// the 1st save and subsequent intervals show a polite sync nudge (RegisterNudge).
// When the 45-day trial expires, input is blocked, entering read-only mode,
// disabling recording buttons and opening the Premium plan choice.
export function useWriteGuard() {
  const registerGate = useRegisterGate();
  const { requirePremium, showPaywall, setShowPaywall, isSubscribed, isDemo } = usePremiumGate();
  const { attemptSave, showNudge, setShowNudge } = useGuestSaveGate();
  const {
    canWrite,
    isReadOnly,
    isExpired,
    daysRemaining,
    percentRemaining,
    percentElapsed,
    formattedExpiry,
  } = useTrialCountdown();

  const guard = useCallback((feature) => {
    // Blocco esplicito se la prova di 45 giorni è scaduta
    if (!canWrite) {
      if (feature) trackTrialFeature(feature, 'blocked');
      requirePremium(feature);
      return false;
    }

    // Modalità demo attiva (ospite non scaduto): salva in locale + gestisce nudge
    if (isDemo) {
      attemptSave('diary');
      if (feature) trackGuestActivity(feature, 'used');
      return true;
    }

    if (!registerGate()) return false;

    if (isSubscribed) {
      if (feature) trackTrialFeature(feature, 'used');
      return true;
    }

    if (feature) trackTrialFeature(feature, 'blocked');
    requirePremium();
    return false;
  }, [canWrite, registerGate, requirePremium, isSubscribed, isDemo, attemptSave]);

  return {
    guard,
    showPaywall,
    setShowPaywall,
    showNudge,
    setShowNudge,
    isSubscribed,
    isDemo,
    canWrite,
    isReadOnly,
    isExpired,
    daysRemaining,
    percentRemaining,
    percentElapsed,
    formattedExpiry,
  };
}