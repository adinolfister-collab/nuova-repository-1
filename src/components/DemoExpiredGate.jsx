import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Lock, UserPlus, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { base44 } from '@/api/base44Client';
import { trackGuestActivity } from '@/lib/guestTracking';
import { Button } from '@/components/ui/button';

// Schermata di blocco totale mostrata agli ospiti con trial demo scaduta su
// rotte demo-enabled (gestita in AppLayout). L'ospite deve registrarsi per
// continuare: la demo era l'unica trial gratuita.
// Strumentazione: al mount emette 'demo_gate_shown' (analytics + ConversionEvent,
// best-effort) e al click su 'Registrati' emette 'demo_gate_registered' prima
// della navigazione, per misurare la vera conversione del gate.
export default function DemoExpiredGate() {
  const { t } = useI18n();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    try {
      base44.analytics.track({ eventName: 'demo_gate_shown' });
    } catch { /* best-effort */ }
    trackGuestActivity('demo_gate_shown', 'used');
  }, []);

  const handleRegister = () => {
    try {
      base44.analytics.track({ eventName: 'demo_gate_registered' });
    } catch { /* best-effort */ }
    trackGuestActivity('demo_gate_registered', 'used');
  };

  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-terracotta/15 border border-terracotta/40 flex items-center justify-center mb-5">
        <Lock className="w-8 h-8 text-terracotta" />
      </div>
      <h1 className="font-heading text-2xl md:text-3xl font-semibold text-foreground leading-snug">
        {t('demo.expired_title')}
      </h1>
      <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-md leading-relaxed">
        {t('demo.expired_desc')}
      </p>
      <div className="mt-6 flex flex-col sm:flex-row gap-2.5 w-full max-w-sm">
        <Link to="/register" onClick={handleRegister} className="w-full">
          <Button className="w-full rounded-xl bg-terracotta text-terracotta-foreground hover:bg-terracotta/90 h-12">
            <UserPlus className="w-4 h-4 mr-1.5" /> {t('demo.expired_cta_register')}
          </Button>
        </Link>
        <Link to="/abbonamento" className="w-full">
          <Button variant="outline" className="w-full rounded-xl border-terracotta/50 text-terracotta hover:bg-terracotta/10 h-12">
            {t('demo.expired_cta_plans')} <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}