import React, { useEffect, useState } from 'react';
import { ShieldCheck, Globe, LogOut, User as UserIcon, Fingerprint, Database, Trash2, Bell, Sun, Moon, Monitor, RotateCcw } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';

import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import HistoryExport from '@/components/HistoryExport';
import GoogleFitConnectButton from '@/components/googlefit/GoogleFitConnectButton';
import WeightTracker from '@/components/food/WeightTracker';
import { deleteAccountAndData } from '@/lib/accountDeletion';
import { useBiometric } from '@/lib/biometric';
import { clearAllGuestEntries } from '@/lib/guestEntries';
import { useTrialCountdown } from '@/hooks/useTrialCountdown';

export default function Settings() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const { supported, enabled, enable, disable } = useBiometric();
  const { toast } = useToast();
  const { resetTrial } = useTrialCountdown();
  const [resetOpen, setResetOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAck, setDeleteAck] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notifBusy, setNotifBusy] = useState(false);

  const handleResetDemoData = () => {
    clearAllGuestEntries();
    resetTrial();
    setResetOpen(false);
    toast({
      title: 'Dati demo azzerati',
      description: 'Le registrazioni locali di prova sono state ripulite e il countdown di 45 giorni è stato riavviato.',
    });
  };
  const toggleNotif = async (checked) => {
    setNotifBusy(true);
    try {
      await base44.auth.updateMe({ notifications_enabled: checked });
      setUser((u) => ({ ...(u || {}), notifications_enabled: checked }));
    } catch (e) {}
    setNotifBusy(false);
  };
  const toggleBio = async (checked) => {
    setBioBusy(true);
    try { if (checked) await enable(); else disable(); } catch (e) {}
    setBioBusy(false);
  };

  useEffect(() => {
    (async () => {
      try { setUser(await base44.auth.me()); } catch (e) {}
    })();
  }, []);

  const handleLogout = async () => { await base44.auth.logout(); };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await deleteAccountAndData(user?.id);
    } catch (err) {
      console.error('Errore durante la cancellazione dei dati', err);
    }
    setDeleting(false);
    setDeleteOpen(false);
    await base44.auth.logout();
    navigate('/login');
  };

  return (
    <AppLayout>
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="space-y-4">
        {/* Language */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold">{t('settings.language')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { code: 'it', label: 'Italiano', flag: '🇮🇹' },
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'es', label: 'Español', flag: '🇪🇸' },
                { code: 'fr', label: 'Français', flag: '🇫🇷' },
                { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
                { code: 'pt', label: 'Português', flag: '🇵🇹' },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium transition-colors',
                    lang === l.code ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  )}
                >
                  <span className="text-lg">{l.flag}</span> {l.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Sun className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold">{t('settings.theme')}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { code: 'light', label: t('theme.light'), icon: Sun },
                { code: 'dark', label: t('theme.dark'), icon: Moon },
                { code: 'system', label: t('theme.system'), icon: Monitor },
              ].map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setTheme(opt.code)}
                  className={cn(
                    'flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium transition-colors',
                    (theme || 'system') === opt.code ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  )}
                >
                  <opt.icon className="w-4 h-4" /> {opt.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy */}
        <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-accent/40">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
              <p className="font-semibold">{t('settings.privacy')}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('settings.privacy_desc')}</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✓</span> {t('settings.privacy_1')}</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✓</span> {t('settings.privacy_2')}</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✓</span> {t('settings.privacy_3')}</li>
              <li className="flex items-start gap-2"><span className="text-emerald-600 mt-0.5">✓</span> {t('settings.privacy_4')}</li>
            </ul>
          </CardContent>
        </Card>

        {/* Full data export */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="w-5 h-5 text-primary" /></div>
              <div>
                <p className="font-semibold">{t('settings.export_title')}</p>
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{t('settings.export_desc')}</p>
              </div>
            </div>
            <HistoryExport />
          </CardContent>
        </Card>

        {/* Biometric lock */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Fingerprint className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t('settings.biometric_title')}</p>
                <p className="text-sm text-muted-foreground leading-snug">{t('settings.biometric_desc')}</p>
              </div>
              <Switch checked={enabled} disabled={!supported || bioBusy} onCheckedChange={toggleBio} />
            </div>
            {!supported && <p className="text-xs text-muted-foreground mt-3">{t('settings.biometric_unsupported')}</p>}
          </CardContent>
        </Card>

        {/* Notifiche push */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Bell className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t('settings.notifications_title')}</p>
                <p className="text-sm text-muted-foreground leading-snug">{t('settings.notifications_desc')}</p>
              </div>
              <Switch checked={user?.notifications_enabled !== false} disabled={notifBusy || !user} onCheckedChange={toggleNotif} />
            </div>
            {!user && <p className="text-xs text-muted-foreground mt-3">{t('settings.notifications_login')}</p>}
          </CardContent>
        </Card>

        {/* Google Fit + Weight */}
        <GoogleFitConnectButton />
        <WeightTracker />

        {/* Dati di prova & Cache locale */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">Dati di prova & Cache locale</p>
                <p className="text-sm text-muted-foreground leading-snug">
                  Azzera le registrazioni demo memorizzate sul dispositivo e riavvia la prova pulita.
                </p>
              </div>
            </div>
            <button
              onClick={() => setResetOpen(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Ripristina dati di prova locali
            </button>
          </CardContent>
        </Card>

        {/* Account */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center"><UserIcon className="w-5 h-5 text-muted-foreground" /></div>
              <div>
                <p className="font-semibold">{t('settings.account')}</p>
                {user?.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              </div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-medium bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors">
              <LogOut className="w-5 h-5" /> {t('settings.logout')}
            </button>
            <button
              onClick={() => { setDeleteAck(false); setDeleteOpen(true); }}
              className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl text-sm font-medium border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> {t('settings.delete_account')}
            </button>
          </CardContent>
        </Card>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('settings.delete_title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('settings.delete_desc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <label className="flex items-start gap-3 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={deleteAck}
                onChange={(e) => setDeleteAck(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border accent-destructive"
              />
              <span>{t('settings.delete_ack')}</span>
            </label>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting} className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                disabled={!deleteAck || deleting}
                onClick={handleDeleteAccount}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
              >
                {deleting ? t('settings.deleting') : t('settings.delete_confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ripristinare i dati di prova locali?</AlertDialogTitle>
              <AlertDialogDescription>
                Tutti i sintomi, pasti, terapie e referti salvati localmente sul dispositivo verranno rimossi e la prova di 45 giorni verrà riavviata da zero. Se hai un account registrato, i tuoi dati sincronizzati nel cloud rimarranno al sicuro.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="min-h-[44px]">{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetDemoData}
                className="bg-amber-600 hover:bg-amber-700 text-white min-h-[44px]"
              >
                Conferma ripristino
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}