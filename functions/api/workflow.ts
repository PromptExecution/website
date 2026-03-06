// GET /api/workflow?day=YYYY-MM-DD&include_artifacts=1
// Returns workflow metadata and, optionally, persisted artifact content.

export async function onRequestGet(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const day = url.searchParams.get('day');
  const includeArtifacts = url.searchParams.get('include_artifacts') === '1';

  try {
    const run = day
      ? await env.DB.prepare(
        'SELECT * FROM workflow_runs WHERE day = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(day).first()
      : await env.DB.prepare(
        'SELECT * FROM workflow_runs ORDER BY created_at DESC LIMIT 1'
      ).first();

    if (!run) {
      return Response.json({
        error: 'No workflow run found',
        day: day || null
      }, { status: 404 });
    }

    const response: any = {
      run_id: run.run_id,
      day: run.day,
      trigger: run.trigger,
      panel_count: run.panel_count,
      character_count: run.character_count,
      selected_topic: run.selected_topic,
      model_a: run.model_a,
      model_b: run.model_b,
      image_key_a: run.image_key_a,
      image_key_b: run.image_key_b,
      artifact_log_key: run.artifact_log_key,
      created_at: run.created_at
    };

    if (includeArtifacts) {
      const [logObj, castObj, topicsObj] = await Promise.all([
        env.COMICS_BUCKET.get(run.artifact_log_key),
        env.COMICS_BUCKET.get(run.artifact_log_key.replace('workflow-log.json', 'cast.json')),
        env.COMICS_BUCKET.get(run.artifact_log_key.replace('workflow-log.json', 'topics.json'))
      ]);

      response.artifacts = {
        workflow_log: logObj ? JSON.parse(await logObj.text()) : null,
        cast: castObj ? JSON.parse(await castObj.text()) : null,
        topics: topicsObj ? JSON.parse(await topicsObj.text()) : null
      };
    }

    return Response.json(response);
  } catch (err: any) {
    console.error('Error fetching workflow run:', err);
    return Response.json({
      error: err.message || 'Failed to fetch workflow run'
    }, { status: 500 });
  }
}
