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
    // Import generation logic
    const { generateComicScript } = await import('../lib/comic-generator');
    const { renderComicToSVG } = await import('../lib/svg-renderer');

    const today = new Date().toISOString().split('T')[0];
    const keyA = `comics/${today}/a.svg`;
    const keyB = `comics/${today}/b.svg`;

    // Check if today's comic objects already exist
    const [existingA, existingB] = await Promise.all([
      env.COMICS_BUCKET.head(keyA),
      env.COMICS_BUCKET.head(keyB),
    ]);
    if (existingA || existingB) {
      return Response.json({
        error: 'Comic object already exists for today',
        day: today,
        hint: 'Delete existing R2 object(s) for this day or change the date'
      }, { status: 409 });
    }

    // Models to test
    const MODEL_A = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    const MODEL_B = '@cf/mistral/mistral-7b-instruct-v0.2-lora';

    console.log('Generating comics for', today);

    // Generate both variants
    const [scriptA, scriptB] = await Promise.all([
      generateComicScript(env.AI, MODEL_A, today),
      generateComicScript(env.AI, MODEL_B, today)
    ]);

    console.log('Scripts generated, rendering SVGs...');

    // Render to SVG
    const svgA = renderComicToSVG(scriptA);
    const svgB = renderComicToSVG(scriptB);

    console.log('SVGs rendered, uploading to R2...');

    // Upload to R2
    await Promise.all([
      env.COMICS_BUCKET.put(keyA, svgA, {
        httpMetadata: { contentType: 'image/svg+xml' }
      }),
      env.COMICS_BUCKET.put(keyB, svgB, {
        httpMetadata: { contentType: 'image/svg+xml' }
      })
    ]);

    console.log('Uploaded to R2, saving metadata to D1...');

    // Save to D1
    await env.DB.prepare(
      'INSERT OR REPLACE INTO comics (day, prompt, model_a, model_b, r2_key_a, r2_key_b, script_a, script_b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      today,
      scriptA.title,
      MODEL_A,
      MODEL_B,
      keyA,
      keyB,
      JSON.stringify(scriptA),
      JSON.stringify(scriptB),
      Math.floor(Date.now() / 1000)
    ).run();

    console.log('Saved to D1 successfully!');

    return Response.json({
      success: true,
      day: today,
      title: scriptA.title,
      models: {
        a: MODEL_A,
        b: MODEL_B
      },
      r2_keys: {
        a: keyA,
        b: keyB
      },
      svg_lengths: {
        a: svgA.length,
        b: svgB.length
      },
      scripts: {
        a: scriptA,
        b: scriptB
      },
      message: 'Comic generated successfully! Visit /api/today to see it.'
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
    message: 'Test comic generation endpoint',
    method: 'POST',
    auth: 'Authorization: Bearer <TEST_SECRET>',
    example: 'curl -X POST -H "Authorization: Bearer <TEST_SECRET>" https://your-site.com/api/test-generate'
  });
}
