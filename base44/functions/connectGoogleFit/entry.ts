import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { exchangeCode } from '../../shared/googleFit.ts';

// Scambia il codice OAuth di Google con i token di accesso e salva la
// connessione GoogleFitConnection per l'utente corrente. Se esiste gia'
// una connessione la aggiorna.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const code = body.code;
    if (!code) return Response.json({ error: 'Codice mancante' }, { status: 400 });

    const tokens = await exchangeCode(code);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (tokens.expires_in || 3600) * 1000).toISOString();

    const existing = await base44.entities.GoogleFitConnection.list('-created_date', 10);
    if (existing.length > 0) {
      const conn = existing[0];
      await base44.entities.GoogleFitConnection.update(conn.id, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || conn.refresh_token,
        token_expires_at: expiresAt,
        connected_at: conn.connected_at || now.toISOString(),
      });
    } else {
      await base44.entities.GoogleFitConnection.create({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt,
        connected_at: now.toISOString(),
      });
    }
    return Response.json({ connected: true });
  } catch (error) {
    console.error('connectGoogleFit', error);
    return Response.json({ error: String((error && error.message) || error) }, { status: 500 });
  }
}