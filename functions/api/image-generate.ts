/**
 * Image Generation Endpoint
 * POST /api/image-generate
 *
 * Triggers A/B variant image generation from comic script
 * Pipeline: Script → SVG Description → Image Rendering
 *
 * Integrates ledgrrr workflows for:
 * - Image rendering governance and audit tracking
 * - Forecasting and logging metrics
 */

import { isValidDay } from '../lib/comic-response.ts';
import { requireBindings } from '../lib/runtime-config.ts';
import {
  createImageProvider,
  createImageRenderer,
  getAvailableProviders,
} from '../lib/image-providers.ts';
import { generateVariantPrompts } from '../lib/svg-prompt-generator.ts';
import { invokeWorkflow } from '../lib/ledgrrr-mcp-client.ts';

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

    // === Image Rendering Governance (Ledgrrr) ===
    let auditImageResult: any = null;
    try {
      auditImageResult = await invokeWorkflow('image_rendering', {
        script_a: script.variant_a || script.a || '',
        script_b: script.variant_b || script.b || '',
        image_a_path: `pending/${day}/variant-a.jpg`,
        image_b_path: `pending/${day}/variant-b.jpg`,
      });

      if (!auditImageResult.success && auditImageResult.error) {
        console.warn('[image-generate] Image rendering audit failed (non-blocking):', auditImageResult.error);
      }
    } catch (err: any) {
      console.warn('[image-generate] Image rendering governance error (non-blocking):', err.message);
      // Graceful degradation: continue without ledgrrr if unavailable
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

    // === Forecasting & Logging (Ledgrrr) ===
    let auditForecastResult: any = null;
    try {
      // Calculate image quality scores (placeholder metrics)
      const imageQualityA = images.imageA ? 0.85 : 0;
      const imageQualityB = images.imageB ? 0.82 : 0;
      const imageASize = images.imageA?.imageBuffer?.byteLength || 0;
      const imageBSize = images.imageB?.imageBuffer?.byteLength || 0;

      auditForecastResult = await invokeWorkflow('forecasting_and_log', {
        image_a_path: r2Keys.imageA || '',
        image_b_path: r2Keys.imageB || '',
        variant_a_score: imageQualityA,
        variant_b_score: imageQualityB,
        day: day,
        metrics: {
          script_length_a: (script.variant_a || script.a || '').length,
          script_length_b: (script.variant_b || script.b || '').length,
          image_size_a: imageASize,
          image_size_b: imageBSize,
        },
      });

      if (!auditForecastResult.success && auditForecastResult.error) {
        console.warn('[image-generate] Forecasting audit failed (non-blocking):', auditForecastResult.error);
      }
    } catch (err: any) {
      console.warn('[image-generate] Forecasting governance error (non-blocking):', err.message);
      // Graceful degradation: continue without ledgrrr if unavailable
    }

    // === Save to database ===
    await env.DB.prepare(
      `
      INSERT INTO comics (day, r2_key_a, r2_key_b, model_provider_a, model_provider_b, audit_log_render, audit_log_forecast)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(day) DO UPDATE SET
        r2_key_a = COALESCE(?, r2_key_a),
        r2_key_b = COALESCE(?, r2_key_b),
        model_provider_a = ?,
        model_provider_b = ?,
        audit_log_render = ?,
        audit_log_forecast = ?
    `
    )
      .bind(
        day,
        r2Keys.imageA,
        r2Keys.imageB,
        env.IMAGE_PROVIDER_A || 'unknown',
        env.IMAGE_PROVIDER_B || 'unknown',
        auditImageResult ? JSON.stringify(auditImageResult.audit_entry) : null,
        auditForecastResult ? JSON.stringify(auditForecastResult.audit_entry) : null,
        r2Keys.imageA,
        r2Keys.imageB,
        env.IMAGE_PROVIDER_A || 'unknown',
        env.IMAGE_PROVIDER_B || 'unknown',
        auditImageResult ? JSON.stringify(auditImageResult.audit_entry) : null,
        auditForecastResult ? JSON.stringify(auditForecastResult.audit_entry) : null
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
      audit_trail: {
        image_rendering: auditImageResult ? {
          success: auditImageResult.success,
          entry_id: auditImageResult.audit_entry?.entry_id,
          timestamp: auditImageResult.audit_entry?.timestamp,
          status: auditImageResult.audit_entry?.status,
        } : null,
        forecasting_and_log: auditForecastResult ? {
          success: auditForecastResult.success,
          entry_id: auditForecastResult.audit_entry?.entry_id,
          timestamp: auditForecastResult.audit_entry?.timestamp,
          status: auditForecastResult.audit_entry?.status,
        } : null,
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
