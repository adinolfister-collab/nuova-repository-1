import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Utensils,
  RefreshCw,
  Plus,
  Trash2,
  Calendar,
  Clock
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { MEAL_TYPE_KEYS } from '@/lib/enumLabels';
import { useI18n } from '@/lib/i18n';

export default function MealPhotoScannerDialog({ open, onOpenChange, onSaveMeal }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [imagePreview, setImagePreview] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [mealType, setMealType] = useState('pranzo');
  const [cookingMethod, setCookingMethod] = useState('al_forno');
  const [notes, setNotes] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetState = () => {
    setImagePreview(null);
    setAnalyzing(false);
    setResult(null);
    setNotes('');
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Formato non valido',
        description: 'Seleziona un file immagine (JPG, PNG o WEBP)',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setImagePreview(base64);
      analyzePhoto(base64, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async (base64, mimeType) => {
    setAnalyzing(true);
    setResult(null);

    try {
      const res = await fetch('/api/gemini/scan-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          mimeType: mimeType || 'image/jpeg',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore durante la scansione del pasto');
      }

      setResult(data);
      if (data.meal_type) setMealType(data.meal_type);
      if (data.cooking_method) setCookingMethod(data.cooking_method);
      if (data.ibd_evaluation?.tip) {
        setNotes(`Nota Nutrizionale Gemini: ${data.ibd_evaluation.tip}`);
      }

      toast({
        title: 'Pasto analizzato con successo!',
        description: `${data.meal_name || 'Piatto riconosciuto'} (~${data.total_kcal || 0} kcal)`,
      });
    } catch (err) {
      console.error('Scan error:', err);
      toast({
        title: 'Errore di analisi',
        description: err.message || 'Impossibile analizzare l\'immagine. Riprova con un\'altra foto.',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;

    const items = (result.items || []).map((it) => ({
      name: it.name,
      qty: it.qty || '',
      unit: it.unit || 'g',
      kcal: it.kcal || 0,
      proteine: it.proteine || 0,
      carboidrati: it.carboidrati || 0,
      kcal_source: 'gemini',
    }));

    const foodsStr =
      items.length > 0
        ? items.map((i) => `${i.name} (${i.qty}${i.unit})`).join(', ')
        : result.foods_summary || result.meal_name;

    const payload = {
      entry_date: selectedDate,
      meal_type: mealType,
      cooking_method: cookingMethod,
      tolerated: result.ibd_evaluation?.is_safe ?? true,
      items,
      foods: foodsStr,
      notes: notes || result.ibd_evaluation?.tip || '',
      reaction: 'nessuna',
      trigger_tags: result.ibd_evaluation?.trigger_warnings || [],
    };

    onSaveMeal(payload);
    handleClose();

    toast({
      title: 'Pasto registrato nel diario!',
      description: `${result.meal_name} salvato con successo con i valori calorici e nutrizionali.`,
    });
  };

  const getRiskBadge = (level) => {
    if (level === 'basso') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5" /> Rischio Basso (IBD-Friendly)
        </span>
      );
    }
    if (level === 'moderato') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          <AlertTriangle className="w-3.5 h-3.5" /> Rischio Moderato
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
        <AlertTriangle className="w-3.5 h-3.5" /> Possibile Trigger / Alto Rischio
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white flex items-center justify-center shadow-md">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                Scanner Pasti con Foto
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold">
                  Gemini Vision
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scatta o carica una foto del piatto: Gemini riconosce alimenti, grammature e calorie.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Photo upload / capture cards */}
          {!imagePreview ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl bg-primary/5 hover:bg-primary/10 transition-all text-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center text-primary mb-3 transition-colors">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-foreground">Scatta Foto</span>
                <span className="text-xs text-muted-foreground mt-1">Usa la fotocamera del dispositivo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border hover:border-foreground/40 rounded-2xl bg-card hover:bg-accent/50 transition-all text-center group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-accent group-hover:bg-accent/80 flex items-center justify-center text-foreground mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="font-semibold text-sm text-foreground">Carica Immagine</span>
                <span className="text-xs text-muted-foreground mt-1">Scegli dalla galleria o dai file</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Preview and re-take actions */}
              <div className="relative rounded-2xl overflow-hidden border border-border shadow-inner bg-slate-950 flex items-center justify-center max-h-56">
                <img
                  src={imagePreview}
                  alt="Anteprima pasto"
                  className="w-full h-full object-cover max-h-56"
                />
                <div className="absolute top-3 right-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="shadow-md bg-background/90 backdrop-blur-sm text-xs cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Cambia Foto
                  </Button>
                </div>

                {analyzing && (
                  <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-2" />
                    <p className="font-semibold text-sm">Gemini Vision sta analizzando il piatto...</p>
                    <p className="text-xs text-slate-300 mt-1">Identificazione ingredienti, porzioni e calorie</p>
                  </div>
                )}
              </div>

              {/* Analysis Result Card */}
              {result && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-card border border-border shadow-xs">
                    <div>
                      <h4 className="font-bold text-lg text-foreground flex items-center gap-2">
                        {result.meal_name || 'Piatto Rilevato'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {result.foods_summary}
                      </p>
                    </div>
                    <div>{getRiskBadge(result.ibd_evaluation?.risk_level)}</div>
                  </div>

                  {/* Nutritional Macros Highlights */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                        <Flame className="w-3.5 h-3.5" /> Kcal
                      </div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {result.total_kcal || 0}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20">
                      <div className="text-sky-600 dark:text-sky-400 text-xs font-semibold">
                        Proteine
                      </div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {result.total_protein || 0}g
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                        Carbo
                      </div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {result.total_carbs || 0}g
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                      <div className="text-rose-600 dark:text-rose-400 text-xs font-semibold">
                        Grassi
                      </div>
                      <div className="text-xl font-bold text-foreground mt-0.5">
                        {result.total_fat || 0}g
                      </div>
                    </div>
                  </div>

                  {/* IBD Tip & Warnings */}
                  {result.ibd_evaluation && (
                    <div className="p-3.5 rounded-xl bg-accent/60 border border-border text-xs space-y-2">
                      {result.ibd_evaluation.tip && (
                        <p className="text-foreground leading-relaxed">
                          💡 <strong>Consiglio IBD:</strong> {result.ibd_evaluation.tip}
                        </p>
                      )}
                      {result.ibd_evaluation.trigger_warnings?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            Attenzione a: {result.ibd_evaluation.trigger_warnings.join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Identified items list */}
                  {result.items?.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Ingredienti Riconosciuti
                      </Label>
                      <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                        {result.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-card border border-border"
                          >
                            <span className="font-medium text-foreground">{item.name}</span>
                            <div className="flex items-center gap-3 text-muted-foreground">
                              <span>
                                {item.qty} {item.unit}
                              </span>
                              <span className="font-semibold text-amber-600 dark:text-amber-400">
                                {item.kcal} kcal
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form fields to finalize record */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Data Pasto</Label>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="mt-1 h-10 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Tipo di Pasto</Label>
                      <select
                        value={mealType}
                        onChange={(e) => setMealType(e.target.value)}
                        className="mt-1 w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="colazione">Colazione</option>
                        <option value="pranzo">Pranzo</option>
                        <option value="cena">Cena</option>
                        <option value="spuntino">Spuntino</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border bg-card flex flex-row items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="text-xs cursor-pointer"
          >
            Annulla
          </Button>

          {result && (
            <Button
              type="button"
              onClick={handleSave}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold text-xs shadow-md cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> Registra nel Diario Pasti
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
