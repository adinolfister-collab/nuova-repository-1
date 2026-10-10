import React, { useEffect, useState } from 'react';
import { Plus, Utensils, Trash2, Pencil, BookMarked, ShieldCheck, Camera, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import MealTemplateManager from '@/components/MealTemplateManager';
import MealPhotoScannerDialog from '@/components/food/MealPhotoScannerDialog';
import DietaryTips from '@/components/DietaryTips';
import ToleranceOverview from '@/components/ToleranceOverview';
import CookingCorrelation from '@/components/CookingCorrelation';
import FoodLessons from '@/components/FoodLessons';
import FoodReportButton from '@/components/FoodReportButton';
import TriggerTagManager from '@/components/TriggerTagManager';
import { usePremiumGate } from '@/hooks/usePremiumGate';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/AppLayout';
import DemoBanner from '@/components/DemoBanner';
import { demoFoods } from '@/lib/demoData';
import { guestFoods } from '@/lib/guestEntries';
import { useWriteGuard } from '@/hooks/useWriteGuard';
import ReadonlyBanner from '@/components/ReadonlyBanner';
import PremiumPaywall from '@/components/PremiumPaywall';
import RegisterNudge from '@/components/RegisterNudge';
import PageHeader from '@/components/PageHeader';
import PageEditorial from '@/components/PageEditorial';
import EditorialBlock from '@/components/EditorialBlock';
import MagazineEssay from '@/components/MagazineEssay';
import EmptyState from '@/components/EmptyState';
import FoodFormDialog from '@/components/FoodFormDialog';
import FoodCatalogManager from '@/components/FoodCatalogManager';
import DailyNutrition from '@/components/DailyNutrition';
import FoodDateNavigator from '@/components/food/FoodDateNavigator';
import CalorieBalanceCard from '@/components/food/CalorieBalanceCard';
import ManualActivityForm from '@/components/food/ManualActivityForm';
import ActivityImport from '@/components/import/ActivityImport';
import { catalogToGroups, parseLegacyFoods, serializeItems } from '@/lib/foodCatalog';
import { MEAL_TYPE_KEYS, REACTION_KEYS, reactionLabel, unitLabel } from '@/lib/enumLabels';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import PullToRefresh from '@/components/PullToRefresh';

function todayStr() { return new Date().toISOString().slice(0, 10); }

const reactionTone = { nessuna: 'text-emerald-600', lieve: 'text-amber-600', moderata: 'text-orange-600', severa: 'text-rose-500' };

export default function Food() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user, isAuthenticated, authChecked } = useAuth();
  const { guard, showPaywall, setShowPaywall, showNudge, setShowNudge, canWrite, isReadOnly } = useWriteGuard();
  const isAdmin = user?.role === 'admin';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [tplMgrOpen, setTplMgrOpen] = useState(false);
  const [catalogGroups, setCatalogGroups] = useState([]);
  const [catalogMgrOpen, setCatalogMgrOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [triggerTags, setTriggerTags] = useState([]);
  const [symptomEntries, setSymptomEntries] = useState([]);
  const { requirePremium, isSubscribed, showPaywall: premiumPaywallOpen, setShowPaywall: setPremiumPaywallOpen } = usePremiumGate();

  const load = async () => {
    setLoading(true);
    if (!isAuthenticated) {
      const local = guestFoods.list();
      setItems(local.length ? local : demoFoods);
      setLoading(false);
      return;
    }
    try {
      const data = await base44.entities.FoodEntry.list('-entry_date', 200);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };
  const refresh = async () => {
    if (!isAuthenticated) {
      const local = guestFoods.list();
      setItems(local.length ? local : demoFoods);
      return;
    }
    const data = await base44.entities.FoodEntry.list('-entry_date', 200);
    setItems(data);
  };
  const loadTemplates = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await base44.entities.MealTemplate.list('-created_date', 100);
      setTemplates(data);
    } catch {
      setTemplates([]);
    }
  };
  const loadCatalog = async () => {
    if (!isAuthenticated) { setCatalogGroups(catalogToGroups([])); return; }
    try {
      const data = await base44.entities.FoodCatalogItem.list('-created_date', 500);
      setCatalogGroups(catalogToGroups(data));
    } catch {
      setCatalogGroups(catalogToGroups([]));
    }
  };
  const loadTriggerTags = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await base44.entities.FoodTriggerTag.list('-created_date', 200);
      setTriggerTags(data);
    } catch {
      setTriggerTags([]);
    }
  };
  const loadSymptoms = async () => {
    if (!isAuthenticated) return;
    try {
      const data = await base44.entities.SymptomEntry.list('-entry_date', 1000);
      setSymptomEntries(data);
    } catch {
      setSymptomEntries([]);
    }
  };
  useEffect(() => {
    load();
    loadTemplates();
    loadCatalog();
    loadTriggerTags();
    loadSymptoms();
  }, [isAuthenticated, authChecked]);

  const openNew = () => { if (!guard('food_write')) return; setEditing({ entry_date: todayStr(), tolerated: true, items: [] }); setOpen(true); };
  const openEdit = (it) => {
    if (!guard('food_write')) return;
    const sel = Array.isArray(it.items) && it.items.length ? it.items : parseLegacyFoods(it.foods);
    setEditing({ ...it, items: sel, tolerated: it.tolerated ?? true });
    setOpen(true);
  };

  const handleSubmit = (data) => {
    if (!guard('food_write')) return;
    setOpen(false);
    const sel = Array.isArray(data.items) ? data.items : [];
    const payload = { ...data, items: sel, foods: serializeItems(sel) || data.foods || '' };
    if (!isAuthenticated) {
      if (editing?.id && !String(editing.id).startsWith('demo-')) {
        guestFoods.update(editing.id, payload);
        setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...payload } : it)));
      } else {
        const entry = guestFoods.add(payload);
        setItems((prev) => {
          const rest = prev.filter((it) => !String(it.id).startsWith('demo-'));
          return [entry, ...rest];
        });
      }
      return;
    }
    if (editing?.id) {
      const previous = items.find((it) => it.id === editing.id) || editing;
      setItems((prev) => prev.map((it) => (it.id === editing.id ? { ...it, ...payload } : it)));
      base44.entities.FoodEntry.update(editing.id, payload).catch(() => {
        setItems((prev) => prev.map((it) => (it.id === editing.id ? previous : it)));
        toast({ title: t('common.error'), description: t('food.error_save'), variant: 'destructive' });
      });
    } else {
      const tempId = `temp_${Date.now()}`;
      setItems((prev) => [{ ...payload, id: tempId }, ...prev]);
      base44.entities.FoodEntry.create(payload)
        .then((created) => setItems((prev) => prev.map((it) => (it.id === tempId ? created : it))))
        .catch(() => {
          setItems((prev) => prev.filter((it) => it.id !== tempId));
          toast({ title: t('common.error'), description: t('food.error_add'), variant: 'destructive' });
        });
    }
  };

  const handleSaveFromScanner = (payload) => {
    if (!guard('food_write')) return;
    if (!isAuthenticated) {
      const entry = guestFoods.add(payload);
      setItems((prev) => {
        const rest = prev.filter((it) => !String(it.id).startsWith('demo-'));
        return [entry, ...rest];
      });
      return;
    }
    const tempId = `temp_${Date.now()}`;
    setItems((prev) => [{ ...payload, id: tempId }, ...prev]);
    base44.entities.FoodEntry.create(payload)
      .then((created) => setItems((prev) => prev.map((it) => (it.id === tempId ? created : it))))
      .catch(() => {
        setItems((prev) => prev.filter((it) => it.id !== tempId));
        toast({ title: t('common.error'), description: t('food.error_add'), variant: 'destructive' });
      });
  };

  const handleDelete = async (id) => {
    if (!guard('food_write')) return;
    if (!isAuthenticated) {
      guestFoods.remove(id);
      setItems((prev) => {
        const remaining = prev.filter((it) => it.id !== id);
        return remaining.length ? remaining : demoFoods;
      });
      return;
    }
    await base44.entities.FoodEntry.delete(id);
    load();
  };
  const openFromTemplate = (tpl) => {
    setEditing({ entry_date: todayStr(), meal_type: tpl.meal_type, items: parseLegacyFoods(tpl.foods), notes: tpl.notes || '', tolerated: true });
    setOpen(true);
  };
  const saveTemplate = async (data) => { await base44.entities.MealTemplate.create(data); loadTemplates(); };
  const updateTemplate = async (id, data) => { await base44.entities.MealTemplate.update(id, data); loadTemplates(); };
  const deleteTemplate = async (id) => { await base44.entities.MealTemplate.delete(id); loadTemplates(); };

  const dayItems = items.filter((it) => it.entry_date === selectedDate);

  return (
    <AppLayout>
      <PageHeader
        title={t('food.title')}
        subtitle={t('food.subtitle')}
        action={
          <div className="flex gap-2 flex-wrap justify-end">
            {isAdmin && (
              <Button onClick={() => setCatalogMgrOpen(true)} variant="outline" className="rounded-xl"><ShieldCheck className="w-4 h-4 mr-1.5" />{t('food.catalog_manage')}</Button>
            )}
            {isAuthenticated && (
              <Button onClick={() => setTplMgrOpen(true)} variant="outline" className="rounded-xl"><BookMarked className="w-4 h-4 mr-1.5" />{t('food.templates')}</Button>
            )}
            <Button
              onClick={() => { if (!guard('food_write')) return; setScannerOpen(true); }}
              variant="outline"
              disabled={!canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
              className={cn(
                "rounded-xl border-emerald-500/40 text-emerald-800 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/30 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 shadow-xs cursor-pointer",
                !canWrite && "opacity-60 cursor-not-allowed"
              )}
            >
              <Camera className="w-4 h-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
              <span>Foto Scanner</span>
            </Button>
            <Button
              onClick={openNew}
              className={cn("rounded-xl", !canWrite && "opacity-60 cursor-not-allowed")}
              disabled={!canWrite}
              title={!canWrite ? t('trial.readonly_hint') : undefined}
            >
              <Plus className="w-4 h-4 mr-1.5" />{t('food.add')}
            </Button>
            <FoodReportButton foods={items} />
          </div>
        }
      />
      <ReadonlyBanner />
      {authChecked && !isAuthenticated && <DemoBanner onReset={load} />}
      {isAuthenticated && templates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
          {templates.map((tpl) => (
            <button key={tpl.id} onClick={() => openFromTemplate(tpl)} className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-accent text-accent-foreground text-sm hover:bg-accent/70 transition-colors">
              <BookMarked className="w-3.5 h-3.5 text-primary" />
              <span>{tpl.name}</span>
            </button>
          ))}
        </div>
      )}
      <FoodDateNavigator value={selectedDate} onChange={setSelectedDate} mealCount={dayItems.length} />
      <div className="mb-3">
        <CalorieBalanceCard foods={dayItems} selectedDate={selectedDate} />
      </div>
      {isAuthenticated && (
        <div className="mb-3 space-y-3">
          <ManualActivityForm defaultDate={selectedDate} onSaved={refresh} />
          <ActivityImport defaultDate={selectedDate} onSaved={refresh} />
        </div>
      )}
      <PullToRefresh onRefresh={refresh}>
      {loading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : dayItems.length === 0 ? (
        <EmptyState icon={Utensils} title={t('food.no_meals_day')} description={t('food.no_meals_day_desc')} />
      ) : (
        <div className="space-y-3">
          {dayItems.map((it) => (
            <Card key={it.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium bg-accent text-accent-foreground px-2.5 py-1 rounded-full">{it.meal_type ? t(MEAL_TYPE_KEYS[it.meal_type]) : '—'}</span>
                    {it.reaction && <span className={cn('text-xs font-medium', reactionTone[it.reaction])}>· {reactionLabel(t, it.reaction)}</span>}
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
                {Array.isArray(it.items) && it.items.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {it.items.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-terracotta/10 text-accent-foreground text-xs">
                        <span className="font-medium">{f.name}</span>
                        {f.qty ? (
                          <span className="text-muted-foreground">{f.qty}{f.unit && f.unit !== 'porzione' ? ' ' + unitLabel(t, f.unit) : ''}</span>
                        ) : (f.unit && f.unit !== 'porzione' ? (
                          <span className="text-muted-foreground">{unitLabel(t, f.unit)}</span>
                        ) : null)}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-base whitespace-pre-wrap">{it.foods}</p>
                )}
                {it.notes && <p className="text-sm text-muted-foreground mt-2">{it.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      </PullToRefresh>

      <PageEditorial pageKey="food" />
      <MagazineEssay theme="alimentazione" number="01" eyebrow={t('food.magazine_eyebrow')} title={t('food.magazine_title')}>
      <div className="mb-6">
        <DailyNutrition entries={items} groups={catalogGroups} />
      </div>
      <ToleranceOverview foods={items} />
      {isAuthenticated && (
        <div className="mt-6">
          <DietaryTips />
        </div>
      )}
      <div className="mt-6">
        <CookingCorrelation foods={items} />
      </div>
      <div className="mt-6">
        <FoodLessons />
      </div>
      {isAuthenticated && (
        <div className="mt-6">
          <TriggerTagManager
            tags={triggerTags}
            foods={items}
            symptoms={symptomEntries}
            onTagsChanged={setTriggerTags}
            premiumBlocked={!isSubscribed}
            onRequirePremium={() => requirePremium('trigger_correlation')}
            guard={guard}
          />
        </div>
      )}
      </MagazineEssay>

      <FoodFormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing?.id ? t('common.edit') : t('food.add')}
        submitLabel={t('common.save')}
        groups={catalogGroups}
        initialData={editing}
        onSubmit={handleSubmit}
        triggerTags={triggerTags}
      />
      <MealPhotoScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onSaveMeal={handleSaveFromScanner}
      />
      {isAuthenticated && (
        <MealTemplateManager
          open={tplMgrOpen}
          onOpenChange={setTplMgrOpen}
          templates={templates}
          onCreate={saveTemplate}
          onUpdate={updateTemplate}
          onDelete={deleteTemplate}
        />
      )}
      {isAdmin && (
        <FoodCatalogManager
          open={catalogMgrOpen}
          onOpenChange={setCatalogMgrOpen}
          onChanged={loadCatalog}
        />
      )}
      <EditorialBlock sectionKey="food_reactions" align="right" />
      <PremiumPaywall open={showPaywall} onClose={() => setShowPaywall(false)} />
      <PremiumPaywall open={premiumPaywallOpen} onClose={() => setPremiumPaywallOpen(false)} />
      <RegisterNudge open={showNudge} onClose={() => setShowNudge(false)} />
    </AppLayout>
  );
}