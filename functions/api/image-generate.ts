/**
 * Image Generation Endpoint
 * POST /api/image-generate
 *
 * Triggers A/B variant image generation from comic script
 * Pipeline: Script → SVG Description → Image Rendering
 */

import { isValidDay } from '../lib/comic-response.ts';
import { requireBindings } from '../lib/runtime-config.ts';
import {
  createImageProvider,
  createImageRenderer,
  getAvailableProviders,
} from '../lib/image-providers.ts';
import { generateVariantPrompts } from '../lib/svg-prompt-generator.ts';

export async function onRequestPost(context: any) {
  const { request, env } = context;
  const url = new URL(request.url);
  const day = url.searchParams.get('day');

  if (!isValidDay(day)) {
    return Response.json(
      { error: 'Invalid day. Use YYYY-MM-DD format.' },
      { status: 400 }
    );
  }

  const bindingError = requireBindings(env, ['DB', 'COMICS_BUCKET']);
  if (bindingError) {
    return bindingError;
  }

  try {
    // === Check if generation already exists ===
    const existing = await env.DB.prepare(
      'SELECT day FROM comics WHERE day = ?'
    )
      .bind(day)
      .first();

    if (existing) {
      return Response.json(
        {
          status: 'exists',
          message: 'Comic already generated for this day',
          day,
        },
        { status: 200 }
      );
    }

    // === Fetch the comic script ===
    const workflowData = await env.DB.prepare(
      'SELECT workflow_data FROM workflow_runs WHERE day = ? LIMIT 1'
    )
      .bind(day)
      .first();

    if (!workflowData || !workflowData.workflow_data) {
      return Response.json(
        { error: 'No comic script found. Generate script first via /api/test-generate.' },
        { status: 404 }
      );
    }

    let workflow;
    try {
      workflow = JSON.parse(workflowData.workflow_data);
    } catch (e) {
      return Response.json(
        { error: 'Invalid workflow data' },
        { status: 500 }
      );
    }

    // === Generate image prompts from script ===
    const script = workflow.result?.scripts?.[0] || workflow.scripts?.[0];
    if (!script) {
      return Response.json(
        { error: 'No script found in workflow data' },
        { status: 500 }
      );
    }

    const { promptA, promptB } = generateVariantPrompts(script);

    // === Create image providers ===
    const providerA = createImageProvider('a', env, env.AI);
    const providerB = createImageProvider('b', env, env.AI);
    const renderer = createImageRenderer(env, env.AI);

    if (!renderer) {
      return Response.json(
        {
          error: 'Image renderer not configured',
          available: getAvailableProviders(env),
        },
        { status: 503 }
      );
    }

    // === Generate images in parallel ===
    const results = await Promise.allSettled([
      renderer.generate({ prompt: promptA }),
      renderer.generate({ prompt: promptB }),
    ]);

    const images: any = {
      imageA: null,
      imageB: null,
      errors: [],
    };

    if (results[0].status === 'fulfilled') {
      images.imageA = results[0].value;
    } else {
      images.errors.push(`Variant A failed: ${results[0].reason}`);
    }

    if (results[1].status === 'fulfilled') {
      images.imageB = results[1].value;
    } else {
      images.errors.push(`Variant B failed: ${results[1].reason}`);
    }

    if (!images.imageA && !images.imageB) {
      return Response.json(
        {
          error: 'Both image generation attempts failed',
          details: images.errors,
        },
        { status: 500 }
      );
    }

    // === Store in R2 ===
    const r2Keys = {
      imageA: null as string | null,
      imageB: null as string | null,
    };

    if (images.imageA) {
      const keyA = `comics/${day}/variant-a.jpg`;
      await env.COMICS_BUCKET.put(keyA, images.imageA.imageBuffer, {
        httpMetadata: { contentType: 'image/jpeg' },
      });
      r2Keys.imageA = keyA;
    }

    if (images.imageB) {
      const keyB = `comics/${day}/variant-b.jpg`;
      await env.COMICS_BUCKET.put(keyB, images.imageB.imageBuffer, {
        httpMetadata: { contentType: 'image/jpeg' },
      });
      r2Keys.imageB = keyB;
    }

    // === Save to database ===
    await env.DB.prepare(
      `
      INSERT INTO comics (day, r2_key_a, r2_key_b, model_provider_a, model_provider_b)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        r2_key_a = COALESCE(?, r2_key_a),
        r2_key_b = COALESCE(?, r2_key_b),
        model_provider_a = ?,
        model_provider_b = ?
    `
    )
      .bind(
        day,
        r2Keys.imageA,
        r2Keys.imageB,
        env.IMAGE_PROVIDER_A || 'unknown',
        env.IMAGE_PROVIDER_B || 'unknown',
        r2Keys.imageA,
        r2Keys.imageB,
        env.IMAGE_PROVIDER_A || 'unknown',
        env.IMAGE_PROVIDER_B || 'unknown'
      )
      .run();

    return Response.json({
      status: 'success',
      day,
      variants: {
        a: r2Keys.imageA ? 'generated' : 'failed',
        b: r2Keys.imageB ? 'generated' : 'failed',
      },
      r2Keys,
      errors: images.errors,
      models: {
        renderer: renderer.constructor.name,
        promptsGenerated: true,
      },
    });
  } catch (err: any) {
    console.error('Image generation error:', err);
    return Response.json(
      {
        error: err.message || 'Image generation failed',
        details: err.stack,
      },
      { status: 500 }
    );
  }
}
