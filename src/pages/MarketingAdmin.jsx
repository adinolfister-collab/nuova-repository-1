import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Megaphone, Sparkles, Clipboard, ClipboardCheck, Wand2, Hash, Crown, Download, Link2, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import PlatformPreview from '@/components/marketing/PlatformPreview';
import UserMonitor from '@/components/marketing/UserMonitor';
import LogoGenerator from '@/components/marketing/LogoGenerator';
import { SOCIAL_TEMPLATES, PLATFORMS, TONES, LANGS, APP_BASE_URL, APP_PAGES } from '@/lib/socialTemplates';
import { Image } from '@/components/ui/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export default function MarketingAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState(TONES[0]);
  const [lang, setLang] = useState('it');
  const [platform, setPlatform] = useState('all');
  const [cta, setCta] = useState('Prova gratuita 45 giorni');
  const [deepLink, setDeepLink] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('facebook');
  const [copied, setCopied] = useState(null);
  const [section, setSection] = useState('social');

  if (user && user.role !== 'admin') return <Navigate to="/" replace />;
  if (!user) return null;

  const applyTemplate = (tpl) => {
    setTopic(tpl.topic);
    setTone(tpl.tone);
    setCta(tpl.cta);
    setDeepLink(tpl.deepLink || '');
    setResult(null);
  };

  const generate = async () => {
    if (!topic.trim()) {
      toast({ title: 'Inserisci un argomento' });
      return;
    }
    setGenerating(true);
    setResult(null);
    try {
      const deepLinkUrl = deepLink ? (deepLink === '/' ? APP_BASE_URL : `${APP_BASE_URL}${deepLink}`) : '';
      const res = await base44.functions.invoke('generateSocialPost', {
        topic, tone, lang, platform, cta, deepLink: deepLinkUrl,
      });
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      if (res.data.platform === 'all') {
        setActiveTab('facebook');
      } else {
        setActiveTab(res.data.platform);
      }
      toast({ title: 'Post generati' });
    } catch (e) {
      toast({ title: 'Errore generazione', description: e.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const postFor = (key) => {
    if (!result) return null;
    if (result.platform === 'all') return result.posts?.[key] || null;
    return result.post || null;
  };
  const platformKey = result?.platform === 'all' ? activeTab : result?.platform;

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      toast({ title: 'Copiato!' });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: 'Copia non riuscita', variant: 'destructive' });
    }
  };

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard contenuti social"
        subtitle="Genera post per Facebook/Instagram, LinkedIn e X con AI, pronti da copiare e pubblicare."
      />

      {/* Section switch */}
      <div className="mb-6 flex gap-2 border-b border-border">
        <button
          onClick={() => setSection('social')}
          className={cn(
            'px-4 py-2 text-sm border-b-2 -mb-px transition-colors',
            section === 'social' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          Contenuti social
        </button>
        <button
          onClick={() => setSection('users')}
          className={cn(
            'px-4 py-2 text-sm border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            section === 'users' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Users className="w-3.5 h-3.5" /> Monitoraggio utenti
        </button>
        <button
          onClick={() => setSection('logo')}
          className={cn(
            'px-4 py-2 text-sm border-b-2 -mb-px transition-colors flex items-center gap-1.5',
            section === 'logo' ? 'border-terracotta text-terracotta font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" /> Generatore Logo
        </button>
      </div>

      {section === 'users' ? (
        <UserMonitor />
      ) : section === 'logo' ? (
        <LogoGenerator />
      ) : (
        <>
          {/* Template library */}
          <section className="mb-6">
            <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-terracotta" /> Template
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SOCIAL_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl)}
                  className="text-left p-3 rounded-xl border border-border bg-card hover:border-terracotta/60 hover:bg-terracotta/5 transition-colors"
                >
                  <p className="font-medium text-sm">{tpl.label}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{tpl.topic}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-primary" /> Composizione
                </h2>

                <div>
                  <Label htmlFor="topic">Argomento del post</Label>
                  <Textarea
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                    placeholder="Es. Lancio della nuova funzione scanner esami con confronto nel tempo…"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="tone">Tono</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger id="tone" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TONES.map((tn) => (
                          <SelectItem key={tn} value={tn}>{tn}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lang">Lingua del copy</Label>
                    <Select value={lang} onValueChange={setLang}>
                      <SelectTrigger id="lang" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGS.map((l) => (
                          <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="cta">Call to action</Label>
                  <Input
                    id="cta"
                    value={cta}
                    onChange={(e) => setCta(e.target.value)}
                    placeholder="Es. Prova gratuita 45 giorni"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="deeplink" className="flex items-center gap-1.5"><Link2 className="w-3.5 h-3.5" /> Link dell'app da includere</Label>
                  <Select value={deepLink || '__none__'} onValueChange={(v) => setDeepLink(v === '__none__' ? '' : v)}>
                    <SelectTrigger id="deeplink" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APP_PAGES.map((p) => (
                        <SelectItem key={p.path || '__none__'} value={p.path || '__none__'}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Piattaforma</Label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    <button
                      onClick={() => setPlatform('all')}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm border transition-colors',
                        platform === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-accent'
                      )}
                    >
                      Tutte (4 varianti)
                    </button>
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setPlatform(p.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm border transition-colors',
                          platform === p.id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-accent'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={generate}
                  disabled={generating || !topic.trim()}
                  className="w-full rounded-xl"
                  size="lg"
                >
                  {generating ? (
                    <><span className="w-4 h-4 border-2 border-primary-foreground/40 border-t-primary-foreground rounded-full animate-spin" /> Generazione in corso…</>
                  ) : (
                    <><Megaphone className="w-4 h-4" /> Genera post</>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-lg font-semibold flex items-center gap-2">
                    <Clipboard className="w-4 h-4 text-terracotta" /> Anteprima
                  </h2>
                  {result && (
                    <button
                      onClick={() => copy(fullText(platformKey, postFor(platformKey)), platformKey)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-terracotta text-terracotta-foreground hover:bg-terracotta/90 transition-colors"
                    >
                      {copied === platformKey ? <ClipboardCheck className="w-4 h-4" /> : <Clipboard className="w-4 h-4" />}
                      Copia post
                    </button>
                  )}
                </div>

                {result && result.platform === 'all' && (
                  <div className="flex gap-1.5 mb-4 border-b border-border overflow-x-auto">
                    {PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setActiveTab(p.id)}
                        className={cn(
                          'px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors',
                          activeTab === p.id ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {result ? (
                  <PlatformPreview platform={platformKey} post={postFor(platformKey)} />
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-10 text-center">
                    <Megaphone className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {generating ? 'Sto scrivendo i post…' : 'Compila l\'argomento e premi «Genera post» per vedere l\'anteprima.'}
                    </p>
                  </div>
                )}

                {result && postFor(platformKey) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Hash className="w-3 h-3" /> Testo completo da copiare</p>
                    <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/50 rounded-lg p-3 max-h-40 overflow-auto">{fullText(platformKey, postFor(platformKey))}</pre>
                  </div>
                )}

                {(generating || result?.image_url) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-terracotta" /> Immagine generata con AI
                    </p>
                    {generating ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/40 p-10 text-center">
                        <div className="w-6 h-6 border-2 border-muted-foreground/30 border-t-terracotta rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">Creazione immagine…</p>
                      </div>
                    ) : result?.image_url ? (
                      <div className="space-y-2">
                        <div className="rounded-xl overflow-hidden border border-border bg-muted/30">
                          <Image src={result.image_url} alt="Anteprima immagine" fittingType="fit" className="w-full" />
                        </div>
                        <a
                          href={result.image_url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-terracotta text-terracotta-foreground hover:bg-terracotta/90 transition-colors"
                        >
                          <Download className="w-4 h-4" /> Scarica immagine
                        </a>
                      </div>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function fullText(platform, post) {
  if (!post) return '';
  const parts = [post.text];
  if (Array.isArray(post.hashtags) && post.hashtags.length) parts.push(post.hashtags.join(' '));
  if (post.cta && !post.text?.includes(post.cta)) parts.push(post.cta);
  return parts.join('\n');
}