// GET /api/today - Returns today's comic variants + vote counts
import { arrayBufferToBase64, normalizeContentType } from '../lib/encoding';

export async function onRequestGet(context: any) {
  const { env } = context;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if today's comic exists
    const comic = await env.DB.prepare(
      'SELECT * FROM comics WHERE day = ?'
    ).bind(today).first();

    if (!comic) {
      return Response.json({
        error: 'No comic for today yet',
        day: today
      }, { status: 404 });
    }

    // Get vote counts
    const votes = await env.DB.prepare(
      'SELECT variant, COUNT(*) as count FROM votes WHERE day = ? GROUP BY variant'
    ).bind(today).all();

    const votesA = votes.results.find((v: any) => v.variant === 'a')?.count || 0;
    const votesB = votes.results.find((v: any) => v.variant === 'b')?.count || 0;

    const urlA = await env.COMICS_BUCKET.get(comic.r2_key_a);
    const urlB = await env.COMICS_BUCKET.get(comic.r2_key_b);

    if (!urlA || !urlB) {
      return Response.json({
        error: 'Comic images not found',
        day: today
      }, { status: 500 });
    }

    const imageA = await urlA.arrayBuffer();
    const imageB = await urlB.arrayBuffer();
    const typeA = urlA.httpMetadata?.contentType || normalizeContentType(comic.r2_key_a);
    const typeB = urlB.httpMetadata?.contentType || normalizeContentType(comic.r2_key_b);

    return Response.json({
      day: today,
      title: comic.prompt,
      variants: {
        a: {
          model: comic.model_a,
          imageUrl: `data:${typeA};base64,${arrayBufferToBase64(imageA)}`,
          votes: votesA,
          script: comic.script_a
        },
        b: {
          model: comic.model_b,
          imageUrl: `data:${typeB};base64,${arrayBufferToBase64(imageB)}`,
          votes: votesB,
          script: comic.script_b
        }
      }
    });

  } catch (err: any) {
    console.error('Error fetching today\'s comic:', err);
    return Response.json({
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
