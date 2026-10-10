import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X, UserPlus } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

// Nudge positivo non bloccante: mostrato agli ospiti in demo mode dopo aver
// registrato un multiplo di salvataggi gratuiti (3, 6, 9...). NON blocca il
// salvataggio (l'azione e' gia' avvenuta in locale): invita a registrarsi per
// rendere i dati permanenti e sincronizzarli, ma lascia continuare in demo.
// Sostituisce il soft paywall bloccante precedente.
export default function RegisterNudge({ open, onClose }) {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-terracotta/40 bg-card shadow-2xl p-6 text-center animate-in fade-in slide-in-from-bottom-4">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-lg hover:bg-accent text-muted-foreground"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5" />
        </button>
        <div className="w-12 h-12 rounded-2xl bg-terracotta/15 text-terracotta flex items-center justify-center mx-auto mb-3">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold mb-2">
          <span>✨ 45 Giorni Gratis • Zero Carta di Credito</span>
        </div>
        <h2 className="font-heading text-xl font-semibold text-foreground tracking-tight">
          {t('nudge.title')}
        </h2>
        <div className="h-px bg-terracotta/70 mx-auto my-3 w-12" />
        <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
          {t('nudge.desc')}
        </p>
        <div className="flex flex-col gap-2 mt-5">
          <Link to="/register" onClick={onClose}>
            <Button className="w-full rounded-xl h-11 bg-terracotta text-terracotta-foreground hover:bg-terracotta/90 shadow-sm">
              <UserPlus className="w-4 h-4 mr-1.5" /> {t('nudge.cta_register')}
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {t('nudge.cta_continue')}
          </button>
        </div>
      </div>
    </div>
  );
}