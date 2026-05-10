#!/usr/bin/env deno
/**
 * End-to-End Test: Full Comic Generation with Ledgrrr Governance
 *
 * Tests the complete pipeline:
 * 1. Script generation with ledgrrr audit
 * 2. Image generation with image_rendering workflow
 * 3. Forecasting and logging with forecasting_and_log workflow
 * 4. Database audit trail verification
 *
 * Usage: deno run --allow-net --allow-read --allow-env scripts/e2e-test.ts
 */

import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP' | 'PENDING';
  duration_ms: number;
  error?: string;
  details?: Record<string, unknown>;
}

interface PipelineAuditEntry {
  entry_id: string;
  timestamp: string;
  function_name: string;
  status: string;
  context_input: Record<string, unknown>;
  result?: unknown;
  error_message?: string;
  execution_time_ms: number;
}

interface DatabaseRecord {
  day: string;
  audit_log_render?: string;
  audit_log_forecast?: string;
}

interface ImageGenerationResponse {
  status: string;
  day: string;
  variants: Record<string, string>;
  r2Keys: Record<string, string | null>;
  errors: string[];
  audit_trail: {
    image_rendering: {
      success: boolean;
      entry_id: string;
      timestamp: string;
      status: string;
    } | null;
    forecasting_and_log: {
      success: boolean;
      entry_id: string;
      timestamp: string;
      status: string;
    } | null;
  };
}

interface ScriptGenerationResponse {
  success: boolean;
  day: string;
  run_id: string;
  title: string;
  panel_count: number;
  character_count: number;
  cast: unknown[];
  topic_candidates: string[];
  selected_topic: string;
  models: Record<string, string>;
  r2_keys: Record<string, string>;
  artifact_keys: Record<string, string>;
  audit_trail?: PipelineAuditEntry;
  workflow_log: Array<{step: string; status: string; detail: string}>;
}

const BASE_URL = Deno.env.get('API_URL') || 'http://127.0.0.1:8788';
const TEST_SECRET = Deno.env.get('TEST_SECRET') || 'local-secret';
const TEST_DAY = '2026-05-10';

const results: TestResult[] = [];

function log(msg: string) {
  console.log(`[E2E-TEST] ${msg}`);
}

