import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Settings as SettingsIcon, LogOut, Mail, Trash2, AlertTriangle, MessageSquare, Download } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import MyTickets from '@/components/MyTickets';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TrialCountdownWidget from '@/components/TrialCountdownWidget';
import { cn } from '@/lib/utils';
import { deleteAccountAndData } from '@/lib/accountDeletion';
import { exportUserDataAsJson } from '@/lib/exportUserData';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

export default function Account() {
  const { t } = useI18n();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const logout = async () => {
    await base44.auth.logout();
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExportData = async () => {
    setExporting(true);
    try {
      await exportUserDataAsJson();
    } catch {
      // silent
    } finally {
      setExporting(false);
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteOpen(false);
    setDeleteStep(1);
    setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteAccountAndData(user.id);
    } catch (err) {
      setDeleting(false);
      setDeleteError(t('account.delete_error'));
      return;
    }
    try {
      await base44.auth.logout();
    } catch (_) { /* session already invalidated */ }
    window.location.href = '/login';
  };

  return (
    <AppLayout>
      <PageHeader title={t('settings.account')} subtitle={t('account.subtitle')} />

      <Tabs defaultValue="profilo" className="w-full">
        <TabsList className="grid grid-cols-3 w-full mb-5">
          <TabsTrigger value="profilo">{t('account.tab_profile')}</TabsTrigger>
          <TabsTrigger value="impostazioni">{t('account.tab_settings')}</TabsTrigger>
          <TabsTrigger value="richieste">{t('account.tab_tickets')}</TabsTrigger>
        </TabsList>

        <TabsContent value="profilo" className="mt-0 space-y-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{user?.full_name || t('account.user_default')}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role || 'user'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">{user?.email || '—'}</span>
              </div>
            </CardContent>
          </Card>

          <TrialCountdownWidget variant="card" />

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-medium mb-3">{t('settings.language')}</p>
              <LanguageSwitcher className="w-full" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impostazioni" className="mt-0 space-y-3">
          <Link to="/settings" className="block">
            <Card className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <SettingsIcon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{t('settings.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('account.settings_card_desc')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <button
            onClick={handleExportData}
            disabled={exporting}
            className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-input bg-transparent text-foreground hover:bg-accent transition-colors')}
          >
            <Download className="w-4 h-4" />
            {exporting ? t('account.exporting') : t('account.export_data')}
          </button>

          <button
            onClick={logout}
            className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium border border-input bg-transparent text-destructive hover:bg-destructive/10 transition-colors')}
          >
            <LogOut className="w-4 h-4" />
            {t('settings.logout')}
          </button>

          <AlertDialog open={deleteOpen} onOpenChange={(o) => { if (!o) closeDelete(); else setDeleteOpen(true); }}>
            <AlertDialogTrigger asChild>
              <button
                className={cn('w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors')}
              >
                <Trash2 className="w-4 h-4" />
                {t('account.delete_btn')}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  {deleteStep === 1 ? t('account.delete_step1_title') : t('account.delete_step2_title')}
                </AlertDialogTitle>
                <AlertDialogDescription as="div" className="space-y-2">
                  {deleteStep === 1 ? (
                    <>
                      <p>{t('account.delete_step1_desc')}</p>
                      <ul className="list-disc pl-5 space-y-1">
                        <li>{t('account.delete_item1')}</li>
                        <li>{t('account.delete_item2')}</li>
                        <li>{t('account.delete_item3')}</li>
                        <li>{t('account.delete_item4')}</li>
                      </ul>
                      <p>{t('account.delete_step1_note')}</p>
                    </>
                  ) : (
                    <>
                      <p>{t('account.delete_step2_desc')}</p>
                      <p>{t('account.delete_step2_hint')}</p>
                    </>
                  )}
                  {deleteError && (
                    <p className="text-destructive text-sm font-medium pt-1">{deleteError}</p>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={closeDelete} disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
                {deleteStep === 1 ? (
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); setDeleteStep(2); }}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {t('account.delete_continue')}
                  </AlertDialogAction>
                ) : (
                  <AlertDialogAction
                    onClick={(e) => { e.preventDefault(); handleConfirmDelete(); }}
                    disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleting ? t('settings.deleting') : t('settings.delete_confirm')}
                  </AlertDialogAction>
                )}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>

        <TabsContent value="richieste" className="mt-0">
          <MyTickets />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}