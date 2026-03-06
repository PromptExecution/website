// GET /api/day?day=YYYY-MM-DD - Returns a specific day's comic variants + vote counts
import { buildComicImagePath, cacheHeaders, isValidDay, parseStoredJson } from '../lib/comic-response.ts';

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const day = url.searchParams.get('day');

  if (!isValidDay(day)) {
    return Response.json({
      error: 'Invalid day. Use YYYY-MM-DD format.'
    }, { status: 400 });
  }

  try {
    const comic = await env.DB.prepare(
      'SELECT * FROM comics WHERE day = ?'
    ).bind(day).first();

    if (!comic) {
      return Response.json({
        error: 'No comic found for requested day',
        day
      }, { status: 404 });
    }

    const votes = await env.DB.prepare(
      'SELECT variant, COUNT(*) as count FROM votes WHERE day = ? GROUP BY variant'
    ).bind(day).all();

    const votesA = votes.results.find((v: any) => v.variant === 'a')?.count || 0;
    const votesB = votes.results.find((v: any) => v.variant === 'b')?.count || 0;

    const [imageAExists, imageBExists] = await Promise.all([
      env.COMICS_BUCKET.head(comic.r2_key_a),
      env.COMICS_BUCKET.head(comic.r2_key_b)
    ]);

    if (!imageAExists || !imageBExists) {
      return Response.json({
        error: 'Comic images not found',
        day
      }, { status: 500 });
    }

    const headers = cacheHeaders('public, max-age=300, s-maxage=3600');
    headers.set('Content-Type', 'application/json; charset=utf-8');

    return new Response(JSON.stringify({
      day,
      title: comic.prompt,
      variants: {
        a: {
          model: comic.model_a,
          imageUrl: buildComicImagePath(day, 'a'),
          votes: votesA,
          script: parseStoredJson(comic.script_a)
        },
        b: {
          model: comic.model_b,
          imageUrl: buildComicImagePath(day, 'b'),
          votes: votesB,
          script: parseStoredJson(comic.script_b)
        }
      }
    }), {
      status: 200,
      headers
    });
  } catch (err: any) {
    console.error('Error fetching day comic:', err);
    return Response.json({
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
