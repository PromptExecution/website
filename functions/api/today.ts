// GET /api/today - Returns today's comic variants + vote counts
import { runAgenticComicWorkflow } from '../lib/agentic-comic-workflow.ts';
import { buildComicImagePath, cacheHeaders, parseStoredJson } from '../lib/comic-response.ts';
import { ensureLocalBootstrapComic } from '../lib/local-bootstrap-comic.ts';

export async function onRequestGet(context: any) {
  const { env } = context;
  const today = new Date().toISOString().split('T')[0];

  try {
    // Try today's comic first.
    let comic = await env.DB.prepare(
      'SELECT * FROM comics WHERE day = ?'
    ).bind(today).first();

    if (!comic) {
      if (String(env.AUTO_GENERATE_ON_READ || '0') === '1') {
        try {
          if (env.AI) {
            await runAgenticComicWorkflow(env, {
              day: today,
              trigger: 'manual'
            });
          } else if (String(env.ALLOW_LOCAL_BOOTSTRAP || '0') === '1') {
            await ensureLocalBootstrapComic(env, today);
          }
        } catch (autoErr: any) {
          console.error('Auto-generate on read failed:', autoErr);
        }
      }

      comic = await env.DB.prepare(
        'SELECT * FROM comics WHERE day = ?'
      ).bind(today).first();
    }

    if (!comic) {
      // Fall back to most recent comic for homepage Comic tab.
      comic = await env.DB.prepare(
        'SELECT * FROM comics ORDER BY day DESC LIMIT 1'
      ).first();

      if (!comic) {
        return Response.json({
          error: 'No comics available yet',
          day: today
        }, { status: 404 });
      }
    }

    const comicDay = comic.day as string;

    // Get vote counts
    const votes = await env.DB.prepare(
      'SELECT variant, COUNT(*) as count FROM votes WHERE day = ? GROUP BY variant'
    ).bind(comicDay).all();

    const votesA = votes.results.find((v: any) => v.variant === 'a')?.count || 0;
    const votesB = votes.results.find((v: any) => v.variant === 'b')?.count || 0;

    const [imageAExists, imageBExists] = await Promise.all([
      env.COMICS_BUCKET.head(comic.r2_key_a),
      env.COMICS_BUCKET.head(comic.r2_key_b)
    ]);

    if (!imageAExists || !imageBExists) {
      return Response.json({
        error: 'Comic images not found',
        day: comicDay
      }, { status: 500 });
    }

    const headers = cacheHeaders('public, max-age=60, s-maxage=300');
    headers.set('Content-Type', 'application/json; charset=utf-8');

    return new Response(JSON.stringify({
      day: comicDay,
      title: comic.prompt,
      variants: {
        a: {
          model: comic.model_a,
          imageUrl: buildComicImagePath(comicDay, 'a'),
          votes: votesA,
          script: parseStoredJson(comic.script_a)
        },
        b: {
          model: comic.model_b,
          imageUrl: buildComicImagePath(comicDay, 'b'),
          votes: votesB,
          script: parseStoredJson(comic.script_b)
        }
      }
    }), {
      status: 200,
      headers
    });

  } catch (err: any) {
    console.error('Error fetching today\'s comic:', err);
    return Response.json({
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
