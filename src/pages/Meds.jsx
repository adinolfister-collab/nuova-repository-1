import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pill, Trash2, Pencil, Clock, CalendarDays } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import ReadonlyBanner from '@/components/ReadonlyBanner';
import PremiumPaywall from '@/components/PremiumPaywall';
import RegisterNudge from '@/components/RegisterNudge';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import MagazineEssay from '@/components/MagazineEssay';
import EmptyState from '@/components/EmptyState';
import DemoBanner from '@/components/DemoBanner';
import { demoMeds } from '@/lib/demoData';
import { guestMeds } from '@/lib/guestEntries';
import EntityFormDialog from '@/components/EntityFormDialog';
import TherapyCorrelation from '@/components/TherapyCorrelation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MED_TYPE_KEYS, MED_FREQUENCY_KEYS, medTypeLabel, medFrequencyLabel } from '@/lib/enumLabels';
import { cn } from '@/lib/utils';

const fields = (t) => {
  const types = Object.entries(MED_TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  const frequencies = Object.entries(MED_FREQUENCY_KEYS).map(([value, key]) => ({ value, label: t(key) }));
  return [
    { name: 'name', label: t('meds.name'), type: 'text' },
    { name: 'type', label: t('meds.type'), type: 'select', options: types },
    { name: 'dosage', label: t('meds.dosage'), type: 'text' },
    { name: 'frequency', label: t('meds.frequency'), type: 'select', options: frequencies },
    { name: 'times', label: t('meds.times') + ' ' + t('meds.times_hint'), type: 'text' },
    { name: 'start_date', label: t('meds.start_date'), type: 'date' },
    { name: 'active', label: t('meds.active'), type: 'checkbox' },
    { name: 'notes', label: t('common.notes'), type: 'textarea' },
  ];
};

const typeColors = {
  farmaco_orale: 'bg-sky-50 text-sky-600',
  iniezione: 'bg-violet-50 text-violet-600',
  biologico: 'bg-emerald-50 text-emerald-600',
  integratore: 'bg-amber-50 text-amber-600',
};

export default function Meds() {
  const { t, lang } = useI18n();
  const { isAuthenticated, authChecked } = useAuth();
  const navigate = useNavigate();
  const { guard, showPaywall, setShowPaywall, showNudge, setShowNudge, canWrite, isReadOnly } = useWriteGuard();
  const { requirePremium, isSubscribed, showPaywall: premiumPaywallOpen, setShowPaywall: setPremiumPaywallOpen } = usePremiumGate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [symptoms, setSymptoms] = useState([]);

  const load = async () => {
    setLoading(true);
    if (!isAuthenticated) {
      const local = guestMeds.list();
      setItems(local.length ? local : demoMeds);
      setLoading(false);
      return;
    }
    try {
      const data = await base44.entities.Medication.list('-created_date', 200);
      setItems(data);
    } catch { setItems([]); }
    setLoading(false);
  };
  const loadSymptoms = async () => {
    if (!isAuthenticated) { setSymptoms([]); return; }
    try {
      const data = await base44.entities.SymptomEntry.list('-entry_date', 1000);
      setSymptoms(data);
    } catch { setSymptoms([]); }
  };
  useEffect(() => { load(); loadSymptoms(); }, [isAuthenticated, authChecked]);

  const openNew = () => { if (!guard('med_write')) return; setEditing({ active: true }); setOpen(true); };
  const openEdit = (item) => { if (!guard('med_write')) return; setEditing(item); setOpen(true); };

  const handleSubmit = async (data) => {
    if (!guard('med_write')) return;
    setOpen(false);
    if (!isAuthenticated) {
      if (editing?.id && !String(editing.id).startsWith('demo-')) {
        guestMeds.update(editing.id, data);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...data } : it)));
      } else {
        const entry = guestMeds.add(data);
        setItems((prev) => [entry, ...prev.filter((it) => !String(it.id).startsWith('demo-'))]);
      }
      return;
    }
    if (editing?.id) await base44.entities.Medication.update(editing.id, data);
    else await base44.entities.Medication.create(data);
    load();
  };
  const handleDelete = async (id) => {
    if (!guard('med_write')) return;
    if (!isAuthenticated) {
      guestMeds.remove(id);
      setItems((prev) => {
        const remaining = prev.filter((it) => it.id !== id);
        return remaining.length ? remaining : demoMeds;
      });
      return;
    }
    await base44.entities.Medication.delete(id);
    load();
  };

  return (
    <AppLayout>
      <PageHeader
        title={t('meds.title')}
        subtitle={t('meds.subtitle')}
        action={
          <div className="flex gap-2 flex-wrap">
            {items.length > 0 && (
              <Button variant="outline" onClick={() => navigate('/meds/calendar')} className="rounded-xl">
                <CalendarDays className="w-4 h-4 mr-1.5" /> {t('meds.cal.open')}
              </Button>
            )}
            <Button
              onClick={openNew}
              className={cn("rounded-xl", !canWrite && "opacity-60 cursor-not-allowed")}
              disabled={!canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
            >
              <Plus className="w-4 h-4 mr-1.5" />{t('meds.add')}
            </Button>
          </div>
        }
      />
      <ReadonlyBanner />
      <PageEditorial pageKey="meds" />
      <MagazineEssay theme="terapie" number="01" eyebrow={t('meds.magazine_eyebrow')} title={t('meds.magazine_title')}>
      {authChecked && !isAuthenticated && <DemoBanner onReset={load} />}
      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : items.length === 0 ? (
        <EmptyState icon={Pill} title={t('common.empty')} description={t('meds.subtitle')} />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} className={cn('border-0 shadow-sm', !m.active && 'opacity-60')}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center', typeColors[m.type] || 'bg-accent')}>
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{medTypeLabel(t, m.type)}{m.dosage ? ' · ' + m.dosage : ''}</p>
                    </div>
                  </div>
                  {(!isAuthenticated && String(m.id).startsWith('demo-')) ? (
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground/60">{t('demo.example_label')}</span>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(m)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(m.id)} className="p-2 rounded-lg hover:bg-rose-50 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="w-4 h-4" /> {m.times || '—'}
                  </span>
                  <span className="text-muted-foreground">· {medFrequencyLabel(t, m.frequency)}</span>
                  {m.active && <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium ml-auto">{t('meds.active')}</span>}
                </div>
                {m.notes && <p className="text-sm text-muted-foreground mt-3">{m.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </MagazineEssay>

      <div className="mt-8">
        <div className="flex items-center gap-2 mb-3">
          <p className="font-heading text-lg font-semibold">{t('therapy_corr.title')}</p>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('therapy_corr.subtitle')}</p>
        <TherapyCorrelation
          meds={items}
          symptoms={symptoms}
          lang={lang}
          premiumBlocked={!isSubscribed}
          onRequirePremium={() => requirePremium('therapy_correlation')}
        />
      </div>

      <EntityFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? t('common.edit') : t('meds.add')}
        submitLabel={t('common.save')}
        fields={fields(t)}
        initialData={editing}
        onSubmit={handleSubmit}
      />
      <EditorialBlock sectionKey="meds_adherence" align="left" />
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
      <PremiumPaywall open={premiumPaywallOpen} onClose={() => setPremiumPaywallOpen(false)} />
      <RegisterNudge open={showNudge} onClose={() => setShowNudge(false)} />
    </AppLayout>
  );
}