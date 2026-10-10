import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { Jimp } from 'npm:jimp@1.6.0';

// Utility one-shot: prende un'immagine sorgente (URL), la ritaglia/ridimensiona
// esattamente a 1600x2560 px (rapporto 1.6:1, specifica KDP), la ricodifica in
// JPEG RGB qualita' 90 e la carica nello storage pubblico, restituendo il link
// scaricabile. Non e' una funzionalita' esposta nell'app: e' uno strumento di
// export per la copertina del libro (progetto esterno a Base44).

const TARGET_W = 1600;
const TARGET_H = 2560;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const imageUrl = body.image_url;
    if (!imageUrl || typeof imageUrl !== 'string') {
      return Response.json({ error: 'image_url obbligatorio' }, { status: 400 });
    }

    // Validazione anti-SSRF: solo https, host nell'allowlist, lunghezza limitata.
    const ALLOWED_HOSTS = new Set(['media.base44.com', 'static.wixstatic.com']);
    let parsedUrl;
    try { parsedUrl = new URL(imageUrl); } catch (e) {
      return Response.json({ error: 'image_url non valido' }, { status: 400 });
    }
    if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsedUrl.hostname) || imageUrl.length > 2048) {
      return Response.json({ error: 'image_url non valido' }, { status: 400 });
    }

    // 1. Scarica l'immagine sorgente
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return Response.json({ error: 'Impossibile scaricare l immagine sorgente' }, { status: 502 });
    }
    const sourceBytes = new Uint8Array(await imgRes.arrayBuffer());

    // 2. Decodifica, ritaglia/ridimensiona a 1600x2560 (cover = riempie e centra),
    //    ricodifica in JPEG RGB qualita' 90
    const image = await Jimp.read(Buffer.from(sourceBytes));
    image.cover({ w: TARGET_W, h: TARGET_H });
    const jpegBuf = await image.getBuffer('image/jpeg', { quality: 90 });

    // 3. Carica il JPEG nello storage pubblico e restituisci il link
    const file = new File([jpegBuf], 'copertina-ibd-kdp.jpg', { type: 'image/jpeg' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadPublicFile({ file });

    return Response.json({
      file_url,
      width: TARGET_W,
      height: TARGET_H,
      ratio: '1.6:1',
      format: 'image/jpeg',
      color_space: 'RGB',
      size_bytes: jpegBuf.byteLength,
      size_kb: Math.round(jpegBuf.byteLength / 1024)
    });
  } catch (error) {
    console.error('exportBookCover error:', error?.message || error);
    return Response.json({ error: error?.message || 'Errore interno' }, { status: 500 });
  }
}