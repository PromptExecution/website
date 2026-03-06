import { CAST, getCharacterById, pickCharactersExcluding, type CastCharacter } from './cast.ts';
import { base64ToArrayBuffer } from './encoding.ts';

const DEFAULT_IMAGE_MODEL_A = '@cf/bytedance/stable-diffusion-xl-lightning';
const DEFAULT_IMAGE_MODEL_B = '@cf/black-forest-labs/flux-1-schnell';
const DEFAULT_TOPIC_MODEL = '@cf/meta/llama-3.1-8b-instruct';

const FALLBACK_TOPICS = [
  'prompt injection incident in production',
  'Kubernetes deployment rollback panic',
  'Cloudflare cache key confusion',
  'zero-downtime deploy that was not zero downtime',
  'hallucinated source citations in incident report',
  'DNS propagation waiting game',
  'mysterious authentication timeout after lunch',
  'cost optimization meeting that increases costs',
  'SRE on-call handoff gone sideways',
  'passive aggressive status page update'
];

const NEGATIVE_PROMPT = [
  'photo realistic',
  '3d render',
  'oil painting',
  'high saturation',
  'blurry',
  'extra limbs',
  'text wall',
  'watermark',
  'logo',
  'signature'
].join(', ');

export interface WorkflowStepLog {
  step: string;
  status: 'ok' | 'error';
  started_at: string;
  completed_at: string;
  detail: string;
}

export interface ComicWorkflowResult {
  day: string;
  run_id: string;
  title: string;
  panel_count: number;
  character_count: number;
  cast: CastCharacter[];
  topic_candidates: string[];
  selected_topic: string;
  model_a: string;
  model_b: string;
  prompt_a: string;
  prompt_b: string;
  image_key_a: string;
  image_key_b: string;
  artifact_keys: {
    log: string;
    cast: string;
    topics: string;
    prompt_a: string;
    prompt_b: string;
  };
  script_a: Record<string, unknown>;
  script_b: Record<string, unknown>;
  workflow_log: WorkflowStepLog[];
}

interface ComicPlan {
  day: string;
  run_id: string;
  title: string;
  panel_count: number;
  character_count: number;
  cast: CastCharacter[];
  topic_candidates: string[];
  selected_topic: string;
  prompt_a: string;
  prompt_b: string;
}

export async function previewAgenticPromptPlan(env: any, options: { day: string; force_topic?: string; trigger: 'cron' | 'manual'; }) {
  const workflowLog: WorkflowStepLog[] = [];
  const plan = await buildComicPlan(env, options, workflowLog);
  return {
    ...plan,
    workflow_log: workflowLog
  };
}

