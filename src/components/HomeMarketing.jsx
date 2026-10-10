import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Utensils, ShieldCheck, HeartPulse, ArrowRight, Lock, Eye, Sparkles, Play } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Image } from '@/components/ui/image';
import { themeImage } from '@/lib/themeImages';
import AppLayout from '@/components/AppLayout';
import PublicFooter from '@/components/PublicFooter';
import TopRightActions from '@/components/TopRightActions';
import LanguageMenu from '@/components/LanguageMenu';
import { Button } from '@/components/ui/button';
import InstallAppButton from '@/components/InstallAppButton';
import ShareMenu from '@/components/ShareMenu';
import HomeCompanionReport from '@/components/HomeCompanionReport';

const STEPS = [
  { icon: Activity, key: 'landing.step1_title', desc: 'landing.step1_desc', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Utensils, key: 'landing.step2_title', desc: 'landing.step2_desc', color: 'text-amber-600 bg-amber-50' },
  { icon: ShieldCheck, key: 'landing.step3_title', desc: 'landing.step3_desc', color: 'text-terracotta bg-terracotta/10' },
];

// Landing marketing freemium per ospiti non autenticati.
export default function HomeMarketing() {
  const { t } = useI18n();
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">

        {/* HERO */}
        <section className="relative overflow-hidden rounded-2xl mt-2 mb-8">
          <Image
            src={themeImage('serena')}
            fittingType="fill"
            alt=""
            className="w-full h-56 md:h-72 block"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-primary/40" />
          <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-center max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-terracotta/90 text-terracotta-foreground text-xs font-semibold w-fit mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              {t('landing.hero_badge')}
            </span>
            <h1 className="font-heading text-3xl md:text-5xl font-semibold tracking-tight text-primary-foreground leading-[1.05] drop-shadow-sm">
              {t('landing.hero_title')}
            </h1>
            <p className="mt-3 text-base md:text-lg text-primary-foreground/90 leading-relaxed max-w-lg">
              {t('landing.hero_subtitle')}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link to="/demo">
                <button className="inline-flex items-center gap-2 h-14 px-8 rounded-xl bg-terracotta text-terracotta-foreground font-semibold text-base hover:bg-terracotta/90 transition-all shadow-lg shadow-terracotta/30 hover:shadow-xl hover:-translate-y-0.5">
                  <Play className="w-5 h-5" />
                  {t('landing.hero_cta_demo')}
                </button>
              </Link>
              <Link to="/register">
                <button className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary-foreground/10 text-primary-foreground font-medium text-sm border border-primary-foreground/40 hover:bg-primary-foreground/20 transition-colors">
                  {t('landing.hero_cta_register')}
                </button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-primary-foreground/70 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t('landing.hero_no_card')}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-primary-foreground/70">{t('share.page')}</span>
              <span className="rounded-full bg-primary-foreground/10 inline-flex">
                <ShareMenu variant="icon" />
              </span>
            </div>
          </div>
        </section>

        {/* 3 STEPS */}
        <section className="mb-10">
          <div className="grid sm:grid-cols-3 gap-4">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${s.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <p className="text-[0.65rem] font-heading font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-1">
                    {String(i + 1).padStart(2, '0')}
                  </p>
                  <h3 className="font-heading text-lg font-semibold text-foreground">{t(s.key)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mt-1">{t(s.desc)}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* DEMO PROMO */}
        <section className="mb-10">
          <Link to="/demo" className="block rounded-2xl border-2 border-terracotta/50 bg-gradient-to-br from-terracotta/10 to-accent/40 p-6 md:p-8 hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-terracotta/20 flex items-center justify-center shrink-0">
                <Play className="w-6 h-6 text-terracotta" />
              </div>
              <div>
                <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground">{t('home.demo_title')}</h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-2 max-w-md">{t('home.demo_desc')}</p>
                <span className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-terracotta">
                  {t('home.demo_cta')} <ArrowRight className="w-4 h-4" />
                </span>
              </div>
            </div>
          </Link>
        </section>

        {/* CARY + REPORT */}
        <section className="mb-10">
          <HomeCompanionReport />
        </section>

        {/* SEMAFORO TRIGGER HIGHLIGHT */}
        <section className="mb-10">
          <div className="rounded-2xl border-2 border-terracotta/40 bg-gradient-to-br from-accent/50 to-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />
                    <span className="w-4 h-4 rounded-full bg-amber-400 ring-2 ring-amber-400/20" />
                    <span className="w-4 h-4 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />
                  </span>
                  <p className="text-[0.65rem] font-heading font-semibold uppercase tracking-[0.25em] text-terracotta">
                    {t('app.name')}
                  </p>
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-semibold text-foreground leading-tight">
                  {t('landing.trigger_title')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-3 max-w-md">
                  {t('landing.trigger_desc')}
                </p>
              </div>
              <div className="flex gap-3 md:flex-col md:w-40">
                {[
                  { color: 'bg-emerald-500', label: t('trigger.green') },
                  { color: 'bg-amber-400', label: t('trigger.yellow') },
                  { color: 'bg-rose-500', label: t('trigger.red') },
                ].map((d) => (
                  <div key={d.label} className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full ${d.color} ring-2 ring-offset-2 ring-offset-card ring-black/5 shrink-0`} />
                    <span className="text-sm font-medium text-foreground">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section className="mb-10">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="font-heading text-xl md:text-2xl font-semibold text-foreground">
                  {t('landing.trust_title')}
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed mt-2">
                  {t('landing.trust_desc')}
                </p>
                <div className="flex flex-wrap gap-3 mt-4">
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="w-3.5 h-3.5 text-terracotta" /> GDPR
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 text-terracotta" /> {t('landing.trust_title')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINALE */}
        <section className="mb-10">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-6 md:p-10 text-center">
            <p className="text-[0.65rem] font-heading font-semibold uppercase tracking-[0.25em] text-primary-foreground/70">
              {t('freemium.free_badge')}
            </p>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold mt-2 text-primary-foreground">
              {t('landing.cta_title')}
            </h2>
            <p className="text-primary-foreground/80 mt-2 max-w-md mx-auto text-sm md:text-base">
              {t('landing.cta_subtitle')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center mt-5">
              <Link to="/register">
                <button className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-terracotta text-terracotta-foreground font-medium text-sm hover:bg-terracotta/90 transition-colors shadow-md">
                  <HeartPulse className="w-4 h-4" />
                  {t('landing.hero_cta_register')}
                </button>
              </Link>
              <Link to="/login">
                <button className="inline-flex items-center gap-2 h-12 px-6 rounded-xl bg-primary-foreground/15 text-primary-foreground font-medium text-sm border border-primary-foreground/30 hover:bg-primary-foreground/25 transition-colors">
                  {t('landing.hero_cta_login')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
            <div className="flex justify-center mt-4">
              <InstallAppButton />
            </div>
          </div>
        </section>

      </div>

      <PublicFooter />
    </AppLayout>
  );
}