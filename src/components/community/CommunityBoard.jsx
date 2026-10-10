import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/use-toast';
import {
  Send, MessageSquare, Trash2, CornerDownRight, ShieldCheck, ShieldAlert,
  Heart, MessagesSquare, UserCircle2, Mail,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import EmptyState from '@/components/EmptyState';
import MessageComposer from './MessageComposer';
import MessageReactions from './MessageReactions';
import TranslatedText from './TranslatedText';
import MentionText from './MentionText';
import SharedEntryCard from './SharedEntryCard';
import { useCommunityUsers } from './useCommunityUsers';
import { timeAgoShort } from './helpers';
import { cn } from '@/lib/utils';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import PremiumPaywall from '@/components/PremiumPaywall';

const CATEGORIES = [
  { value: 'generale', icon: MessageSquare, tone: 'bg-accent text-accent-foreground' },
  { value: 'consigli', icon: MessagesSquare, tone: 'bg-sky-100 text-sky-700' },
  { value: 'alimentazione', icon: Heart, tone: 'bg-emerald-100 text-emerald-700' },
  { value: 'sintomi', icon: Heart, tone: 'bg-amber-100 text-amber-700' },
  { value: 'emotivo', icon: Heart, tone: 'bg-rose-100 text-rose-700' },
  { value: 'altro', icon: MessagesSquare, tone: 'bg-slate-100 text-slate-700' },
];

const SOLIDARITY = [
  'Non sei solo: tante persone affrontano questo percorso insieme a te.',
  'Ogni piccolo passo conta. Condividere aiuta te e gli altri.',
  'La tua esperienza può illuminare il cammino di qualcun altro.',
  'Nei momenti difficili, sapere di non essere soli fa la differenza.',
];

const STARTERS = [
  'Come gestisci i momenti di riacutizzazione?',
  'Quali cibi hai scoperto di tollerare meglio?',
  'Come spieghi l\u2019IBD a chi ti sta vicino?',
  'Quali strategie ti aiutano nei giorni più faticosi?',
];

const BANNED = ['stronzo', 'stronz', 'cazzo', 'figa', 'puttana', 'troia', 'merda', 'minchia', 'negro', 'mongolo', 'ritardato', 'frocio', 'ricchione', 'bastardo', 'vaffanculo', 'fuck', 'shit', 'bitch', 'asshole', 'slut', 'retard', 'nigger', 'faggot'];
const containsBanned = (txt) => {
  const low = (txt || '').toLowerCase();
  return BANNED.some((w) => low.includes(w));
};

export default function CommunityBoard({ me, isAdmin, onDmUser }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const users = useCommunityUsers();
  const { guard, showPaywall, setShowPaywall } = useWriteGuard();
  const [messages, setMessages] = useState(null);
  const [posting, setPosting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [moderationWarning, setModerationWarning] = useState('');
  const [category, setCategory] = useState('generale');
  const [filter, setFilter] = useState('all');
  const [starter, setStarter] = useState(null);

  const load = async () => {
    try {
      const data = await base44.entities.CommunityMessage.list('-created_date', 500);
      setMessages(data);
    } catch (e) { setMessages([]); }
  };

  useEffect(() => {
    load();
    const unsub = base44.entities.CommunityMessage.subscribe(load);
    return unsub;
  }, []);

  const notifyMentions = async (mentions, messageId) => {
    if (!mentions || !mentions.length) return;
    for (const mnt of mentions) {
      if (mnt.user_id && mnt.user_id !== me?.id) {
        try {
          await base44.entities.Notification.create({
            user_id: mnt.user_id,
            type: 'mention',
            title: me?.full_name || 'Utente',
            body: 'community',
            link: '/community',
            payload: { message_id: messageId },
            read: false,
          });
        } catch (e) {}
      }
    }
  };

  const post = async (content, mentions, shared, parentId = null, cat = category) => {
    if (!guard('community_post')) return;
    const text = (content || '').trim();
    if ((!text && !shared) || posting) return;
    if (containsBanned(text)) {
      setModerationWarning('Il messaggio contiene linguaggio non appropriato. Riformulalo per mantenere lo spazio accogliente.');
      return;
    }
    setModerationWarning('');
    setPosting(true);
    try {
      let parentCat = cat;
      if (parentId && messages) {
        const parent = messages.find((m) => m.id === parentId);
        parentCat = parent?.category || cat;
      }
      const created = await base44.entities.CommunityMessage.create({
        content: text,
        author_name: me?.full_name || 'Utente',
        parent_id: parentId,
        category: parentCat || 'generale',
        mentions: mentions || [],
        shared_entry: shared || null,
      });
      await notifyMentions(mentions, created.id);
      setReplyTo(null);
    } catch (e) {
      toast({ title: e.message || 'Errore', variant: 'destructive' });
    } finally {
      setPosting(false);
    }
  };

  const remove = async (id) => {
    try { await base44.entities.CommunityMessage.delete(id); } catch (e) {}
  };

  const moderate = async (id) => {
    try {
      await base44.functions.invoke('moderateCommunityMessage', { message_id: id });
    } catch (e) {
      setModerationWarning('Impossibile rimuovere il messaggio. Riprova.');
    }
  };

  const stats = useMemo(() => {
    const list = messages || [];
    const authors = new Set(list.map((m) => m.author_name).filter(Boolean));
    return { messages: list.length, authors: authors.size };
  }, [messages]);

  const solidarity = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return SOLIDARITY[day % SOLIDARITY.length];
  }, []);

  const topLevel = (messages || []).filter((m) => !m.parent_id && (filter === 'all' || m.category === filter));
  const repliesOf = (id) => (messages || []).filter((m) => m.parent_id === id);

  return (
    <div>
      {/* Solidarity card */}
      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t('community.solidarity_title')}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{solidarity}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-primary" /> {stats.messages} {t('community.stat_messages')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <UserCircle2 className="w-4 h-4 text-primary" /> {stats.authors} {t('community.stat_people')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Safe space note */}
      <Card className="mb-5 border-amber-200/60 bg-amber-50/50">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">{t('community.guidelines')}</p>
          </div>
        </CardContent>
      </Card>

      {/* Composer */}
      <Card className="mb-5">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    category === c.value ? c.tone + ' ring-2 ring-primary/40' : 'bg-accent text-accent-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t('community.cat_' + c.value)}
                </button>
              );
            })}
          </div>
          <MessageComposer
            onSubmit={(content, mentions, shared) => post(content, mentions, shared)}
            placeholder={t('community.placeholder')}
            users={users}
            me={me}
            disabled={posting}
            inject={starter}
            injectKey={starter ? starter + Date.now() : null}
          />
          {moderationWarning && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 text-amber-800 px-3 py-2 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{moderationWarning}</span>
            </div>
          )}
          {isAdmin && (
            <p className="mt-2 text-[11px] text-primary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> {t('community.moderator_note')}
            </p>
          )}
          <div className="mt-3">
            <p className="text-[11px] text-muted-foreground mb-2">{t('community.starters')}</p>
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStarter(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-foreground hover:bg-accent transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-1.5 mb-5">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-colors', filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}
        >
          {t('community.filter_all')}
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setFilter(c.value)}
            className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors', filter === c.value ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground')}
          >
            {t('community.cat_' + c.value)}
          </button>
        ))}
      </div>

      {!messages ? (
        <div className="py-20 text-center text-muted-foreground">{t('common.loading')}</div>
      ) : topLevel.length === 0 ? (
        <EmptyState icon={MessageSquare} title={t('community.empty')} />
      ) : (
        <div className="space-y-4">
          {topLevel.map((m) => {
            const mine = me && m.created_by_id === me.id;
            const reps = repliesOf(m.id);
            const cat = CATEGORIES.find((c) => c.value === (m.category || 'generale'));
            return (
              <Card key={m.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium shrink-0">
                      {(m.author_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm">{m.author_name || t('community.anonymous')}</p>
                          {cat && (
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium', cat.tone)}>
                              {t('community.cat_' + cat.value)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{timeAgoShort(m.created_date)}</span>
                          {me && m.created_by_id !== me.id && (
                            <button
                              type="button"
                              onClick={() => onDmUser && onDmUser({ id: m.created_by_id, name: m.author_name })}
                              className="text-muted-foreground hover:text-primary transition-colors"
                              title={t('community.dm_send_request')}
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          {(mine || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => (mine ? remove(m.id) : moderate(m.id))}
                              className={cn('transition-colors', mine ? 'text-muted-foreground hover:text-destructive' : 'text-primary hover:text-primary/80')}
                              title={mine ? 'Elimina' : 'Rimuovi come moderatore'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {m.shared_entry && <SharedEntryCard entry={m.shared_entry} />}
                      <div className={m.shared_entry ? 'mt-1' : ''}>
                        <TranslatedText message={m} messageType="community" />
                      </div>
                      <div className="text-[13px] mt-0.5">
                        <MentionText content="" mentions={m.mentions} onMention={onDmUser} />
                      </div>

                      <MessageReactions
                        messageId={m.id}
                        messageType="community"
                        meId={me?.id}
                        meName={me?.full_name}
                      />

                      {me && (
                        <button
                          type="button"
                          onClick={() => setReplyTo(replyTo === m.id ? null : m.id)}
                          className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <CornerDownRight className="w-3.5 h-3.5" />
                          {t('community.reply')}
                        </button>
                      )}

                      {me && replyTo === m.id && (
                        <div className="mt-2">
                          <MessageComposer
                            onSubmit={(content, mentions, shared) => post(content, mentions, shared, m.id)}
                            placeholder={t('community.placeholder')}
                            users={users}
                            me={me}
                            disabled={posting}
                            autoFocus
                          />
                        </div>
                      )}

                      {/* Replies */}
                      {reps.length > 0 && (
                        <div className="mt-3 space-y-2 pl-3 border-l-2 border-border">
                          {reps.map((r) => {
                            const rMine = me && r.created_by_id === me.id;
                            return (
                              <div key={r.id} className="flex items-start gap-2">
                                <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-medium shrink-0">
                                  {(r.author_name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium text-xs">{r.author_name || t('community.anonymous')}</p>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] text-muted-foreground">{timeAgoShort(r.created_date)}</span>
                                      {me && r.created_by_id !== me.id && (
                                        <button
                                          type="button"
                                          onClick={() => onDmUser && onDmUser({ id: r.created_by_id, name: r.author_name })}
                                          className="text-muted-foreground hover:text-primary transition-colors"
                                        >
                                          <Mail className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      {(rMine || isAdmin) && (
                                        <button
                                          type="button"
                                          onClick={() => (rMine ? remove(r.id) : moderate(r.id))}
                                          className={cn('transition-colors', rMine ? 'text-muted-foreground hover:text-destructive' : 'text-primary hover:text-primary/80')}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {r.shared_entry && <SharedEntryCard entry={r.shared_entry} />}
                                  <div className={r.shared_entry ? 'mt-1' : ''}>
                                    <TranslatedText message={r} messageType="community" />
                                  </div>
                                  <MessageReactions
                                    messageId={r.id}
                                    messageType="community"
                                    meId={me?.id}
                                    meName={me?.full_name}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}