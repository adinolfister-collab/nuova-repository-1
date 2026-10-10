import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, FileText, Trash2, Pencil, ExternalLink, Stethoscope, FlaskConical, CalendarClock, Search, X, ScanLine, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { demoRecords } from '@/lib/demoData';
import { guestRecords } from '@/lib/guestEntries';
import { demoExtractedRecord } from '@/lib/demoResponses';
import { useI18n } from '@/lib/i18n';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import EmptyState from '@/components/EmptyState';
import DemoBanner from '@/components/DemoBanner';
import PullToRefresh from '@/components/PullToRefresh';
import EntityFormDialog from '@/components/EntityFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import useRecordScanner from '@/hooks/useRecordScanner';
import { useAuth } from '@/lib/AuthContext';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import ReadonlyBanner from '@/components/ReadonlyBanner';
import PremiumPaywall from '@/components/PremiumPaywall';
import RegisterNudge from '@/components/RegisterNudge';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { RECORD_TYPE_KEYS, recordTypeLabel, localeForLang } from '@/lib/enumLabels';
import { cn } from '@/lib/utils';

const fields = (t) => {
  const types = Object.entries(RECORD_TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  return [
    { name: 'record_date', label: t('common.date'), type: 'date' },
    { name: 'type', label: t('records.type'), type: 'select', options: types },
    { name: 'title', label: t('exams.title_field'), type: 'text' },
    { name: 'provider', label: t('records.provider'), type: 'text' },
    { name: 'location', label: t('records.location'), type: 'text' },
    { name: 'result_summary', label: t('records.result'), type: 'textarea' },
    { name: 'report_file_url', label: t('records.report'), type: 'file' },
    { name: 'next_appointment', label: t('records.next'), type: 'date' },
    { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ];
};

const typeIcon = { visita: Stethoscope, esame: FileText, esame_sangue: FlaskConical, referto: FileText, controllo: CalendarClock };
const typeColors = {
  visita: 'bg-primary/10 text-primary',
  esame: 'bg-sky-50 text-sky-600',
  esame_sangue: 'bg-rose-50 text-rose-500',
  referto: 'bg-violet-50 text-violet-600',
  controllo: 'bg-amber-50 text-amber-600',
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function Records() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { scanning, scan } = useRecordScanner();
  const { isAuthenticated, authChecked } = useAuth();
  const { guard, showPaywall, setShowPaywall, showNudge, setShowNudge, canWrite, isReadOnly } = useWriteGuard();
  const fileRef = useRef(null);
  const types = Object.entries(RECORD_TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [guestScanning, setGuestScanning] = useState(false);
  const scanningNow = scanning || guestScanning;

  const load = async () => {
    setLoading(true);
    if (!isAuthenticated) {
      const local = guestRecords.list();
      setItems(local.length ? local : demoRecords);
      setLoading(false);
      return;
    }
    try {
      const data = await base44.entities.MedicalRecord.list('-record_date', 200);
      setItems(data);
    } catch { setItems([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [isAuthenticated, authChecked]);

  const onScanFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!guard('record_write')) return;
    if (!isAuthenticated) {
      setGuestScanning(true);
      setTimeout(() => {
        setGuestScanning(false);
        setEditing(demoExtractedRecord(file.name));
        setOpen(true);
      }, 900);
      return;
    }
    const res = await scan(file);
    if (!res) return;
    if (res.kind === 'medication') {
      toast({ title: t('records.therapy_saved'), description: res.medication?.name || '' });
      load();
    } else if (res.kind === 'record') {
      setEditing(res.record);
      setOpen(true);
    } else if (res.kind === 'duplicate') {
      toast({ title: t('exams.duplicate'), description: t('exams.duplicate_hint'), variant: 'destructive' });
    } else if (res.kind === 'error') {
      toast({ title: t('exams.scan_error'), description: res.error, variant: 'destructive' });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lf = locFilter.trim().toLowerCase();
    return items.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (dateFrom && (r.record_date || '') < dateFrom) return false;
      if (dateTo && (r.record_date || '') > dateTo) return false;
      if (lf && !(r.location || '').toLowerCase().includes(lf) && !(r.provider || '').toLowerCase().includes(lf)) return false;
      if (q) {
        const blob = [r.title, r.provider, r.location, r.result_summary, r.notes].filter(Boolean).join(' ').toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [items, search, typeFilter, dateFrom, dateTo, locFilter]);

  const hasFilters = !!(search || typeFilter !== 'all' || dateFrom || dateTo || locFilter);
  const resetFilters = () => { setSearch(''); setTypeFilter('all'); setDateFrom(''); setDateTo(''); setLocFilter(''); };

  const openNew = () => { if (!guard('record_write')) return; setEditing({ record_date: todayStr() }); setOpen(true); };
  const openEdit = (item) => { if (!guard('record_write')) return; setEditing(item); setOpen(true); };

  const handleSubmit = async (data) => {
    if (!guard('record_write')) return;
    if (!isAuthenticated) {
      if (editing?.id && !String(editing.id).startsWith('demo-')) {
        guestRecords.update(editing.id, data);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      } else {
        const entry = guestRecords.add(data);
        setItems((prev) => [entry, ...prev.filter((it) => !String(it.id).startsWith('demo-'))]);
      }
      setOpen(false);
      return;
    }
    if (editing?.id) await base44.entities.MedicalRecord.update(editing.id, data);
    else await base44.entities.MedicalRecord.create(data);
    setOpen(false); load();
  };
  const handleDelete = async (id) => {
    if (!guard('record_write')) return;
    if (!isAuthenticated) {
      guestRecords.remove(id);
      setItems((prev) => {
        const remaining = prev.filter((it) => it.id !== id);
        return remaining.length ? remaining : demoRecords;
      });
      return;
    }
    await base44.entities.MedicalRecord.delete(id);
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title={t('records.title')}
        subtitle={t('records.subtitle')}
        action={
          <div className="flex gap-2 flex-wrap">
            <input ref={fileRef} type="file" accept="image/*,application/pdf" onChange={onScanFile} className="hidden" />
            <Button
              variant="outline"
              className={cn("rounded-xl", !canWrite && "opacity-60 cursor-not-allowed")}
              onClick={() => fileRef.current?.click()}
              disabled={scanningNow || !canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
            >
              {scanningNow ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <ScanLine className="w-4 h-4 mr-1.5" />}{t('exams.scan_new_record')}
            </Button>
            <Button
              onClick={openNew}
              className={cn("rounded-xl", !canWrite && "opacity-60 cursor-not-allowed")}
              disabled={scanningNow || !canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
            >
              <Plus className="w-4 h-4 mr-1.5" />{t('records.add')}
            </Button>
          </div>
        }
      />
      <ReadonlyBanner />
      <PageEditorial pageKey="records" />

      {authChecked && !isAuthenticated && <DemoBanner onReset={load} />}

      {/* Search & advanced filters */}
      <Card className="border-0 shadow-sm mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('records.search_placeholder')}
              className="w-full rounded-xl border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="rounded-xl bg-background text-sm"><SelectValue placeholder={t('records.all_types')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('records.all_types')}</SelectItem>
                {types.map((tp) => (<SelectItem key={tp.value} value={tp.value}>{tp.label}</SelectItem>))}
              </SelectContent>
            </Select>
            <input
              value={locFilter}
              onChange={(e) => setLocFilter(e.target.value)}
              placeholder={t('records.provider_placeholder')}
              className="rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-muted-foreground">{t('summary.from')}</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground">{t('summary.to')}</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          {hasFilters && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('records.results_count').replace('{n}', filtered.length)}</span>
              <button onClick={resetFilters} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" /> {t('records.reset_filters')}
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title={hasFilters ? t('records.no_filter_match') : t('common.empty')} description={hasFilters ? t('records.no_filter_match_desc') : t('records.subtitle')} />
      ) : (
        <PullToRefresh onRefresh={load}>
        <div className="space-y-3">
          {filtered.map((r) => {
            const Icon = typeIcon[r.type] || FileText;
            return (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', typeColors[r.type] || 'bg-accent')}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{r.title}</p>
                        <p className="text-sm text-muted-foreground">{recordTypeLabel(t, r.type)} · {formatDate(r.record_date, lang)}</p>
                      </div>
                    </div>
                    {(!isAuthenticated && String(r.id).startsWith('demo-')) ? (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{t('demo.example_label')}</span>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(r.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                  {(r.provider || r.location) && <p className="text-sm text-muted-foreground mt-3">{[r.provider, r.location].filter(Boolean).join(' · ')}</p>}
                  {r.result_summary && <p className="text-base mt-2 whitespace-pre-wrap">{r.result_summary}</p>}
                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    {r.report_file_url && (
                      <a href={r.report_file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
                        <ExternalLink className="w-4 h-4" /> {t('records.report')}
                      </a>
                    )}
                    {r.next_appointment && (
                      <span className="inline-flex items-center gap-1.5 text-sm text-amber-600">
                        <CalendarClock className="w-4 h-4" /> {t('records.next')}: {formatDate(r.next_appointment, lang)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        </PullToRefresh>
      )}

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? t('common.edit') : t('records.add')}
        submitLabel={t('common.save')}
        fields={fields(t)}
        initialData={editing}
        onSubmit={handleSubmit}
      />
      <EditorialBlock sectionKey="records_archive" align="right" />
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
      <RegisterNudge open={showNudge} onClose={() => setShowNudge(false)} />
    </AppLayout>
  );
}

function formatDate(d, lang) { try { return new Date(d).toLocaleDateString(localeForLang(lang), { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; } }