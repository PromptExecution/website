// POST /api/vote - Record a vote for variant A or B
import { isValidDay } from '../lib/comic-response.ts';
import { requireBindings } from '../lib/runtime-config.ts';

interface VoteRequest {
  day: string;
  variant: 'a' | 'b';
}

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const bindingError = requireBindings(env, ['DB']);

  if (bindingError) {
    return bindingError;
  }

  try {
    const body: VoteRequest = await request.json();

    if (!isValidDay(body.day) || !body.variant || !['a', 'b'].includes(body.variant)) {
      return Response.json({
        error: 'Invalid request. Provide day and variant (a or b)'
      }, { status: 400 });
    }

    const comic = await env.DB.prepare(
      'SELECT day FROM comics WHERE day = ?'
    ).bind(body.day).first();

    if (!comic) {
      return Response.json({
        error: 'Cannot vote for a comic that does not exist',
        day: body.day
      }, { status: 404 });
    }

    // Generate voter hash from IP + User-Agent (simple deduplication)
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const ua = request.headers.get('User-Agent') || '';
    const voterHash = await hashString(`${ip}:${ua}:${body.day}`);

    await env.DB.prepare(
      `INSERT INTO votes (day, variant, voter_hash, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(day, voter_hash) DO UPDATE SET
         variant = excluded.variant,
         created_at = excluded.created_at`
    ).bind(
      body.day,
      body.variant,
      voterHash,
      Math.floor(Date.now() / 1000)
    ).run();

    // Get updated vote counts
    const votes = await env.DB.prepare(
      'SELECT variant, COUNT(*) as count FROM votes WHERE day = ? GROUP BY variant'
    ).bind(body.day).all();

    const votesA = votes.results.find((v: any) => v.variant === 'a')?.count || 0;
    const votesB = votes.results.find((v: any) => v.variant === 'b')?.count || 0;

    return Response.json({
      success: true,
      votes: { a: votesA, b: votesB }
    });

  } catch (err: any) {
    console.error('Error recording vote:', err);
    return Response.json({
      error: err.message || 'Failed to record vote'
    }, { status: 500 });
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
