import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { langOf, DICT } from '../../shared/backendI18n.ts';

// Genera un report di sintesi dall'archivio referti (MedicalRecord) dell'utente
// in un range di date. Restituisce un report Markdown + dati strutturati.
// L'agente lo usa come tool per rispondere a richieste di report.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const lang = langOf(user);
    const M = DICT.medical[lang];

    const body = await req.json().catch(() => ({}));
    const today = new Date();
    const to = body.to || today.toISOString().slice(0, 10);
    const from = body.from || new Date(new Date(today).setDate(today.getDate() - 90)).toISOString().slice(0, 10);
    const focus = body.focus || 'all'; // all | esami | marker | andamento

    const records = await base44.entities.MedicalRecord.list('-record_date', 500);
    const inRange = records.filter((r) => r.record_date && r.record_date >= from && r.record_date <= to);

    const TYPE_LABEL = M.typeLabel;

    // Conteggi per sezione
    const counts = {};
    inRange.forEach((r) => { counts[r.type] = (counts[r.type] || 0) + 1; });

    // Marker fuori range (ultimo valore per marker)
    const latestByMarker = {};
    inRange.forEach((r) => {
      (r.markers || []).forEach((m) => {
        if (!m || !m.name) return;
        const prev = latestByMarker[m.name];
        if (!prev || (r.record_date || '') >= (prev.date || '')) {
          latestByMarker[m.name] = { date: r.record_date, value: m.value, unit: m.unit, ref_low: m.ref_low, ref_high: m.ref_high, flag: m.flag };
        }
      });
    });
    const outOfRange = Object.entries(latestByMarker)
      .map(([name, v]) => ({ name, ...v }))
      .filter((m) => m.flag === 'high' || m.flag === 'low')
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    // Trend dei marker infiammatori principali (PCR, VES, calprotectina)
    const INFL = new Set(['pcr', 'ves', 'calprotectina', 'protcina c reattiva', 'proteina c reattiva']);
    const trend = {};
    inRange.slice().sort((a, b) => (a.record_date || '').localeCompare(b.record_date || '')).forEach((r) => {
      (r.markers || []).forEach((m) => {
        if (!m || !m.name) return;
        const key = m.name.toLowerCase();
        const norm = key.includes('calprotect') ? 'calprotectina' : (INFL.has(key) || key.includes('pcr') || key.includes('ves') ? key : null);
        if (!norm) return;
        if (!trend[norm]) trend[norm] = [];
        trend[norm].push({ date: r.record_date, value: m.value, unit: m.unit, flag: m.flag });
      });
    });

    // Prossimi appuntamenti
    const todayStr = today.toISOString().slice(0, 10);
    const nextAppts = records
      .filter((r) => r.next_appointment && r.next_appointment >= todayStr)
      .sort((a, b) => (a.next_appointment || '').localeCompare(b.next_appointment || ''));

    // ---- Report Markdown ----
    const lines = [];
    lines.push(`# ${M.reportTitle} · ${from} → ${to}`);
    lines.push('');
    lines.push(`**${M.docsInPeriod}:** ${inRange.length}`);
    const countParts = Object.entries(counts).map(([k, v]) => `${TYPE_LABEL[k] || k}: ${v}`);
    if (countParts.length) lines.push(`**${M.bySection}:** ${countParts.join(' · ')}`);
    lines.push('');

    if (outOfRange.length) {
      lines.push(`## ${M.outOfRangeTitle}`);
      outOfRange.forEach((m) => {
        const arrow = m.flag === 'high' ? M.arrowHigh : M.arrowLow;
        const ref = [m.ref_low, m.ref_high].filter(Boolean).join('–');
        lines.push(`- **${m.name}** ${m.value}${m.unit ? ' ' + m.unit : ''} ${arrow}${ref ? ' (${M.range} ' + ref + ')' : ''} · ${m.date}`);
      });
      lines.push('');
    }

    const trendKeys = Object.keys(trend);
    if (trendKeys.length && (focus === 'all' || focus === 'andamento' || focus === 'marker')) {
      lines.push(`## ${M.trendTitle}`);
      trendKeys.forEach((k) => {
        const series = trend[k];
        if (!series.length) return;
        const first = series[0];
        const last = series[series.length - 1];
        const dir = last.value === first.value ? M.stable : '';
        lines.push(`- **${k}**: ${first.value}${first.unit ? ' ' + first.unit : ''} (${first.date}) → ${last.value}${last.unit ? ' ' + last.unit : ''} (${last.date}) ${dir}`);
      });
      lines.push('');
    }

    if (nextAppts.length && (focus === 'all' || focus === 'andamento')) {
      lines.push(`## ${M.nextApptsTitle}`);
      nextAppts.slice(0, 6).forEach((a) => {
        lines.push(`- ${a.next_appointment} · ${a.title}${a.provider ? ' — ' + a.provider : ''}`);
      });
      lines.push('');
    }

    if (focus === 'esami' || focus === 'all') {
      const byDate = inRange.slice().sort((a, b) => (b.record_date || '').localeCompare(a.record_date || ''));
      if (byDate.length) {
        lines.push(`## ${M.docsChronoTitle}`);
        byDate.forEach((r) => {
          lines.push(`### ${r.record_date} — ${r.title}`);
          const meta = [TYPE_LABEL[r.type] || r.type, r.provider, r.location].filter(Boolean).join(' · ');
          if (meta) lines.push(`_${meta}_`);
          if (r.result_summary) lines.push(r.result_summary);
          if (r.findings) lines.push(r.findings);
          const mk = (r.markers || []).filter((m) => m && m.name);
          if (mk.length) {
            lines.push(`${M.marker}: ` + mk.map((m) => `${m.name} ${m.value}${m.unit ? ' ' + m.unit : ''}${m.flag === 'high' ? ' ↑' : m.flag === 'low' ? ' ↓' : ''}`).join(', '));
          }
          lines.push('');
        });
      }
    }

    lines.push('---');
    lines.push(`_${M.footer}_`);

    return Response.json({
      period: { from, to },
      count: inRange.length,
      counts,
      out_of_range: outOfRange,
      trends: trend,
      next_appointments: nextAppts.slice(0, 6).map((a) => ({ date: a.next_appointment, title: a.title, provider: a.provider })),
      report: lines.join('\n')
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}