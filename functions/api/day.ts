// GET /api/day?day=YYYY-MM-DD - Returns a specific day's comic variants + vote counts

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const day = url.searchParams.get('day');

  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) {
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

    const fileA = await env.COMICS_BUCKET.get(comic.r2_key_a);
    const fileB = await env.COMICS_BUCKET.get(comic.r2_key_b);

    if (!fileA || !fileB) {
      return Response.json({
        error: 'Comic images not found',
        day
      }, { status: 500 });
    }

    const imageA = await fileA.arrayBuffer();
    const imageB = await fileB.arrayBuffer();

    return Response.json({
      day,
      title: comic.prompt,
      variants: {
        a: {
          model: comic.model_a,
          imageUrl: `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new Uint8Array(imageA)))}`,
          votes: votesA,
          script: comic.script_a
        },
        b: {
          model: comic.model_b,
          imageUrl: `data:image/svg+xml;base64,${btoa(String.fromCharCode(...new Uint8Array(imageB)))}`,
          votes: votesB,
          script: comic.script_b
        }
      }
    });
  } catch (err: any) {
    console.error('Error fetching day comic:', err);
    return Response.json({
      error: err.message || 'Internal server error'
    }, { status: 500 });
  }
}
