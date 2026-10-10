import { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getDemoTrialState } from '@/lib/demoTrial';

// Module-level cache for AUTHENTICATED users only, so navigation between
// pages (which remounts AppLayout under the keyed-route transition) doesn't
// refetch / flicker the paywall. Guest state is computed from the device
// trial on every render (it changes over time and must not be cached).
let cache = null;
let inflight = null;

export function clearSubscriptionCache() {
  cache = null;
  inflight = null;
}

// Stato subscription per un ospite anonimo, derivato dalla trial demo device:
// - non ancora avviata  -> demo attiva (30gg), accesso completo
// - avviata, non scaduta -> demo attiva, countdown giorni rimasti
// - scaduta            -> 'expired', accesso bloccato (DemoExpiredGate)
function guestState() {
  const trial = getDemoTrialState();
  if (!trial.started) {
    return { status: 'demo', isDemo: true, isSubscribed: true, trialRemaining: 45, trialEnd: null };
  }
  if (trial.expired) {
    return { status: 'expired', isDemo: true, isSubscribed: false, trialRemaining: 0, trialEnd: trial.trialEnd };
  }
  return { status: 'demo', isDemo: true, isSubscribed: true, trialRemaining: trial.daysRemaining, trialEnd: trial.trialEnd };
}

export function useSubscription() {
  const { isAuthenticated, authChecked } = useAuth();
  const isGuest = authChecked && !isAuthenticated;
  const [state, setState] = useState(() =>
    isGuest
      ? { data: guestState(), loading: false }
      : (cache ? { data: cache, loading: false } : { data: null, loading: true })
  );

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getSubscriptionStatus', {});
      cache = res.data || { status: 'none' };
    } catch (e) {
      cache = { status: 'none' };
    }
    setState({ data: cache, loading: false });
    return cache;
  }, []);

  useEffect(() => {
    if (!authChecked) return;
    if (isGuest) {
      setState({ data: guestState(), loading: false });
      return;
    }
    if (cache && !cache.isDemo) {
      setState({ data: cache, loading: false });
      return;
    }
    if (!inflight) {
      inflight = load().finally(() => { inflight = null; });
    } else {
      inflight.then(() => setState({ data: cache, loading: false }));
    }
  }, [load, isGuest, authChecked]);

  const data = state.data;
  const status = data?.status || 'none';
  const isDemo = !!data?.isDemo;
  const isSubscribed = isGuest ? !!data?.isSubscribed : ['active', 'trialing'].includes(status);
  const isTrialing = status === 'trialing';
  const isExpired = status === 'expired';
  const trialRemaining = data?.trialRemaining ?? 0;
  const trialEnd = data?.trialEnd ?? null;

  return { ...state, status, isSubscribed, isTrialing, isExpired, isDemo, trialRemaining, trialEnd, reload: load };
}