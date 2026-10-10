import React, { useEffect, useMemo, useState } from 'react';
import { Hourglass } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { DEMO_ENABLED_PATHS, DEMO_TRIAL_DAYS } from '@/lib/demoTrial';

const DAY_MS = 86400000;
const fmt = (ms) => new Date(ms).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });

export default function DemoGuestReport() {
  const [views, setViews] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    base44.entities.PageView.list('-entered_at', 5000)
      .then(setViews)
      .catch(() => setViews([]));
    base44.entities.ConversionEvent.filter({ is_guest: true, feature: 'diary_save', source: 'used' }, '-created_date', 5000)
      .then(setEvents)
      .catch(() => setEvents([]));
  }, []);

  const rows = useMemo(() => {
    const map = new Map();
    (views || []).forEach((v) => {
      if (v.user_id || !v.visitor_id || !DEMO_ENABLED_PATHS.has(v.path)) return;
      const ts = Date.parse(v.entered_at || v.created_date);
      if (!ts) return;
      const r = map.get(v.visitor_id) || { id: v.visitor_id, first: ts, days: new Set() };
      r.first = Math.min(r.first, ts);
      r.days.add(new Date(ts).toISOString().slice(0, 10));
      map.set(v.visitor_id, r);
    });
    const saves = {};
    events.forEach((e) => { if (e.visitor_id) saves[e.visitor_id] = (saves[e.visitor_id] || 0) + 1; });
    const now = Date.now();
    return [...map.values()]
      .map((r) => {
        const end = r.first + DEMO_TRIAL_DAYS * DAY_MS;
        return { ...r, saves: saves[r.id] || 0, end, left: Math.ceil((end - now) / DAY_MS) };
      })
      .sort((a, b) => b.first - a.first);
  }, [views, events]);

  const active = rows.filter((r) => r.left > 0).length;

  return (
    <Card className="mb-6">
      <CardContent className="pt-5">
        <h2 className="font-heading text-lg font-semibold mb-1 flex items-center gap-2">
          <Hourglass className="w-4 h-4 text-terracotta" />
          Ospiti demo — giorni di attivita' e scadenza 45 gg
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Stima dalle visite anonime registrate alle pagine demo (ultime 5000). Scadenza = prima visita + 45 giorni.
        </p>
        {views === null ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Caricamento...</div>
        ) : rows.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-sm text-muted-foreground">Nessun ospite demo rilevato.</div>
        ) : (
          <>
            <p className="text-sm mb-3"><strong>{rows.length}</strong> ospiti, <strong>{active}</strong> con demo ancora attiva, <strong>{rows.length - active}</strong> scaduti.</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                    <th className="py-2 pr-3">Visitatore</th>
                    <th className="py-2 pr-3">Giorni attivi</th>
                    <th className="py-2 pr-3">Salvataggi diario</th>
                    <th className="py-2 pr-3">Prima visita</th>
                    <th className="py-2 pr-3">Scadenza</th>
                    <th className="py-2">Stato</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-mono text-xs">{r.id.slice(0, 8)}</td>
                      <td className="py-2 pr-3">{r.days.size}</td>
                      <td className="py-2 pr-3">{r.saves}</td>
                      <td className="py-2 pr-3">{fmt(r.first)}</td>
                      <td className="py-2 pr-3">{fmt(r.end)}</td>
                      <td className="py-2">{r.left > 0 ? `${r.left} gg rimasti` : 'Scaduta'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}