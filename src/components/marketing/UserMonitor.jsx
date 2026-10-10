import React, { useState, useEffect, useMemo } from 'react';
import { Users, RefreshCw, Crown, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const TRIAL_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function trialInfo(u) {
  if (!u.promo_start_date) return null;
  const start = new Date(u.promo_start_date).getTime();
  const end = start + TRIAL_DAYS * DAY_MS;
  const daysLeft = Math.ceil((end - Date.now()) / DAY_MS);
  return { start, end, daysLeft };
}

function statusOf(u) {
  const sub = u.subscription_status;
  if (sub === 'active' || sub === 'lifetime' || sub === 'three_months') {
    return { key: 'premium', label: 'Premium', tone: 'green' };
  }
  const t = trialInfo(u);
  if (!t) return { key: 'none', label: 'Nessun trial', tone: 'muted' };
  if (t.daysLeft > 0) return { key: 'trial', label: 'In trial', tone: 'amber' };
  return { key: 'expired', label: 'Trial scaduto', tone: 'red' };
}

const TONE_CLASSES = {
  terracotta: 'bg-terracotta/10 text-terracotta border-terracotta/30',
  green: 'bg-green-100 text-green-700 border-green-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  muted: 'bg-muted text-muted-foreground border-border',
};

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className={cn('w-4 h-4', tone === 'terracotta' && 'text-terracotta')} />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-heading font-semibold">{value}</p>
    </div>
  );
}

export default function UserMonitor() {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const u = await base44.entities.User.list('-created_date', 200);
      setUsers(u);
    } catch (e) {
      toast({ title: 'Errore caricamento utenti', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const rows = useMemo(() => users.map((u) => {
    const status = statusOf(u);
    const t = trialInfo(u);
    return { u, status, trial: t };
  }), [users]);

  const stats = useMemo(() => {
    const inTrial = rows.filter((r) => r.status.key === 'trial');
    const expired = rows.filter((r) => r.status.key === 'expired');
    const premium = rows.filter((r) => r.status.key === 'premium');
    const nextExp = [...inTrial].sort((a, b) => a.trial.daysLeft - b.trial.daysLeft)[0];
    return { total: rows.length, inTrial, expired, premium, nextExp };
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? 'Caricamento…' : `${stats.total} utenti totali`}
        </p>
        <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Totali" value={stats.total} />
        <StatCard icon={Clock} label="In trial" value={stats.inTrial.length} tone="amber" />
        <StatCard icon={AlertCircle} label="Trial scaduti" value={stats.expired.length} tone="red" />
        <StatCard icon={CheckCircle2} label="Premium" value={stats.premium.length} tone="green" />
      </div>

      {stats.nextExp && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Prossima scadenza trial: <span className="font-medium">{stats.nextExp.u.email}</span> —
          {stats.nextExp.trial.daysLeft <= 0 ? ' scaduto' : ` ${stats.nextExp.trial.daysLeft} giorni rimanenti`}
          {' '}
          ({new Date(stats.nextExp.trial.end).toLocaleDateString('it-IT')})
        </div>
      )}

      {/* User table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Utente</th>
                    <th className="text-left font-medium px-4 py-2.5">Stato</th>
                    <th className="text-left font-medium px-4 py-2.5">Inizio trial</th>
                    <th className="text-left font-medium px-4 py-2.5">Scadenza</th>
                    <th className="text-left font-medium px-4 py-2.5">Giorni rimasti</th>
                    <th className="text-left font-medium px-4 py-2.5">Iscrizione</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Caricamento…</td></tr>
                  ) : rows.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">Nessun utente.</td></tr>
                  ) : rows.map(({ u, status, trial }) => (
                    <tr key={u.id} className="hover:bg-accent/40">
                      <td className="px-4 py-2.5">
                        <p className="font-medium truncate">{u.full_name || u.email}</p>
                        {u.full_name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', TONE_CLASSES[status.tone])}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {trial ? new Date(trial.start).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {trial ? new Date(trial.end).toLocaleDateString('it-IT') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {trial ? (
                          <span className={cn('font-medium', trial.daysLeft <= 0 ? 'text-red-600' : trial.daysLeft <= 3 ? 'text-amber-600' : 'text-foreground')}>
                            {trial.daysLeft <= 0 ? 'Scaduto' : trial.daysLeft}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {u.created_date ? new Date(u.created_date).toLocaleDateString('it-IT') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}