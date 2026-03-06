// Manual comic generation trigger for testing
// POST /api/test-generate with Authorization header

export async function onRequestPost(context: any) {
  const { env, request } = context;

  if (!env.TEST_SECRET) {
    return Response.json({
      error: 'TEST_SECRET is not configured for this environment'
    }, { status: 503 });
  }

  // Basic auth to prevent abuse
  const authHeader = request.headers.get('Authorization');
  const expectedAuth = `Bearer ${env.TEST_SECRET}`;

  if (authHeader !== expectedAuth) {
    return Response.json({
      error: 'Unauthorized',
      hint: 'Set Authorization header: Bearer <TEST_SECRET>'
    }, { status: 401 });
  }

  try {
    const { runAgenticComicWorkflow, previewAgenticPromptPlan } = await import('../lib/agentic-comic-workflow.ts');
    const reqUrl = new URL(request.url);
    const body = (await tryParseJson(request)) || {};

    const day = String(body.day || reqUrl.searchParams.get('day') || new Date().toISOString().split('T')[0]);
    const force = String(body.force || reqUrl.searchParams.get('force') || '0') === '1';
    const dryRun = String(body.dry_run || reqUrl.searchParams.get('dry_run') || '0') === '1';
    const forceTopic = String(body.topic || reqUrl.searchParams.get('topic') || '').trim() || undefined;
    const keyA = `comics/${day}/a.png`;
    const keyB = `comics/${day}/b.png`;
    const legacyKeyA = `comics/${day}/a.svg`;
    const legacyKeyB = `comics/${day}/b.svg`;

    // Check if today's comic objects already exist (unless force=1)
    const [existingA, existingB, existingLegacyA, existingLegacyB] = await Promise.all([
      env.COMICS_BUCKET.head(keyA),
      env.COMICS_BUCKET.head(keyB),
      env.COMICS_BUCKET.head(legacyKeyA),
      env.COMICS_BUCKET.head(legacyKeyB),
    ]);
    if (!force && (existingA || existingB || existingLegacyA || existingLegacyB)) {
      return Response.json({
        error: 'Comic object already exists for today',
        day,
        hint: 'Use force=1 to overwrite metadata with a new run for the same day'
      }, { status: 409 });
    }

    if (dryRun) {
      const plan = await previewAgenticPromptPlan(env, {
        day,
        force_topic: forceTopic,
        trigger: 'manual'
      });
      return Response.json({
        success: true,
        dry_run: true,
        day,
        message: 'Generated agentic prompt plan without image generation.',
        plan
      });
    }

    const result = await runAgenticComicWorkflow(env, {
      day,
      force_topic: forceTopic,
      trigger: 'manual'
    });

    return Response.json({
      success: true,
      day,
      title: result.title,
      run_id: result.run_id,
      panel_count: result.panel_count,
      character_count: result.character_count,
      topic_candidates: result.topic_candidates,
      selected_topic: result.selected_topic,
      cast: result.cast,
      models: {
        a: result.model_a,
        b: result.model_b
      },
      r2_keys: {
        a: result.image_key_a,
        b: result.image_key_b
      },
      artifact_keys: result.artifact_keys,
      workflow_log: result.workflow_log,
      message: 'Graphic comic generated successfully via agentic workflow. Visit /api/today to see it.'
    });

  } catch (err: any) {
    console.error('Test generation failed:', err);
    return Response.json({
      error: err.message || 'Generation failed',
      stack: err.stack,
      hint: 'Check logs with: wrangler pages deployment tail'
    }, { status: 500 });
  }
}

// Also support GET for easier testing
export async function onRequestGet(context: any) {
  return Response.json({
    message: 'Agentic graphic comic generation endpoint',
    method: 'POST',
    auth: 'Authorization: Bearer <TEST_SECRET>',
    examples: [
      'curl -X POST -H "Authorization: Bearer <TEST_SECRET>" https://your-site.com/api/test-generate',
      'curl -X POST -H "Authorization: Bearer <TEST_SECRET>" -H "Content-Type: application/json" -d \'{"topic":"cache invalidation incident","force":"1"}\' https://your-site.com/api/test-generate',
      'curl -X POST -H "Authorization: Bearer <TEST_SECRET>" -H "Content-Type: application/json" -d \'{"dry_run":"1"}\' https://your-site.com/api/test-generate'
    ]
  });
}

async function tryParseJson(request: Request) {
  try {
    if (request.headers.get('Content-Type')?.includes('application/json')) {
      return await request.json();
    }
    return null;
  } catch {
    return null;
  }
}
