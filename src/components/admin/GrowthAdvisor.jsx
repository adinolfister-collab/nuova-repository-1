import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lightbulb, RefreshCw, Mail, Share2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ACTION_META = {
  dormant_reminders: { icon: Mail, hint: 'Invia email a utenti dormienti (modalità campagna).' },
  social_post: { icon: Share2, hint: 'Genera post social pronti da pubblicare.' },
  none: { icon: Lightbulb, hint: 'Consiglio testuale.' },
};

// Consigliere AI: 3 azioni della settimana con pulsanti d'azione che
// attivano funzioni gia' esistenti (sendDormantReminders, generateSocialPost).
// Azioni sensibili richiedono conferma.
export default function GrowthAdvisor({ insights }) {
  const { toast } = useToast();
  const [actions, setActions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(null);
  const [confirm, setConfirm] = useState(null); // { action }
  const [preview, setPreview] = useState(null);
  const [socialResult, setSocialResult] = useState(null);

  const loadActions = async () => {
    setLoading(true);
    setSocialResult(null);
    try {
      const res = await base44.functions.invoke('getGrowthActions', { insights });
      setActions(res.data?.actions || []);
    } catch {
      setActions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (insights) loadActions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insights]);

  const handleConfirmDormant = async () => {
    setRunning('dormant_reminders');
    setConfirm(null);
    try {
      const res = await base44.functions.invoke('sendDormantReminders', { mode: 'campaign' });
      const d = res.data || {};
      toast({
        title: 'Reminder inviati',
        description: `${d.sent || 0} email inviate, ${d.failed || 0} fallite.`,
      });
    } catch {
      toast({ title: 'Errore', description: 'Invio reminder fallito', variant: 'destructive' });
    } finally {
      setRunning(null);
      setPreview(null);
    }
  };

  const openDormantConfirm = async () => {
    setConfirm({ action: 'dormant_reminders' });
    setPreview({ loading: true });
    try {
      const res = await base44.functions.invoke('sendDormantReminders', { mode: 'campaign', preview: true });
      setPreview({ count: res.data?.dormant_count ?? 0 });
    } catch {
      setPreview({ count: null });
    }
  };

  const handleSocialPost = async (action) => {
    setRunning(action.action_type);
    try {
      const res = await base44.functions.invoke('generateSocialPost', {
        topic: action.title,
        lang: 'it',
        platform: 'all',
      });
      setSocialResult(res.data);
      toast({ title: 'Post generati', description: 'Varianti pronte sotto.' });
    } catch {
      toast({ title: 'Errore', description: 'Generazione post fallita', variant: 'destructive' });
    } finally {
      setRunning(null);
    }
  };

  const runAction = (action) => {
    if (action.action_type === 'dormant_reminders') {
      openDormantConfirm();
    } else if (action.action_type === 'social_post') {
      handleSocialPost(action);
    }
  };

  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-terracotta" />
            Consigliere AI
          </h2>
          <button
            onClick={loadActions}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Rigenera
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-terracotta" />
          </div>
        ) : !actions?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nessun suggerimento disponibile.
          </p>
        ) : (
          <div className="space-y-3">
            {actions.map((a, i) => {
              const meta = ACTION_META[a.action_type] || ACTION_META.none;
              const Icon = meta.icon;
              const isBusy = running === a.action_type;
              return (
                <div key={i} className="rounded-lg border border-border bg-card/50 p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-terracotta/15 flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-terracotta" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[0.6rem] font-semibold text-terracotta">#{a.priority}</span>
                        <p className="text-sm font-medium leading-tight">{a.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
                      {a.action_type !== 'none' && (
                        <Button
                          size="sm"
                          variant="default"
                          className="mt-2.5 h-8 text-xs"
                          disabled={isBusy}
                          onClick={() => runAction(a)}
                        >
                          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Icon className="w-3.5 h-3.5" />}
                          {isBusy ? 'In corso…' : (a.action_label || 'Esegui')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {socialResult && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-terracotta" />
              Post generati — copiali e pubblica
            </p>
            <div className="space-y-2">
              {['facebook', 'linkedin', 'x', 'instagram'].map((p) => {
                const post = socialResult.posts?.[p];
                if (!post?.text) return null;
                return (
                  <div key={p} className="text-xs">
                    <p className="font-medium capitalize text-muted-foreground">{p}</p>
                    <p className="mt-0.5 whitespace-pre-wrap">{post.text}</p>
                    {post.hashtags?.length > 0 && (
                      <p className="text-terracotta mt-0.5">{post.hashtags.join(' ')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      <AlertDialog open={!!confirm} onOpenChange={(o) => { if (!o) { setConfirm(null); setPreview(null); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invia reminder a utenti dormienti?</AlertDialogTitle>
            <AlertDialogDescription>
              {preview?.loading
                ? 'Calcolo dei destinatari in corso…'
                : preview?.count != null
                  ? `Verranno inviate email a ${preview.count} utenti dormienti (modalità campagna). L'azione non è reversibile.`
                  : 'Verranno inviati reminder a utenti dormienti. L\'azione non è reversibile.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              disabled={preview?.loading}
              onClick={handleConfirmDormant}
              className="bg-primary text-primary-foreground"
            >
              Conferma invio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}