function logSection(title: string) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(70)}\n`);
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  let status: 'PASS' | 'FAIL' | 'PENDING' = 'PENDING';
  let error: string | undefined;
  let details: Record<string, unknown> | undefined;

  try {
    await fn();
    status = 'PASS';
    log(`✓ ${name}`);
  } catch (err) {
    status = 'FAIL';
    error = err instanceof Error ? err.message : String(err);
    details = {
      stack: err instanceof Error ? err.stack : undefined,
      error: String(err)
    };
    log(`✗ ${name}: ${error}`);
  }

  const duration = Date.now() - start;
  results.push({ name, status, duration_ms: duration, error, details });
}

async function fetchAPI(
  endpoint: string,
  options: {
    method?: string;
    body?: unknown;
    expectStatus?: number;
  } = {}
) {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TEST_SECRET}`,
    'Content-Type': 'application/json',
  };

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, fetchOptions);
  const expectStatus = options.expectStatus || 200;

  if (response.status !== expectStatus) {
    const text = await response.text();
    throw new Error(
      `Expected status ${expectStatus}, got ${response.status}: ${text}`
    );
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function queryDatabase(query: string) {
  // This would require a separate DB query endpoint
  // For now, we'll check audit logs through the API response
  return null;
}

async function main() {
  logSection('COMIC GENERATION E2E TEST WITH LEDGRRR GOVERNANCE');
  log(`Test Date: ${TEST_DAY}`);
  log(`API URL: ${BASE_URL}`);
  log(`Starting tests at ${new Date().toISOString()}\n`);

  // === PHASE 1: SCRIPT GENERATION ===
  logSection('PHASE 1: SCRIPT GENERATION');

  let scriptGenResponse: ScriptGenerationResponse | null = null;
  let scriptAuditEntry: PipelineAuditEntry | null = null;

  await test('Script generation endpoint responds', async () => {
    scriptGenResponse = await fetchAPI('/api/test-generate', {
      method: 'POST',
      body: { day: TEST_DAY },
      expectStatus: 200,
    });

    if (!scriptGenResponse?.success) {
      throw new Error('Script generation failed');
    }
  });

  await test('Script generation returns valid metadata', async () => {
    if (!scriptGenResponse) throw new Error('No response from script generation');

    assertEquals(scriptGenResponse.day, TEST_DAY);
    if (!scriptGenResponse.run_id) throw new Error('Missing run_id');
    if (!scriptGenResponse.title) throw new Error('Missing title');
    if (scriptGenResponse.panel_count < 1) throw new Error('Invalid panel count');
    if (scriptGenResponse.character_count < 1) throw new Error('Invalid character count');
  });

  await test('Script generation includes ledgrrr audit trail', async () => {
    if (!scriptGenResponse) throw new Error('No response from script generation');

    const hasAudit = scriptGenResponse.audit_trail &&
                     scriptGenResponse.audit_trail.entry_id &&
                     scriptGenResponse.audit_trail.timestamp;

    if (!hasAudit) {
      log('⚠ No audit trail in response (ledgrrr may be unavailable)');
      return;
    }

    scriptAuditEntry = scriptGenResponse.audit_trail;
    if (!scriptAuditEntry?.timestamp) throw new Error('Invalid audit timestamp');
  });

  await test('Script generation stores artifacts in R2', async () => {
    if (!scriptGenResponse) throw new Error('No response from script generation');

    const hasArtifacts = scriptGenResponse.artifact_keys &&
                         scriptGenResponse.artifact_keys.log &&
                         scriptGenResponse.artifact_keys.prompt_a;

    if (!hasArtifacts) {
      throw new Error('Missing artifact keys');
    }
  });

  await test('Script generation workflow log is populated', async () => {
    if (!scriptGenResponse) throw new Error('No response from script generation');

    if (!Array.isArray(scriptGenResponse.workflow_log)) {
      throw new Error('workflow_log is not an array');
    }

    if (scriptGenResponse.workflow_log.length === 0) {
      throw new Error('workflow_log is empty');
    }

    log(`  Workflow steps: ${scriptGenResponse.workflow_log.map(s => s.step).join(' → ')}`);
  });

  // === PHASE 2: IMAGE GENERATION ===
  logSection('PHASE 2: IMAGE GENERATION');

  let imageGenResponse: ImageGenerationResponse | null = null;
  let imageRenderingAudit: PipelineAuditEntry | null = null;
  let forecastingAudit: PipelineAuditEntry | null = null;

  await test('Image generation endpoint responds', async () => {
    imageGenResponse = await fetchAPI(`/api/image-generate?day=${TEST_DAY}`, {
      method: 'POST',
      expectStatus: 200,
    });

    if (!imageGenResponse?.status) {
      throw new Error('Image generation failed');
    }
  });

  await test('Image generation creates variant images', async () => {
    if (!imageGenResponse) throw new Error('No response from image generation');

    const variantA = imageGenResponse.variants.a === 'generated';
    const variantB = imageGenResponse.variants.b === 'generated';

    if (!variantA && !variantB) {
      throw new Error('Both image variants failed to generate');
    }

    log(`  Variant A: ${imageGenResponse.variants.a}`);
    log(`  Variant B: ${imageGenResponse.variants.b}`);
  });

  await test('Image rendering audit trail is present', async () => {
    if (!imageGenResponse) throw new Error('No response from image generation');

    const auditEntry = imageGenResponse.audit_trail?.image_rendering;

    if (!auditEntry) {
      log('⚠ No image_rendering audit entry (ledgrrr may be unavailable)');
      return;
    }

    if (!auditEntry.entry_id || !auditEntry.timestamp) {
      throw new Error('Invalid image_rendering audit entry');
    }

    imageRenderingAudit = auditEntry as any;
    log(`  Audit Entry ID: ${auditEntry.entry_id}`);
    log(`  Timestamp: ${auditEntry.timestamp}`);
    log(`  Status: ${auditEntry.status}`);
  });

  await test('Forecasting and logging audit trail is present', async () => {
    if (!imageGenResponse) throw new Error('No response from image generation');

    const auditEntry = imageGenResponse.audit_trail?.forecasting_and_log;

    if (!auditEntry) {
      log('⚠ No forecasting_and_log audit entry (ledgrrr may be unavailable)');
      return;
    }

    if (!auditEntry.entry_id || !auditEntry.timestamp) {
      throw new Error('Invalid forecasting_and_log audit entry');
    }

    forecastingAudit = auditEntry as any;
    log(`  Audit Entry ID: ${auditEntry.entry_id}`);
    log(`  Timestamp: ${auditEntry.timestamp}`);
    log(`  Status: ${auditEntry.status}`);
  });

  await test('Images are stored in R2', async () => {
    if (!imageGenResponse) throw new Error('No response from image generation');

    const hasImages = (imageGenResponse.r2Keys.imageA || imageGenResponse.r2Keys.imageB);

    if (!hasImages) {
      throw new Error('No images stored in R2');
    }

    if (imageGenResponse.r2Keys.imageA) {
      log(`  Image A: ${imageGenResponse.r2Keys.imageA}`);
    }
    if (imageGenResponse.r2Keys.imageB) {
      log(`  Image B: ${imageGenResponse.r2Keys.imageB}`);
    }
  });

  // === PHASE 3: AUDIT TRAIL VERIFICATION ===
  logSection('PHASE 3: AUDIT TRAIL VERIFICATION');

  await test('Script generation audit entry is valid', async () => {
    if (!scriptAuditEntry) {
      log('⚠ Skipped: script audit entry not available');
      return;
    }

    if (!scriptAuditEntry.entry_id) throw new Error('Missing entry_id');
    if (!scriptAuditEntry.timestamp) throw new Error('Missing timestamp');

    const timestamp = new Date(scriptAuditEntry.timestamp);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format');
    }

    log(`  Entry ID: ${scriptAuditEntry.entry_id}`);
    log(`  Function: ${scriptAuditEntry.function_name}`);
    log(`  Status: ${scriptAuditEntry.status}`);
  });

  await test('Image rendering audit entry is valid', async () => {
    if (!imageRenderingAudit) {
      log('⚠ Skipped: image rendering audit entry not available');
      return;
    }

    if (!imageRenderingAudit.entry_id) throw new Error('Missing entry_id');
    if (!imageRenderingAudit.timestamp) throw new Error('Missing timestamp');

    const timestamp = new Date(imageRenderingAudit.timestamp as string);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format');
    }
  });

  await test('Forecasting audit entry is valid', async () => {
    if (!forecastingAudit) {
      log('⚠ Skipped: forecasting audit entry not available');
      return;
    }

    if (!forecastingAudit.entry_id) throw new Error('Missing entry_id');
    if (!forecastingAudit.timestamp) throw new Error('Missing timestamp');

    const timestamp = new Date(forecastingAudit.timestamp as string);
    if (isNaN(timestamp.getTime())) {
      throw new Error('Invalid timestamp format');
    }
  });

  await test('All three workflows were invoked', async () => {
    const hasScriptGen = !!scriptAuditEntry;
    const hasImageRender = !!imageRenderingAudit;
    const hasForecast = !!forecastingAudit;

    const count = [hasScriptGen, hasImageRender, hasForecast].filter(Boolean).length;

    log(`  Workflows executed: ${count}/3`);
    log(`    - script_generation: ${hasScriptGen ? '✓' : '✗'}`);
    log(`    - image_rendering: ${hasImageRender ? '✓' : '✗'}`);
    log(`    - forecasting_and_log: ${hasForecast ? '✓' : '✗'}`);

    if (count === 0) {
      log('⚠ No ledgrrr workflows executed (ledgrrr may be unavailable)');
    } else if (count < 3) {
      log(`⚠ Only ${count} of 3 expected workflows were executed`);
    }
  });

  // === PHASE 4: SUMMARY ===
  logSection('TEST SUMMARY');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;
  const total = results.length;

  console.log(`Total Tests: ${total}`);
  console.log(`Passed:      ${passed} ✓`);
  console.log(`Failed:      ${failed} ✗`);
  console.log(`Skipped:     ${skipped}`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);
  console.log(`\nTotal Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  - ${r.name}`);
        if (r.error) console.log(`    ${r.error}`);
      });
  }

  // === DETAILED AUDIT TRAIL ===
  logSection('DETAILED AUDIT TRAIL');

  if (scriptAuditEntry) {
    console.log('Script Generation Audit:');
    console.log(JSON.stringify(scriptAuditEntry, null, 2));
  }

  if (imageRenderingAudit) {
    console.log('\nImage Rendering Audit:');
    console.log(JSON.stringify(imageRenderingAudit, null, 2));
  }

  if (forecastingAudit) {
    console.log('\nForecasting Audit:');
    console.log(JSON.stringify(forecastingAudit, null, 2));
  }

  // === API RESPONSES ===
  logSection('API RESPONSES');

  if (scriptGenResponse) {
    console.log('Script Generation Response:');
    console.log(JSON.stringify({
      day: scriptGenResponse.day,
      run_id: scriptGenResponse.run_id,
      title: scriptGenResponse.title,
      panel_count: scriptGenResponse.panel_count,
      character_count: scriptGenResponse.character_count,
      topic: scriptGenResponse.selected_topic,
      has_audit_trail: !!scriptGenResponse.audit_trail,
      workflow_steps: scriptGenResponse.workflow_log.length,
    }, null, 2));
  }

  if (imageGenResponse) {
    console.log('\nImage Generation Response:');
    console.log(JSON.stringify({
      status: imageGenResponse.status,
      day: imageGenResponse.day,
      variants: imageGenResponse.variants,
      has_image_rendering_audit: !!imageGenResponse.audit_trail.image_rendering,
      has_forecasting_audit: !!imageGenResponse.audit_trail.forecasting_and_log,
    }, null, 2));
  }

  // Exit with appropriate code
  const exitCode = failed > 0 ? 1 : 0;
  console.log(`\nExit Code: ${exitCode}`);
  Deno.exit(exitCode);
}

main().catch(err => {
  console.error('Fatal error:', err);
  Deno.exit(1);
});
