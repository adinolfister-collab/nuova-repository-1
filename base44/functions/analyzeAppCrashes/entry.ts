import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Admin-only: riceve un elenco di crash (id, message, stack, path, severity)
// e restituisce per ciascuno una diagnosi AI (causa probabile, file da controllare,
// suggerimento di correzione) generata con InvokeLLM. Singola chiamata batch
// per contenere i crediti; schema JSON vincolato per output strutturato.

const MAX_CRASHES = 30;

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let p: any = {};
    try {
      p = await req.json();
    } catch (_) {
      /* no body */
    }
    const crashes: any[] = Array.isArray(p.crashes) ? p.crashes : [];
    if (crashes.length === 0) {
      return Response.json({ diagnoses: [] });
    }
    const trimmed = crashes.slice(0, MAX_CRASHES).map((c: any, i: number) => ({
      index: i,
      id: String(c.id || `crash_${i}`),
      path: String(c.path || ''),
      severity: String(c.severity || ''),
      message: String(c.message || '').slice(0, 500),
      stack: String(c.stack || '').slice(0, 1200),
    }));

    const prompt =
      'Sei un ingegnere frontend esperto di React + Vite + Tailwind. ' +
      'Analizza i seguenti crash di un\'app React e per ciascuno indica la probabile causa, ' +
      'il file sorgente da controllare (percorso ipotetico sotto src/ basato sul path della pagina ' +
      'e sullo stack) e un suggerimento concreto di correzione. ' +
      'Sii conciso e tecnico. Rispondi SOLO con il JSON richiesto.\n\n' +
      'Crash:\n' +
      JSON.stringify(trimmed, null, 2);

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          diagnoses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                cause: { type: 'string' },
                file: { type: 'string' },
                suggestion: { type: 'string' },
              },
              required: ['id', 'cause', 'file', 'suggestion'],
            },
          },
        },
        required: ['diagnoses'],
      },
    });

    const diagnoses = (result as any)?.diagnoses || [];
    return Response.json({ diagnoses });
  } catch (error) {
    return Response.json(
      { error: String((error && error.message) || error) },
      { status: 500 }
    );
  }
}