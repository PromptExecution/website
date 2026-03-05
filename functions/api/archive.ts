// GET /api/archive?page=1&limit=20 - Returns paginated archive of comics

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);

  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const countResult = await env.DB.prepare(
      'SELECT COUNT(*) as total FROM comics'
    ).first();

    const total = countResult.total || 0;

    // Get paginated comics
    const comics = await env.DB.prepare(
      'SELECT day, prompt, model_a, model_b, r2_key_a, r2_key_b, created_at FROM comics ORDER BY day DESC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    // Get vote counts for each day
    const days = comics.results.map((c: any) => c.day);
    let voteResults: any[] = [];
    if (days.length > 0) {
      const votesQuery = await env.DB.prepare(
        `SELECT day, variant, COUNT(*) as count FROM votes WHERE day IN (${days.map(() => '?').join(',')}) GROUP BY day, variant`
      ).bind(...days).all();
      voteResults = votesQuery.results;
    }

    // Build response
    const items = comics.results.map((comic: any) => {
      const dayVotes = voteResults.filter((v: any) => v.day === comic.day);
      const votesA = dayVotes.find((v: any) => v.variant === 'a')?.count || 0;
      const votesB = dayVotes.find((v: any) => v.variant === 'b')?.count || 0;

      return {
        day: comic.day,
        title: comic.prompt,
        models: {
          a: comic.model_a,
          b: comic.model_b
        },
        votes: {
          a: votesA,
          b: votesB
        },
        created: new Date(comic.created_at * 1000).toISOString()
      };
    });

    return Response.json({
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      items
    });

  } catch (err: any) {
    console.error('Error fetching archive:', err);
    return Response.json({
      error: err.message || 'Failed to fetch archive'
    }, { status: 500 });
  }
}
