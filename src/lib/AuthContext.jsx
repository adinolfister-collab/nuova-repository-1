import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { resetGuestSaveCount } from '@/lib/guestSaveCount';
import { useGuestPreview } from '@/lib/GuestPreviewContext';
import { setCrashUser } from '@/lib/crashReporter';
import { activateCloudTrial } from '@/lib/activateCloudTrial';
import { clearSubscriptionCache } from '@/hooks/useSubscription';

// Una sola attivazione trial per sessione: evita loop di retry se la
// chiamata fallisce o se checkUserAuth viene rieseguito.
let trialActivationAttempted = false;

// Processa un referral pending salvato in localStorage da Register (?ref=USER_ID).
// Chiama il backend function processInviteReferral che attribuisce referrer_id,
// attiva la trial estesa di 45gg per l'invitee ed estende la trial del referrer
// (+7gg, max 3). Idempotente: il backend ignora se referrer_id già impostato.
const REF_KEY = 'inviteReferrerId';
let referralProcessing = false;
function processPendingReferral() {
  if (referralProcessing) return;
  let referrerId;
  try { referrerId = localStorage.getItem(REF_KEY); } catch (e) { return; }
  if (!referrerId) return;
  referralProcessing = true;
  base44.functions.invoke('processInviteReferral', { referrer_id: referrerId })
    .then((res) => {
      try { localStorage.removeItem(REF_KEY); } catch (e) { /* ignore */ }
      if (res?.ok) clearSubscriptionCache();
    })
    .catch(() => { referralProcessing = false; /* retry al prossimo login */ });
}

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  // Tieni aggiornato l'utente corrente per il crash reporter (vive fuori
  // dal context): serve ad allegare user_id ai report e a escludere l'admin.
  useEffect(() => {
    setCrashUser(user);
  }, [user]);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      // In standalone / preview mode or when no valid Base44 app ID is configured,
      // fallback to unauthenticated/guest preview without throwing 404 errors.
      if (!appParams.appId || appParams.appId === 'undefined' || appParams.appId === 'null') {
        setIsLoadingPublicSettings(false);
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        return;
      }
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      try {
        const appClient = createAxiosClient({
          baseURL: `/api/apps/public`,
          headers: {
            'X-App-Id': appParams.appId
          },
          token: appParams.token, // Include token if available
          interceptResponses: true
        });
        
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.warn('App state check notice (standalone / guest mode):', appError?.message || appError);
        
        // Handle app-level errors only when explicitly requested by backend
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          // Fallback gracefully without blocking the application
          setIsAuthenticated(false);
          setIsLoadingAuth(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      }
    } catch (error) {
      console.warn('App state initialization completed in guest mode:', error);
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      resetGuestSaveCount();
      // Attiva la trial cloud per utenti senza abbonamento e senza free_until
      // (Google OAuth dopo redirect, o retroattivo per utenti esistenti 'none'
      // registrati prima del deploy). Idempotente: una sola trial per account.
      if (
        ['none', undefined, null].includes(currentUser.subscription_status) &&
        !currentUser.free_until &&
        !trialActivationAttempted
      ) {
        trialActivationAttempted = true;
        activateCloudTrial(currentUser)
          .then((res) => {
            if (res.activated) {
              clearSubscriptionCache();
              base44.auth.me().then((u) => setUser(u)).catch(() => {});
            }
            // Dopo l'attivazione trial, processa un eventuale referral pending
            // (?ref catturato in Register e salvato in localStorage).
            processPendingReferral();
          })
          .catch(() => { trialActivationAttempted = false; });
      } else {
        // Utente già con trial/abbonamento: processa comunque il referral pending
        // (l'amico invitato che aveva già un account è un caso raro, ma l'
        // attribuzione referrer_id + estensione referrer va comunque fatta una
        // sola volta).
        processPendingReferral();
      }
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        try {
          localStorage.removeItem('base44_access_token');
          localStorage.removeItem('token');
        } catch (e) {}
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Anteprima ospite admin: quando attiva, l'app vede l'utente come non
  // autenticato (dati demo, route admin nascoste) pur mantenendo la sessione
  // reale intatta, così l'admin può uscire dall'anteprima senza rifare il login.
  const { isGuestPreview } = useGuestPreview();
  if (isGuestPreview) {
    return { ...context, isAuthenticated: false, user: null };
  }
  return context;
};