export async function runAgenticComicWorkflow(env: any, options: { day: string; force_topic?: string; trigger: 'cron' | 'manual'; }) {
  const workflowLog: WorkflowStepLog[] = [];
  const plan = await buildComicPlan(env, options, workflowLog);
  const modelA = env.IMAGE_MODEL_A || DEFAULT_IMAGE_MODEL_A;
  const modelB = env.IMAGE_MODEL_B || DEFAULT_IMAGE_MODEL_B;
  const random = createSeededRng(hashToUInt32(`${plan.day}:${plan.run_id}:image-seeds`));

  const seedA = randomInt(random, 1, 2_147_483_600);
  const seedB = randomInt(random, 1, 2_147_483_600);

  const variantA = await generateImageVariant(env, modelA, plan.prompt_a, seedA, workflowLog, 'variant-a');
  const variantB = await generateImageVariant(env, modelB, plan.prompt_b, seedB, workflowLog, 'variant-b', modelA);

  const imageKeyA = `comics/${plan.day}/a.png`;
  const imageKeyB = `comics/${plan.day}/b.png`;
  const artifactPrefix = `artifacts/${plan.day}/${plan.run_id}`;

  await Promise.all([
    env.COMICS_BUCKET.put(imageKeyA, variantA.image, { httpMetadata: { contentType: 'image/png' } }),
    env.COMICS_BUCKET.put(imageKeyB, variantB.image, { httpMetadata: { contentType: 'image/png' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/workflow-log.json`, JSON.stringify(workflowLog, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/cast.json`, JSON.stringify(plan.cast, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/topics.json`, JSON.stringify(plan.topic_candidates, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/prompt-a.txt`, plan.prompt_a, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/prompt-b.txt`, plan.prompt_b, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } })
  ]);

  workflowLog.push(makeStep('persist-artifacts', 'ok', `Saved images and workflow artifacts to ${artifactPrefix}.`));

  const scriptA = {
    run_id: plan.run_id,
    panel_count: plan.panel_count,
    character_count: plan.character_count,
    cast_ids: plan.cast.map((item) => item.id),
    topic_candidates: plan.topic_candidates,
    selected_topic: plan.selected_topic,
    prompt: plan.prompt_a,
    seed: seedA,
    model: variantA.model
  };

  const scriptB = {
    run_id: plan.run_id,
    panel_count: plan.panel_count,
    character_count: plan.character_count,
    cast_ids: plan.cast.map((item) => item.id),
    topic_candidates: plan.topic_candidates,
    selected_topic: plan.selected_topic,
    prompt: plan.prompt_b,
    seed: seedB,
    model: variantB.model
  };

  await env.DB.prepare(
    'INSERT OR REPLACE INTO comics (day, prompt, model_a, model_b, r2_key_a, r2_key_b, script_a, script_b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    plan.day,
    plan.title,
    variantA.model,
    variantB.model,
    imageKeyA,
    imageKeyB,
    JSON.stringify(scriptA),
    JSON.stringify(scriptB),
    Math.floor(Date.now() / 1000)
  ).run();

  await env.DB.prepare(
    `INSERT OR REPLACE INTO workflow_runs (
      run_id, day, trigger, panel_count, character_count, cast_json, topics_json, selected_topic,
      prompt_a, prompt_b, model_a, model_b, image_key_a, image_key_b, artifact_log_key, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    plan.run_id,
    plan.day,
    options.trigger,
    plan.panel_count,
    plan.character_count,
    JSON.stringify(plan.cast),
    JSON.stringify(plan.topic_candidates),
    plan.selected_topic,
    plan.prompt_a,
    plan.prompt_b,
    variantA.model,
    variantB.model,
    imageKeyA,
    imageKeyB,
    `${artifactPrefix}/workflow-log.json`,
    Math.floor(Date.now() / 1000)
  ).run();

  workflowLog.push(makeStep('persist-database', 'ok', 'Stored comic metadata and workflow run in D1.'));

  return {
    day: plan.day,
    run_id: plan.run_id,
    title: plan.title,
    panel_count: plan.panel_count,
    character_count: plan.character_count,
    cast: plan.cast,
    topic_candidates: plan.topic_candidates,
    selected_topic: plan.selected_topic,
    model_a: variantA.model,
    model_b: variantB.model,
    prompt_a: plan.prompt_a,
    prompt_b: plan.prompt_b,
    image_key_a: imageKeyA,
    image_key_b: imageKeyB,
    artifact_keys: {
      log: `${artifactPrefix}/workflow-log.json`,
      cast: `${artifactPrefix}/cast.json`,
      topics: `${artifactPrefix}/topics.json`,
      prompt_a: `${artifactPrefix}/prompt-a.txt`,
      prompt_b: `${artifactPrefix}/prompt-b.txt`
    },
    script_a: scriptA,
    script_b: scriptB,
    workflow_log: workflowLog
  } as ComicWorkflowResult;
}

async function buildComicPlan(
  env: any,
  options: { day: string; force_topic?: string; trigger: 'cron' | 'manual'; },
  workflowLog: WorkflowStepLog[]
): Promise<ComicPlan> {
  const now = Date.now();
  const runId = `${options.day}-${now}-${Math.floor(Math.random() * 1_000_000)}`;
  const random = createSeededRng(hashToUInt32(`${options.day}:${runId}`));
  const panelCount = randomInt(random, 3, 4);
  const coreCast = ['user', 'robot']
    .map((id) => getCharacterById(id))
    .filter(Boolean) as CastCharacter[];
  const optionalCount = randomInt(random, 0, Math.min(2, CAST.length - coreCast.length));
  const chosenCast = [
    ...coreCast,
    ...pickCharactersExcluding(random, optionalCount, coreCast.map((character) => character.id))
  ];
  const characterCount = chosenCast.length;

  workflowLog.push(makeStep('sample-structure', 'ok', `Selected ${panelCount} panel(s), ${characterCount} character(s).`));

  const topicCandidates = await suggestTopics(env, chosenCast, panelCount, random, workflowLog);
  const selectedTopic = options.force_topic || topicCandidates[randomInt(random, 0, topicCandidates.length - 1)];
  const title = makeComicTitle(selectedTopic);

  const promptBase = buildStandardPrompt({
    panelCount,
    cast: chosenCast,
    topic: selectedTopic
  });

  const promptA = `${promptBase}\nVariant directive: prioritize crisp panel readability and dry technical humor.`;
  const promptB = `${promptBase}\nVariant directive: prioritize absurd BOFH energy and unexpected visual punchline.`;

  workflowLog.push(makeStep('build-prompts', 'ok', 'Built standard image generation prompts for both variants.'));

  return {
    day: options.day,
    run_id: runId,
    title,
    panel_count: panelCount,
    character_count: characterCount,
    cast: chosenCast,
    topic_candidates: topicCandidates,
    selected_topic: selectedTopic,
    prompt_a: promptA,
    prompt_b: promptB
  };
}

async function suggestTopics(
  env: any,
  cast: CastCharacter[],
  panelCount: number,
  random: () => number,
  workflowLog: WorkflowStepLog[]
): Promise<string[]> {
  if (!env.AI) {
    const fallback = pickFallbackTopics(random, cast);
    workflowLog.push(makeStep('suggest-topics', 'ok', 'AI binding unavailable, used deterministic fallback topics.'));
    return fallback;
  }

  const model = env.TOPIC_MODEL || DEFAULT_TOPIC_MODEL;
  const systemPrompt = 'You are a technical humor prompt planner. Return JSON only: {"topics":["...", "...", "..."]}';
  const userPrompt = [
    `Create 3 concise comic topic candidates for an xkcd-style technical comic.`,
    `Panel count: ${panelCount}`,
    `Cast: ${cast.map((c) => `${c.name} (${c.role})`).join(', ')}`,
    `Rules: each topic must be specific, practical, and under 12 words.`
  ].join('\n');

  try {
    const response = await env.AI.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 350,
      temperature: 0.8
    });

    const raw = response?.response || JSON.stringify(response);
    const parsed = parseJsonFromText(raw);
    const topics = Array.isArray(parsed?.topics)
      ? parsed.topics.map((topic: any) => String(topic).trim()).filter(Boolean).slice(0, 3)
      : [];

    if (topics.length === 3) {
      workflowLog.push(makeStep('suggest-topics', 'ok', `Generated topic candidates using ${model}.`));
      return topics;
    }
  } catch (err: any) {
    workflowLog.push(makeStep('suggest-topics', 'error', `Topic generation failed on ${model}: ${err.message || String(err)}`));
  }

  const fallback = pickFallbackTopics(random, cast);
  workflowLog.push(makeStep('suggest-topics-fallback', 'ok', 'Used deterministic fallback topics.'));
  return fallback;
}

function pickFallbackTopics(random: () => number, cast: CastCharacter[]): string[] {
  const pool = [...FALLBACK_TOPICS];
  const selected: string[] = [];

  while (selected.length < 3 && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  if (selected.length < 3) {
    while (selected.length < 3) {
      selected.push(`unexpected ${cast[0]?.name || 'robot'} behavior in production`);
    }
  }

  return selected;
}

async function generateImageVariant(
  env: any,
  model: string,
  prompt: string,
  seed: number,
  workflowLog: WorkflowStepLog[],
  stepName: string,
  fallbackModel?: string
) {
  if (!env.AI) {
    throw new Error('Workers AI binding is required for graphic generation.');
  }

  try {
    const image = await generateImageWithModel(env.AI, model, prompt, seed);
    workflowLog.push(makeStep(stepName, 'ok', `Generated image with ${model} (seed ${seed}).`));
    return { image, model };
  } catch (err: any) {
    if (!fallbackModel) {
      workflowLog.push(makeStep(stepName, 'error', `Image generation failed on ${model}: ${err.message || String(err)}`));
      throw err;
    }

    const fallbackImage = await generateImageWithModel(env.AI, fallbackModel, prompt, seed + 99);
    const fallbackName = `${fallbackModel} (fallback for ${model})`;
    workflowLog.push(makeStep(stepName, 'ok', `Model ${model} failed, used fallback ${fallbackName}.`));
    return { image: fallbackImage, model: fallbackName };
  }
}

async function generateImageWithModel(ai: any, model: string, prompt: string, seed: number): Promise<ArrayBuffer> {
  const payload: Record<string, unknown> = {
    prompt,
    negative_prompt: NEGATIVE_PROMPT,
    seed
  };

  if (model.includes('stable-diffusion-xl-lightning')) {
    payload.width = 1344;
    payload.height = 768;
    payload.num_steps = 8;
    payload.guidance = 4.5;
  } else {
    payload.width = 1344;
    payload.height = 768;
    payload.num_steps = 6;
  }

  const result = await ai.run(model, payload);
  return normalizeImageOutput(result);
}

async function normalizeImageOutput(output: any): Promise<ArrayBuffer> {
  if (!output) {
    throw new Error('Model returned empty image payload.');
  }

  if (output instanceof ArrayBuffer) return output;
  if (ArrayBuffer.isView(output)) return output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength);
  if (output instanceof ReadableStream) return new Response(output).arrayBuffer();
  if (typeof output === 'string') return base64ToArrayBuffer(output);

  if (output.image) return base64ToArrayBuffer(output.image);
  if (output.result?.image) return base64ToArrayBuffer(output.result.image);
  if (typeof output.b64_json === 'string') return base64ToArrayBuffer(output.b64_json);

  throw new Error('Unsupported image output shape from Workers AI.');
}

function buildStandardPrompt(input: { panelCount: number; cast: CastCharacter[]; topic: string; }): string {
  const castLines = input.cast.map((char, idx) => (
    `${idx + 1}. ${char.name} (${char.role})` +
    `\n   Description: ${char.description}` +
    `\n   Visual cues: ${char.visual_traits.join(', ')}` +
    `\n   Sample reference: ${char.sample_image}`
  )).join('\n');

  return [
    'Create a graphic webcomic image, not plain text output.',
    'Series title: LLM DOES NOT COMPUTE.',
    'Style: xkcd-inspired minimal black-and-white line art, hand-drawn stick figures, technical humor, precise panel readability.',
    `Layout: exactly ${input.panelCount} panels in one horizontal strip with visible panel borders.`,
    'Each panel should contain concise speech or thought bubbles as part of the drawing.',
    `Topic: ${input.topic}`,
    'Recurring cast bible:',
    '- The User is a plain round-head stick figure who asks vague, underspecified questions.',
    '- The LLM Robot is a square-head stick figure with an antenna. Its internal monologue appears in a cloud thought bubble using a technical monospace style.',
    '- Simon is a BOFH sysadmin with a fedora and grey goatee. He is dry, cynical, and usually lands the correction or punchline.',
    '- The Boss wears a tie and talks like an AI hype manager.',
    '- Ferris is a silent crab cameo or panic signal in the background.',
    'Characters to include:',
    castLines,
    'Scene requirements:',
    '- The strip must include both the User and the LLM Robot.',
    '- Keep the robot internal monologue in a cloud-like thought bubble with monospace look.',
    '- Keep Simon deadpan if Simon is present.',
    '- Use dry systems-thinking humor about failure modes, architecture, operations, or specification gaps.',
    '- Keep backgrounds minimal and technical (whiteboard, terminal, server rack hints).',
    '- No full-color illustration; monochrome or near-monochrome only.',
    '- No captions outside panels.',
    '- No watermark, logo, signature, or unrelated text.'
  ].join('\n');
}

function makeComicTitle(topic: string): string {
  const trimmed = topic.trim();
  const clean = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return `LLM DOES NOT COMPUTE: ${clean}`;
}

function makeStep(step: string, status: 'ok' | 'error', detail: string): WorkflowStepLog {
  const now = new Date().toISOString();
  return {
    step,
    status,
    started_at: now,
    completed_at: now,
    detail
  };
}

function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function randomInt(rand: () => number, min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function hashToUInt32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseJsonFromText(raw: string): any {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
