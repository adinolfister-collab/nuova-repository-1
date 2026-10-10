import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2, Sparkles, ShieldCheck, CheckCircle2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import ReferralStep from "@/components/ReferralStep";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useI18n } from "@/lib/i18n";
import { computeCloudTrialDays } from "@/lib/activateCloudTrial";
import { clearDemoTrialFlag } from "@/lib/demoTrial";

// Memorizza un referral pending (?ref=USER_ID) dalla URL di registrazione in
// localStorage, così sopravvive al redirect post-OTP e alla callback Google.
// AuthContext lo legge dopo l'autenticazione e chiama processInviteReferral.
const REF_KEY = 'inviteReferrerId';
let referralCaptured = false;
function captureReferral() {
  if (referralCaptured) return;
  referralCaptured = true;
  try {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref && ref.trim()) {
      localStorage.setItem(REF_KEY, ref.trim());
      try { base44.analytics.track({ eventName: 'referral_signup_started' }); } catch (e) { /* noop */ }
    }
  } catch (e) { /* ignore */ }
}

export default function Register() {
  const { t } = useI18n();
  captureReferral();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [showReferral, setShowReferral] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t('register.password_mismatch'));
      return;
    }
    if (!consent) {
      setError(t('register.consent_required'));
      return;
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      try { base44.analytics.track({ eventName: 'user_registered' }); } catch (e) { /* non blocking */ }
      setShowOtp(true);
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Attiva la trial cloud di 30gg (o giorni residui demo / 7gg grace).
      // Account appena creato: free_until è sicuramente vuoto, nessun
      // controllo idempotenza necessario — calcolo puro + updateMe unificato.
      const { days: trialDays, source: trialSource } = computeCloudTrialDays();
      const freeUntil = new Date(Date.now() + trialDays * 86400000).toISOString();
      try {
        await base44.auth.updateMe({
          privacy_consent_accepted: true,
          privacy_consent_date: new Date().toISOString(),
          free_until: freeUntil,
        });
        clearDemoTrialFlag();
        try { base44.analytics.track({ eventName: 'trial_activated', properties: { source: trialSource, days: trialDays } }); } catch (_) { /* noop */ }
        const key = trialSource === 'fresh' ? 'trial.welcome_fresh'
          : trialSource === 'grace' ? 'trial.welcome_grace'
          : 'trial.welcome_transfer';
        const desc = trialSource === 'demo_transfer'
          ? t(key).replace('{n}', trialDays)
          : t(key);
        toast({ title: t('trial.welcome_title'), description: desc });
      } catch (e) { /* non blocking */ }
      setShowReferral(true);
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({
        title: t('register.code_sent'),
        description: t('register.check_email'),
      });
    } catch (err) {
      setError(err.message || t('common.error'));
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", safeReturnTo());
  };

  const finishRegistration = () => {
    window.location.href = safeReturnTo();
  };

  if (showReferral) {
    return <ReferralStep onDone={finishRegistration} />;
  }

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title={t('register.verify')}
        subtitle={t('register.otp_subtitle').replace('{email}', email)}
      >
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('register.verifying')}
            </>
          ) : (
            t('register.verify')
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          {t('register.no_code')}{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">
            {t('register.resend')}
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={Mail}
      title={t('register.value_prop')}
      subtitle={t('register.value_sub')}
      footer={
        <>
          {t('register.have_account')}{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >
            {t('register.login')}
          </Link>
        </>
      }
    >
      {/* Badge "45 Giorni Gratis" & "Zero carta richiesta" */}
      <div className="flex flex-col items-center justify-center gap-2 mb-4 text-center">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/15 text-terracotta text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            {t('register.badge_free')}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('register.no_card_badge')}
          </span>
        </div>
        <p className="text-xs text-muted-foreground font-medium">
          Accesso completo gratuito fino al <span className="text-foreground font-semibold">{new Date(Date.now() + 45 * 86400000).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </p>
        <p className="text-[11px] text-muted-foreground">
          I dati e i pasti registrati in demo verranno protetti e sincronizzati nel tuo account.
        </p>
      </div>

      {/* Google primary (terracotta) */}
      <button
        type="button"
        onClick={handleGoogle}
        className="w-full h-12 rounded-xl bg-terracotta text-terracotta-foreground font-medium text-sm flex items-center justify-center gap-2.5 hover:bg-terracotta/90 transition-colors shadow-sm mb-3"
      >
        <GoogleIcon className="w-5 h-5" />
        {t('register.google_primary')}
      </button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-3 text-muted-foreground">{t('register.or_email')}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('auth.email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder={t('auth.placeholder_email')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('auth.password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{t('auth.confirm_password')}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Checkbox id="consent" checked={consent} onCheckedChange={setConsent} className="mt-0.5" />
          <label htmlFor="consent" className="text-xs text-muted-foreground leading-relaxed select-text">
            {t('register.consent_text')}
          </label>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading || !consent}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('register.creating')}
            </>
          ) : (
            t('register.create')
          )}
        </Button>
      </form>

      <div className="mt-5 flex items-start gap-2 p-3 rounded-xl bg-accent/50">
        <ShieldCheck className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t('register.no_card')}
        </p>
      </div>
    </AuthLayout>
  );
}