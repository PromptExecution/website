import { cacheHeaders, isValidDay, isValidVariant } from '../lib/comic-response.ts';
import { normalizeContentType } from '../lib/encoding.ts';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const day = url.searchParams.get('day');
  const variant = url.searchParams.get('variant');

  if (!isValidDay(day)) {
    return Response.json({
      error: 'Invalid day. Use YYYY-MM-DD format.'
    }, { status: 400 });
  }

  if (!isValidVariant(variant)) {
    return Response.json({
      error: 'Invalid variant. Use a or b.'
    }, { status: 400 });
  }

  try {
    const comic = await env.DB.prepare(
      'SELECT day, r2_key_a, r2_key_b FROM comics WHERE day = ?'
    ).bind(day).first();

    if (!comic) {
      return Response.json({
        error: 'No comic found for requested day',
        day
      }, { status: 404 });
    }

    const key = variant === 'a' ? comic.r2_key_a : comic.r2_key_b;
    const object = await env.COMICS_BUCKET.get(key);

    if (!object) {
      return Response.json({
        error: 'Comic image not found',
        day,
        variant
      }, { status: 404 });
    }

    const headers = cacheHeaders('public, max-age=86400, s-maxage=86400');
    headers.set('Content-Type', object.httpMetadata?.contentType || normalizeContentType(key));

    if (object.httpEtag) {
      headers.set('ETag', object.httpEtag);
    }

    if (object.uploaded instanceof Date) {
      headers.set('Last-Modified', object.uploaded.toUTCString());
    }

    return new Response(object.body, {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error('Error fetching comic image:', err);
    return Response.json({
      error: err.message || 'Failed to fetch comic image'
    }, { status: 500 });
  }
}
