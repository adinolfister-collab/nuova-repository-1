import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { normalizeLang } from '../../shared/ibdNews.ts';

// Public endpoint: the NewsArticle cache is informational content with no
// user data, so it is served to every visitor (including unauthenticated ones
// on the public Home page) without an auth check.
// - No `id`: returns the latest cached articles for the requested language.
// - With `id`: returns the single cached article (any language) so deep links
//   to /news/:id work for every visitor.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const id = body && typeof body.id === 'string' ? body.id.trim() : undefined;

    if (id) {
      if (id.length > 64 || !/^[A-Za-z0-9_-]+$/.test(id)) return Response.json({ error: 'id non valido' }, { status: 400 });
      const article = await base44.entities.NewsArticle.get(id);
      return Response.json({ article: article || null });
    }

    const lang = normalizeLang(body && body.lang);
    const articles = await base44.entities.NewsArticle.filter({ lang }, '-date', 6);
    return Response.json({ articles: articles || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}