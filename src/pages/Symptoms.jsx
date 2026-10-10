import React, { useEffect, useState } from 'react';
import { Plus, Activity, Trash2, Pencil, FileDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/AppLayout';
import DemoBanner from '@/components/DemoBanner';
import { demoSymptoms } from '@/lib/demoData';
import { guestSymptoms } from '@/lib/guestEntries';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import ReadonlyBanner from '@/components/ReadonlyBanner';
import PremiumPaywall from '@/components/PremiumPaywall';
import RegisterNudge from '@/components/RegisterNudge';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import MagazineEssay from '@/components/MagazineEssay';
import EmptyState from '@/components/EmptyState';
import EntityFormDialog from '@/components/EntityFormDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { exportSymptomDiaryPdf } from '@/lib/symptomPdf';
import { PAIN_LOCATION_KEYS, MOOD_KEYS, BRISTOL_KEYS, localeForLang } from '@/lib/enumLabels';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import PullToRefresh from '@/components/PullToRefresh';

const fields = (t) => {
  const painLocations = Object.entries(PAIN_LOCATION_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  const moods = Object.entries(MOOD_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  return [
    { name: 'entry_date', label: t('common.date'), type: 'date' },
    { name: 'pain_level', label: t('symptoms.pain') + ' (0–10)', type: 'slider', min: 0, max: 10 },
    { name: 'pain_location', label: t('symptoms.pain_location'), type: 'select', options: painLocations },
    { name: 'fatigue_level', label: t('symptoms.fatigue') + ' (0–10)', type: 'slider', min: 0, max: 10 },
    { name: 'bowel_movements_count', label: t('symptoms.bowel'), type: 'number', min: 0 },
    { name: 'stool_consistency', label: t('symptoms.stool') + ' (scala Bristol)', type: 'bristol' },
    { name: 'blood', label: t('symptoms.blood'), type: 'checkbox' },
    { name: 'mood', label: t('symptoms.mood'), type: 'select', options: moods },
    { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ];
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function Symptoms() {
  const { t, lang } = useI18n();
  const { toast } = useToast();
  const { isAuthenticated, authChecked } = useAuth();
  const { guard, showPaywall, setShowPaywall, showNudge, setShowNudge, canWrite, isReadOnly } = useWriteGuard();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    if (!isAuthenticated) {
      const local = guestSymptoms.list();
      setItems(local.length ? local : demoSymptoms);
      setLoading(false);
      return;
    }
    try {
      const data = await base44.entities.SymptomEntry.list('-entry_date', 1000);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  const refresh = async () => {
    if (!isAuthenticated) {
      const local = guestSymptoms.list();
      setItems(local.length ? local : demoSymptoms);
      return;
    }
    const data = await base44.entities.SymptomEntry.list('-entry_date', 1000);
    setItems(data);
  };
  useEffect(() => {
    load();
  }, [isAuthenticated, authChecked]);

  const openNew = () => {
    if (!guard('symptom_write')) return;
    setEditing({ entry_date: todayStr() });
    setOpen(true);
  };
  const openEdit = (item) => {
    if (!guard('symptom_write')) return;
    setEditing(item);
    setOpen(true);
  };

  const handleSubmit = (data) => {
    if (!guard('symptom_write')) return;
    setOpen(false);
    const payload = { ...data, pain_level: data.pain_level ?? 0, fatigue_level: data.fatigue_level ?? 0 };
    if (!isAuthenticated) {
      if (editing?.id && !String(editing.id).startsWith('demo-')) {
        guestSymptoms.update(editing.id, payload);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...payload } : it)));
      } else {
        const entry = guestSymptoms.add(payload);
        setItems((prev) =>
          [entry, ...prev.filter((it) => !String(it.id).startsWith('demo-'))].sort(
            (a, b) => (b.entry_date || '').localeCompare(a.entry_date || '')
          )
        );
      }
      return;
    }
    if (editing?.id) {
      const previous = items.find((it) => it.id === editing.id) || editing;
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...payload } : it)));
      base44.entities.SymptomEntry.update(editing.id, data).catch(() => {
        setItems((prev) => prev.map((it) => (it.id === editing.id ? previous : it)));
        toast({ title: t('common.error'), description: t('common.error_save'), variant: 'destructive' });
      });
    } else {
      const tempId = `temp_${Date.now()}`;
      setItems((prev) =>
        [{ ...payload, id: tempId }, ...prev].sort((a, b) => (b.entry_date || '').localeCompare(a.entry_date || ''))
      );
      base44.entities.SymptomEntry.create(payload)
        .then((created) => setItems((prev) => prev.map((it) => (it.id === tempId ? created : it))))
        .catch(() => {
          setItems((prev) => prev.filter((it) => it.id !== tempId));
          toast({ title: t('common.error'), description: t('common.error_add'), variant: 'destructive' });
        });
    }
  };

  const handleDelete = async (id) => {
    if (!guard('symptom_write')) return;
    if (!isAuthenticated) {
      guestSymptoms.remove(id);
      setItems((prev) => {
        const remaining = prev.filter((it) => it.id !== id);
        return remaining.length ? remaining : demoSymptoms;
      });
      return;
    }
    await base44.entities.SymptomEntry.delete(id);
    load();
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    setExporting(true);
    try { await exportSymptomDiaryPdf(items); } finally { setExporting(false); }
  };

  return (
    <AppLayout>
      <PageHeader
        title={t('symptoms.title')}
        subtitle={t('symptoms.subtitle')}
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl" onClick={handleExport} disabled={exporting || items.length === 0}>
              <FileDown className="w-4 h-4 mr-1.5" />{t('symptoms.export_pdf')}
            </Button>
            <Button
              onClick={openNew}
              className={cn("rounded-xl", !canWrite && "opacity-60 cursor-not-allowed")}
              disabled={!canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
            >
              <Plus className="w-4 h-4 mr-1.5" />{t('symptoms.add')}
            </Button>
          </div>
        }
      />
      <ReadonlyBanner />
      <PageEditorial pageKey="symptoms" />
      <MagazineEssay theme="sintomi" number="01" eyebrow={t('symptoms.magazine_eyebrow')} title={t('symptoms.magazine_title')}>
      {authChecked && !isAuthenticated && <DemoBanner onReset={load} />}
      <PullToRefresh onRefresh={refresh}>
      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Activity} title={t('common.empty')} description={t('symptoms.subtitle')} />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-lg">{formatDate(it.entry_date, lang)}</p>
                    {it.blood && <span className="inline-block mt-1 text-xs bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium">{t('symptoms.blood_present')}</span>}
                  </div>
                  {(!isAuthenticated && String(it.id).startsWith('demo-')) ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{t('demo.example_label')}</span>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(it)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(it.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <Mini label={t('symptoms.pain')} value={`${it.pain_level ?? 0}/10`} tone={tone(it.pain_level)} />
                  <Mini label={t('symptoms.fatigue')} value={`${it.fatigue_level ?? 0}/10`} tone={tone(it.fatigue_level)} />
                  <Mini label={t('symptoms.bowel')} value={it.bowel_movements_count ?? 0} />
                  <Mini label={t('symptoms.stool')} value={it.stool_consistency ? t('symptoms.stool_type').replace('{n}', it.stool_consistency) : '—'} />
                </div>
                {it.notes && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{it.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </PullToRefresh>
      </MagazineEssay>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? t('common.edit') : t('symptoms.add')}
        submitLabel={t('common.save')}
        fields={fields(t)}
        initialData={editing}
        onSubmit={handleSubmit}
      />
      <EditorialBlock sectionKey="symptoms_journal" align="left" />
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
      <RegisterNudge open={showNudge} onClose={() => setShowNudge(false)} />
    </AppLayout>
  );
}

function Mini({ label, value, tone }) {
  return (
    <div className="bg-accent/50 rounded-xl p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-xl font-semibold mt-0.5', tone)}>{value}</p>
    </div>
  );
}
function tone(v) { if (v == null) return ''; if (v >= 7) return 'text-rose-500'; if (v >= 4) return 'text-amber-600'; return 'text-emerald-600'; }
function formatDate(d, lang) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString(localeForLang(lang), { weekday: 'long', day: 'numeric', month: 'long' }); } catch { return d; }
}