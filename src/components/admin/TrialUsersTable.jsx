import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Search,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Mail,
  Crown,
  Clock,
  Activity,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_FILTERS = [
  { value: 'all', label: 'Tutti' },
  { value: 'trialing', label: 'In trial' },
  { value: 'expired', label: 'Scaduti' },
  { value: 'active', label: 'Abbonati' },
];

const STATUS_LABEL = {
  lifetime: 'Lifetime',
  active: 'Abbonato',
  trialing: 'In trial',
  past_due: 'Pagamento dovuto',
  canceled: 'Cancellato',
  expired: 'Trial scaduto',
  none: 'Mai attivato',
};

const STATUS_BADGE = {
  lifetime: 'bg-amber-100 text-amber-800 border-amber-200',
  three_months: 'bg-amber-100 text-amber-800 border-amber-200',
  active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  trialing: 'bg-sky-100 text-sky-800 border-sky-200',
  past_due: 'bg-rose-100 text-rose-800 border-rose-200',
  canceled: 'bg-muted text-muted-foreground border-border',
  expired: 'bg-rose-100 text-rose-800 border-rose-200',
  none: 'bg-muted text-muted-foreground border-border',
};

function expiryBadge(days) {
  if (days === null || days === undefined) return null;
  if (days <= 0) {
    return <span className="text-xs font-semibold text-rose-700">scaduto</span>;
  }
  const cls = days > 7
    ? 'bg-emerald-100 text-emerald-800'
    : 'bg-amber-100 text-amber-800';
  return (
    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cls)}>
      {days} gg
    </span>
  );
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function TrialUsersTable() {
  const { user: currentUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState('created_date');
  const [sortDir, setSortDir] = useState('desc');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.functions
      .invoke('getTrialUsers', {})
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message || e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const rows = useMemo(() => {
    if (!data?.users) return [];
    let list = data.users;
    // Esclude l'admin corrente dai conteggi attivi (utente reale di riferimento)
    // ma lo mostra comunque in lista con i suoi dati.
    if (currentUser?.id) {
      // nessuna esclusione: l'admin vuole vedere anche sé stesso
    }
    // Filtro per stato
    if (filter !== 'all') {
      if (filter === 'active') {
        list = list.filter((u) => ['active', 'past_due'].includes(u.status));
      } else {
        list = list.filter((u) => u.status === filter);
      }
    }
    // Ricerca testuale
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((u) =>
        (u.email || '').toLowerCase().includes(q) ||
        (u.full_name || '').toLowerCase().includes(q),
      );
    }
    // Ordinamento
    const sorted = [...list].sort((a, b) => {
      let av, bv;
      if (sortKey === 'days') {
        av = a.daysToExpiry === null ? Infinity : a.daysToExpiry;
        bv = b.daysToExpiry === null ? Infinity : b.daysToExpiry;
      } else if (sortKey === 'lastActivity') {
        av = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        bv = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      } else if (sortKey === 'diary') {
        av = a.diaryTotal;
        bv = b.diaryTotal;
      } else {
        av = a.created_date ? new Date(a.created_date).getTime() : 0;
        bv = b.created_date ? new Date(b.created_date).getTime() : 0;
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return sorted;
  }, [data, filter, query, sortKey, sortDir, currentUser]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const SortHeader = ({ label, skey, className = '' }) => (
    <button
      onClick={() => toggleSort(skey)}
      className={cn('inline-flex items-center gap-1 hover:text-foreground transition-colors', className)}
    >
      {label}
      {sortKey === skey && (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
    </button>
  );

  const counts = useMemo(() => {
    if (!data?.users) return { all: 0, trialing: 0, expired: 0, active: 0 };
    const u = data.users;
    return {
      all: u.length,
      trialing: u.filter((x) => x.status === 'trialing').length,
      expired: u.filter((x) => x.status === 'expired').length,
      active: u.filter((x) => ['active', 'past_due'].includes(x.status)).length,
    };
  }, [data]);

  return (
    <Card>
      <CardContent className="pt-5">
        <h2 className="font-heading text-lg font-semibold mb-1 flex items-center gap-2">
          <Users className="w-4 h-4 text-terracotta" />
          Utenti & Trial
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Tutti gli utenti registrati con stato, giorni reali alla scadenza e adozione feature.
        </p>

        {/* Filtri stato + conteggi */}
        <div className="flex flex-wrap gap-2 mb-3">
          {STATUS_FILTERS.map((f) => {
            const count = counts[f.value] ?? 0;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm border transition-colors inline-flex items-center gap-1.5',
                  filter === f.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-accent',
                )}
              >
                {f.label}
                <span className={cn(
                  'text-xs px-1.5 rounded-full',
                  filter === f.value ? 'bg-primary-foreground/20' : 'bg-muted',
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Ricerca */}
        <div className="relative mb-4 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per email o nome…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-input bg-card text-sm outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">Caricamento utenti…</div>
        ) : error ? (
          <div className="h-40 flex items-center justify-center text-sm text-rose-600">Errore: {error}</div>
        ) : rows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Nessun utente per questo filtro.</div>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="py-2 pr-3 font-medium">Utente</th>
                  <th className="py-2 px-3 font-medium">Stato</th>
                  <th className="py-2 px-3 font-medium"><SortHeader label="Scadenza" skey="days" /></th>
                  <th className="py-2 px-3 font-medium text-center">AI</th>
                  <th className="py-2 px-3 font-medium text-center"><SortHeader label="Diario" skey="diary" /></th>
                  <th className="py-2 px-3 font-medium"><SortHeader label="Ultima attività" skey="lastActivity" /></th>
                  <th className="py-2 pl-3 font-medium"><SortHeader label="Registrato" skey="created_date" /></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const isOpen = expanded === u.id;
                  return (
                    <React.Fragment key={u.id}>
                      <tr
                        className="border-b border-border last:border-0 cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setExpanded(isOpen ? null : u.id)}
                      >
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            {isOpen
                              ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                              : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                            <div className="min-w-0">
                              <p className="font-medium truncate max-w-[200px]">{u.full_name || '—'}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{u.email || '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={cn(
                            'text-xs font-medium px-2 py-0.5 rounded-full border whitespace-nowrap',
                            STATUS_BADGE[u.status] || STATUS_BADGE.none,
                          )}>
                            {STATUS_LABEL[u.status] || u.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{expiryBadge(u.daysToExpiry)}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums">{u.ai_messages_count || 0}</td>
                        <td className="py-2.5 px-3 text-center tabular-nums font-medium">{u.diaryTotal}</td>
                        <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.lastActivity)}</td>
                        <td className="py-2.5 pl-3 text-muted-foreground whitespace-nowrap">{fmtDate(u.created_date)}</td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-accent/30">
                          <td colSpan={7} className="py-4 px-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <DetailItem icon={Mail} label="Email" value={u.email || '—'} />
                              <DetailItem icon={Clock} label="Scadenza trial" value={fmtDateTime(u.expiryDate)} />
                              <DetailItem icon={Activity} label="Ultima attività" value={fmtDateTime(u.lastActivity)} />
                            </div>
                            <div className="mt-4 pt-3 border-t border-border">
                              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Inserimenti diario</p>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <CountChip label="Sintomi" value={u.symptoms} />
                                <CountChip label="Pasti" value={u.foods} />
                                <CountChip label="Dosi farmaci" value={u.meds} />
                                <CountChip label="Referti" value={u.records} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5" />{label}
      </p>
      <p className="font-medium break-words">{value}</p>
    </div>
  );
}

function CountChip({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-heading font-semibold tabular-nums">{value}</p>
    </div>
  );
}