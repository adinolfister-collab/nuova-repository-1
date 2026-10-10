import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import AbbonamentoPlans from '@/components/AbbonamentoPlans';
import LoginSubscriptionPromo from '@/components/LoginSubscriptionPromo';
import AppSupportChat from '@/components/AppSupportChat';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import TopRightActions from '@/components/TopRightActions';
import LanguageMenu from '@/components/LanguageMenu';
import NativeAppButton from '@/components/NativeAppButton';
import AbbonamentoFeatures from '@/components/AbbonamentoFeatures';
import AbbonamentoPreview from '@/components/AbbonamentoPreview';

// Public subscription page. Serves as the redirect target when a visitor
// tries to use a protected page without being logged in / subscribed.
export default function Abbonamento() {
  const { t } = useI18n();
  const { isAuthenticated, isLoadingAuth, authChecked, checkUserAuth } = useAuth();

  useEffect(() => {
    if (!authChecked && !isLoadingAuth) {
      checkUserAuth();
    }
  }, [authChecked, isLoadingAuth, checkUserAuth]);

  if (isLoadingAuth || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="fixed top-3 right-3 z-40 flex items-center gap-2" style={{ top: 'calc(env(safe-area-inset-top) + 0.75rem)' }}>
        <LanguageMenu />
        <NativeAppButton />
        <TopRightActions />
      </div>
      <div className="w-full max-w-2xl">
        <PageHeader title={t('abb.premium_title')} subtitle={t('premium.subtitle')} />
        <PageEditorial pageKey="abbonamento" />
        <AbbonamentoPreview />
        <AbbonamentoFeatures />

        {isAuthenticated ? (
          <AbbonamentoPlans />
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-5">
            <LoginSubscriptionPromo returnTo="/" />
            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('abb.have_account')}{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">{t('abb.login_link')}</Link>
            </div>
          </div>
        )}

        <div className="mt-4">
          <AppSupportChat />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link to="/" className="hover:underline">{t('abb.back_home')}</Link>
        </p>
        <div className="mt-6 flex justify-center gap-5 text-sm text-muted-foreground">
          <Link to="/about" className="hover:text-primary hover:underline">{t('abb.about_link')}</Link>
          <Link to="/contact" className="hover:text-primary hover:underline">{t('abb.contact_link')}</Link>
        </div>
        <EditorialBlock sectionKey="abbonamento_free" align="left" compact />
      </div>
    </div>
  );
}