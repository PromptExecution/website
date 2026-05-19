import { CAST, getCharacterById, pickCharactersExcluding, type CastCharacter } from './cast.ts';
import { generateComicScript, type ComicImprovMenu, type ComicScript } from './comic-generator.ts';
import { renderComicToSVG } from './svg-renderer.ts';
import { invokeWorkflow, type AuditEntry } from './ledgrrr-mcp-client.ts';

const DEFAULT_SCRIPT_MODEL_A = '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b';
const DEFAULT_SCRIPT_MODEL_B = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const DEFAULT_TOPIC_MODEL = '@cf/qwen/qwen3-30b-a3b-fp8';
const DEFAULT_SCRIPT_MODEL_LINEUP = [
  '@cf/openai/gpt-oss-120b',
  '@cf/moonshotai/kimi-k2.6',
  '@cf/nvidia/nemotron-3-120b-a12b',
  '@cf/qwen/qwq-32b',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/meta/llama-4-scout-17b-16e-instruct',
  '@cf/google/gemma-4-26b-a4b-it'
];

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
  'passive aggressive status page update',
  'Python notebook becomes the production scheduler',
  'Linux permissions explain the cloud outage',
  'readiness probe passes by avoiding the service',
  'virtual environment copied into a container image',
  'runbook optimized until no steps remain',
  'service mesh debug session with too many mirrors',
  'cron job timezone argument at the postmortem',
  'dependency resolver negotiates with yesterday',
  'feature flag dashboard lies by omission',
  'secret rotation scheduled during incident response',
  'observability bill outgrows the application',
  'YAML anchor creates a leadership structure'
];

const SCENARIO_SETUPS = [
  {
    id: 'postmortem-whiteboard',
    label: 'postmortem whiteboard with a wrong causal arrow',
    sceneHints: ['whiteboard', 'incident_room', 'meeting'],
    prop: 'wrong causal arrow',
    tension: 'everyone agrees on the remediation before identifying the cause'
  },
  {
    id: 'deploy-terminal',
    label: 'deploy terminal beside a suspiciously cheerful status page',
    sceneHints: ['terminal', 'incident_room', 'network'],
    prop: 'green status page',
    tension: 'the dashboard is healthy because the broken service stopped reporting'
  },
  {
    id: 'architecture-review',
    label: 'architecture review where every box is labeled temporary',
    sceneHints: ['whiteboard', 'network', 'meeting'],
    prop: 'temporary boxes',
    tension: 'the workaround has more governance than the system'
  },
  {
    id: 'standup-escalation',
    label: 'standup meeting with a single ticket spanning the wall',
    sceneHints: ['meeting', 'desk', 'terminal'],
    prop: 'oversized ticket',
    tension: 'the estimate is precise because nobody understands the work'
  },
  {
    id: 'cache-mystery',
    label: 'network diagram where the cache is drawn as a trap door',
    sceneHints: ['network', 'whiteboard', 'terminal'],
    prop: 'cache trap door',
    tension: 'the fix works only for requests that already worked'
  },
  {
    id: 'prompt-lab',
    label: 'prompt debugging desk covered in tiny failed hypotheses',
    sceneHints: ['desk', 'terminal', 'whiteboard'],
    prop: 'failed hypotheses',
    tension: 'the prompt is stable until it reads the requirements'
  },
  {
    id: 'filesystem-autopsy',
    label: 'server desk where permission bits are bigger than the cloud diagram',
    sceneHints: ['desk', 'terminal', 'whiteboard'],
    prop: 'oversized permission bits',
    tension: 'the expensive platform problem is actually chmod'
  },
  {
    id: 'dependency-knot',
    label: 'dependency graph knotted around a production notebook',
    sceneHints: ['whiteboard', 'desk', 'terminal'],
    prop: 'dependency knot',
    tension: 'the one-line helper script has become the release process'
  },
  {
    id: 'cluster-bridge',
    label: 'Kubernetes bridge where pods are labeled like an anxious crew',
    sceneHints: ['network', 'incident_room', 'terminal'],
    prop: 'mutinying pods',
    tension: 'the rollout strategy assumes the containers will obey orders'
  },
  {
    id: 'billing-forensics',
    label: 'cost dashboard projected over a tiny useful service',
    sceneHints: ['meeting', 'network', 'whiteboard'],
    prop: 'ballooning invoice',
    tension: 'the monitoring is more available than the product'
  },
  {
    id: 'secret-rotation',
    label: 'incident room where every sticky note says rotated?',
    sceneHints: ['incident_room', 'terminal', 'desk'],
    prop: 'rotated secret notes',
    tension: 'nobody knows which credential is old enough to trust'
  },
  {
    id: 'timezone-cron',
    label: 'desk calendar arguing with a cron log',
    sceneHints: ['desk', 'terminal', 'incident_room'],
    prop: 'timezone calendar',
    tension: 'the job ran exactly on schedule in the wrong reality'
  },
  {
    id: 'flag-museum',
    label: 'feature flag dashboard arranged like an archaeological dig',
    sceneHints: ['whiteboard', 'meeting', 'terminal'],
    prop: 'ancient feature flags',
    tension: 'every safety switch is load-bearing'
  }
];

const PROP_ENTROPY = [
  'packet capture printout',
  'sticky-note causal chain',
  'tiny pager with huge alarm lines',
  'half-erased runbook',
  'labeled blast-radius circle',
  'dependency lockfile scroll',
  'service map with crossed arrows',
  'rotating secret key tag',
  'permission matrix',
  'pod manifest wanted poster',
  'shell history receipt',
  'dashboard with one honest metric',
  'queue depth ruler',
  'cache key family tree',
  'timezone wall clock',
  'rollback lever',
  'invoice taller than the server',
  'token bucket bucket',
  'SLO gravestone',
  'staging/prod light switch'
];

const SCENARIO_MODIFIERS = [
  'seen from the person who has to clean it up',
  'where the obvious prop contradicts the dialogue',
  'with the root cause visible but ignored',
  'as a physical room full of software artifacts',
  'with one tiny object carrying the whole joke',
  'where the dashboard and terminal disagree',
  'with the cast arguing over definitions instead of facts',
  'where the fix is visually worse than the bug'
];

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
  scenario_setup: ScenarioSetup;
  improv_menu: ComicImprovMenu;
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
    improv_menu: string;
    prompt_a: string;
    prompt_b: string;
  };
  script_a: Record<string, unknown>;
  script_b: Record<string, unknown>;
  imageGenerationStatus?: 'pending' | 'success' | 'failed' | 'error';
  audit_trail?: AuditEntry;
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
  scenario_setup: ScenarioSetup;
  improv_menu: ComicImprovMenu;
  prompt_a: string;
  prompt_b: string;
}

interface ScenarioSetup {
  id: string;
  label: string;
  sceneHints: string[];
  prop: string;
  tension: string;
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
  const [modelA, modelB] = pickScriptModels(env, plan.run_id);
  workflowLog.push(makeStep('select-script-models', 'ok', `Selected variant models: A=${modelA}, B=${modelB}.`));

  const variantA = await generateScriptVariant(env, modelA, plan, workflowLog, 'variant-a', 'prioritize the cleanest joke structure and readable dialogue.', modelB);
  const variantB = await generateScriptVariant(env, modelB, plan, workflowLog, 'variant-b', 'prioritize sharper escalation and a meaner final punchline.', modelA);

  const imageKeyA = `comics/${plan.day}/a.svg`;
  const imageKeyB = `comics/${plan.day}/b.svg`;
  const artifactPrefix = `artifacts/${plan.day}/${plan.run_id}`;
  const imageA = renderComicToSVG(variantA.script);
  const imageB = renderComicToSVG(variantB.script);

  await Promise.all([
    env.COMICS_BUCKET.put(imageKeyA, imageA, { httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' } }),
    env.COMICS_BUCKET.put(imageKeyB, imageB, { httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/workflow-log.json`, JSON.stringify(workflowLog, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/cast.json`, JSON.stringify(plan.cast, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/topics.json`, JSON.stringify(plan.topic_candidates, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/improv-menu.json`, JSON.stringify(plan.improv_menu, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/prompt-a.txt`, plan.prompt_a, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/prompt-b.txt`, plan.prompt_b, { httpMetadata: { contentType: 'text/plain; charset=utf-8' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/script-a.json`, JSON.stringify(variantA.script, null, 2), { httpMetadata: { contentType: 'application/json' } }),
    env.COMICS_BUCKET.put(`${artifactPrefix}/script-b.json`, JSON.stringify(variantB.script, null, 2), { httpMetadata: { contentType: 'application/json' } }),
  ]);

  workflowLog.push(makeStep('persist-artifacts', 'ok', `Saved SVG comics and workflow artifacts to ${artifactPrefix}.`));

  await env.DB.prepare(
    'INSERT OR REPLACE INTO comics (day, prompt, model_a, model_b, r2_key_a, r2_key_b, script_a, script_b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    plan.day,
    plan.title,
    variantA.script.model,
    variantB.script.model,
    imageKeyA,
    imageKeyB,
    JSON.stringify(variantA.script),
    JSON.stringify(variantB.script),
    Math.floor(Date.now() / 1000)
  ).run();

  let auditTrail: AuditEntry | undefined;

  // Invoke ledgrrr for governance/audit tracking
  try {
    const auditResult = await invokeWorkflow('script_generation', {
      script_a: variantA.script,
      script_b: variantB.script,
      topic: plan.selected_topic,
      cast: plan.cast
    });

    if (auditResult.success) {
      auditTrail = auditResult.audit_entry;
      workflowLog.push(makeStep('ledgrrr-audit', 'ok', `Audit entry created: ${auditTrail.entry_id}`));
    } else {
      workflowLog.push(makeStep('ledgrrr-audit', 'error', `Ledgrrr invocation failed: ${auditResult.error || 'unknown error'}`));
    }
  } catch (err: any) {
    // Graceful degradation: ledgrrr unavailable doesn't block workflow
    workflowLog.push(makeStep('ledgrrr-audit', 'error', `Ledgrrr connection error: ${err.message || String(err)}`));
  }

  await env.DB.prepare(
    `INSERT OR REPLACE INTO workflow_runs (
      run_id, day, trigger, panel_count, character_count, cast_json, topics_json, selected_topic,
      prompt_a, prompt_b, model_a, model_b, image_key_a, image_key_b, artifact_log_key, audit_log, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
    variantA.script.model,
    variantB.script.model,
    imageKeyA,
    imageKeyB,
    `${artifactPrefix}/workflow-log.json`,
    auditTrail ? JSON.stringify(auditTrail) : null,
    Math.floor(Date.now() / 1000)
  ).run();

  workflowLog.push(makeStep('persist-database', 'ok', 'Stored comic metadata and workflow run in D1.'));

  // Trigger image generation asynchronously (non-blocking)
  let imageGenerationStatus = 'pending';
  (async () => {
    try {
      const imageGenUrl = `/api/image-generate?day=${encodeURIComponent(plan.day)}`;
      const response = await fetch(imageGenUrl, { method: 'POST' });
      if (response.ok) {
        imageGenerationStatus = 'success';
        workflowLog.push(makeStep('image-generation', 'ok', `Triggered image generation via ${imageGenUrl}`));
      } else {
        imageGenerationStatus = 'failed';
        const errorText = await response.text();
        workflowLog.push(makeStep('image-generation', 'error', `Image generation request failed with ${response.status}`));
      }
    } catch (err: any) {
      imageGenerationStatus = 'error';
      workflowLog.push(makeStep('image-generation', 'error', `Image generation request error: ${err.message || String(err)}`));
    }
  })();

  return {
    day: plan.day,
    run_id: plan.run_id,
    title: plan.title,
    panel_count: plan.panel_count,
    character_count: plan.character_count,
    cast: plan.cast,
    topic_candidates: plan.topic_candidates,
    selected_topic: plan.selected_topic,
    scenario_setup: plan.scenario_setup,
    model_a: variantA.script.model,
    model_b: variantB.script.model,
    prompt_a: plan.prompt_a,
    prompt_b: plan.prompt_b,
    image_key_a: imageKeyA,
    image_key_b: imageKeyB,
    artifact_keys: {
      log: `${artifactPrefix}/workflow-log.json`,
      cast: `${artifactPrefix}/cast.json`,
      topics: `${artifactPrefix}/topics.json`,
      improv_menu: `${artifactPrefix}/improv-menu.json`,
      prompt_a: `${artifactPrefix}/prompt-a.txt`,
      prompt_b: `${artifactPrefix}/prompt-b.txt`
    },
    script_a: variantA.script,
    script_b: variantB.script,
    imageGenerationStatus,
    audit_trail: auditTrail,
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
  const scenarioSetup = buildScenarioSetup(random, selectedTopic, chosenCast);
  const improvMenu = buildImprovMenu(random, selectedTopic, chosenCast, scenarioSetup);
  const title = makeComicTitle(selectedTopic);

  const promptBase = buildStandardPrompt({
    panelCount,
    cast: chosenCast,
    topic: selectedTopic,
    scenario: scenarioSetup,
    improvMenu,
  });

  const promptA = `${promptBase}\nVariant directive: prioritize crisp setup, exact terminology, and readable punchlines.`;
  const promptB = `${promptBase}\nVariant directive: prioritize sharper escalation, dry cruelty, and a stronger final reversal.`;

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
    scenario_setup: scenarioSetup,
    improv_menu: improvMenu,
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

  const model = env.TOPIC_MODEL || env.SCRIPT_MODEL_A || DEFAULT_TOPIC_MODEL;
  const systemPrompt = 'You are a technical humor prompt planner. Return JSON only: {"topics":["...", "...", "...", "...", "...", "..."]}';
  const userPrompt = [
    `Create 6 diverse comic topic candidates for an xkcd-style technical comic.`,
    `Panel count: ${panelCount}`,
    `Cast: ${cast.map((c) => `${c.name} (${c.role})`).join(', ')}`,
    `Character idea spaces: ${cast.flatMap((c) => c.idea_space || []).slice(0, 18).join(', ')}`,
    'Favor unusual but drawable technical situations: physicalized software artifacts, contradictory dashboards, awkward operational rituals, strange props, and specific failure modes.',
    'Avoid repeating postmortem/standup/cache/setup templates unless the topic has a fresh visual hook.',
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
      ? parsed.topics.map((topic: any) => String(topic).trim()).filter(Boolean).slice(0, 6)
      : [];

    if (topics.length >= 3) {
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

  while (selected.length < 6 && pool.length > 0) {
    const idx = Math.floor(random() * pool.length);
    selected.push(pool[idx]);
    pool.splice(idx, 1);
  }

  if (selected.length < 6) {
    while (selected.length < 6) {
      selected.push(`unexpected ${cast[0]?.name || 'robot'} behavior in production`);
    }
  }

  return selected;
}

function buildScenarioSetup(random: () => number, topic: string, cast: CastCharacter[]): ScenarioSetup {
  const base = SCENARIO_SETUPS[randomInt(random, 0, SCENARIO_SETUPS.length - 1)];
  const characterIdeas = cast.flatMap((character) => character.idea_space || []);
  const idea = characterIdeas.length > 0
    ? characterIdeas[randomInt(random, 0, characterIdeas.length - 1)]
    : topic;
  const prop = randomChoice(random, [
    base.prop,
    ...PROP_ENTROPY,
    ...cast.flatMap((character) => character.drawable_features || []),
  ]);
  const modifier = randomChoice(random, SCENARIO_MODIFIERS);
  const scenes = shuffle(random, [...base.sceneHints, ...pickExtraScenes(random)]);

  return {
    id: `${base.id}-${hashToUInt32(`${topic}:${prop}:${modifier}`).toString(16).slice(0, 6)}`,
    label: `${base.label}, ${modifier}`,
    sceneHints: scenes.slice(0, 4),
    prop,
    tension: `${base.tension}; pressure comes from ${idea}`
  };
}

function buildImprovMenu(random: () => number, topic: string, cast: CastCharacter[], scenario: ScenarioSetup): ComicImprovMenu {
  const optionalCharacters = cast
    .map((character) => character.id)
    .filter((id) => !['user', 'robot', 'ferris'].includes(id));
  const characterChoices = uniqueStrings([
    'user',
    'robot',
    ...shuffle(random, optionalCharacters).slice(0, 2),
  ]);
  const toolChoices = shuffle(random, [
    'shell history',
    'kubectl rollout',
    'readiness probe',
    'dependency resolver',
    'virtualenv',
    'systemd timer',
    'feature flag',
    'secret rotator',
    'packet capture',
    'cost dashboard',
    'runbook',
    'lockfile',
  ]).slice(0, 4);
  const subjectChoices = uniqueStrings(shuffle(random, [
    topic,
    scenario.tension,
    ...cast.flatMap((character) => character.idea_space || []),
  ]).slice(0, 4));
  const propChoices = uniqueStrings(shuffle(random, [
    scenario.prop,
    ...PROP_ENTROPY,
    ...cast.flatMap((character) => character.drawable_features || []),
  ]).slice(0, 5));
  const runningGags = shuffle(random, [
    'dashboard disagrees with terminal',
    'tiny helper becomes infrastructure',
    'fix works by hiding evidence',
    'root cause is visible in panel one',
    'manager renames failure as autonomy',
    'animal mascot notices the real bug',
    'the safest option is least impressive',
  ]).slice(0, 3);

  return {
    characters: characterChoices,
    tools: toolChoices,
    subjects: subjectChoices,
    props: propChoices,
    runningGags,
    cameoChoices: ['ferris'],
  };
}

function pickScriptModels(env: any, seedInput: string): [string, string] {
  const pinnedA = normalizeModelName(env.SCRIPT_MODEL_A || env.COMIC_MODEL_A || env.IMAGE_MODEL_A);
  const pinnedB = normalizeModelName(env.SCRIPT_MODEL_B || env.COMIC_MODEL_B || env.IMAGE_MODEL_B);

  if (pinnedA && pinnedB && pinnedA !== pinnedB) {
    return [pinnedA, pinnedB];
  }

  const lineup = parseModelLineup(env.SCRIPT_MODEL_LINEUP || env.COMIC_MODEL_LINEUP);
  const models = uniqueModels([
    ...(pinnedA ? [pinnedA] : []),
    ...(pinnedB ? [pinnedB] : []),
    ...lineup,
    ...DEFAULT_SCRIPT_MODEL_LINEUP,
    DEFAULT_SCRIPT_MODEL_A,
    DEFAULT_SCRIPT_MODEL_B,
  ]);

  if (models.length === 1) {
    return [models[0], models[0]];
  }

  const random = createSeededRng(hashToUInt32(`script-models:${seedInput}`));
  const firstIndex = randomInt(random, 0, models.length - 1);
  let secondIndex = randomInt(random, 0, models.length - 2);
  if (secondIndex >= firstIndex) secondIndex += 1;

  return [models[firstIndex], models[secondIndex]];
}

function parseModelLineup(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(normalizeModelName).filter(Boolean) as string[];
  }

  const raw = String(input || '').trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeModelName).filter(Boolean) as string[];
      }
    } catch {
      // Fall through to delimiter parsing.
    }
  }

  return raw
    .split(/[\n,]+/)
    .map(normalizeModelName)
    .filter(Boolean) as string[];
}

function uniqueModels(models: string[]): string[] {
  return [...new Set(models.map(normalizeModelName).filter(Boolean) as string[])];
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeModelName(input: unknown): string | undefined {
  const model = String(input || '').trim();
  return model || undefined;
}

async function generateScriptVariant(
  env: any,
  model: string,
  plan: ComicPlan,
  workflowLog: WorkflowStepLog[],
  stepName: string,
  variantDirective: string,
  fallbackModel?: string,
) {
  if (!env.AI) {
    throw new Error('Workers AI binding is required for comic script generation.');
  }

  try {
    const script = await generateComicScript({
      ai: env.AI,
      model,
      fallbackModel,
      day: plan.day,
      title: plan.title,
      topic: plan.selected_topic,
      panelCount: plan.panel_count,
      cast: plan.cast,
      variantDirective,
      improvMenu: plan.improv_menu,
    });
    workflowLog.push(makeStep(stepName, 'ok', `Generated scripted SVG comic with ${script.model}.`));
    return { script };
  } catch (err: any) {
    workflowLog.push(makeStep(stepName, 'error', `Comic script generation failed on ${model}: ${err.message || String(err)}`));
    throw err;
  }
}

function buildStandardPrompt(input: { panelCount: number; cast: CastCharacter[]; topic: string; scenario: ScenarioSetup; improvMenu: ComicImprovMenu; }): string {
  const castLines = input.cast.map((char, idx) => (
    `${idx + 1}. ${char.name} (${char.role})` +
    `\n   Description: ${char.description}` +
    `\n   Voice: ${char.voice}` +
    `\n   Visual cues: ${char.visual_traits.join(', ')}` +
    (char.behaviors?.length ? `\n   Character behaviors to use: ${char.behaviors.join('; ')}` : '') +
    (char.idea_space?.length ? `\n   Topic territory: ${char.idea_space.join(', ')}` : '') +
    (char.drawable_features?.length ? `\n   Drawable features: ${char.drawable_features.join(', ')}` : '') +
    `\n   Sample reference: ${char.sample_image}`
  )).join('\n');

  return [
    'Create a readable comic script that will be rendered to SVG.',
    'Series title: LLM DOES NOT COMPUTE.',
    'Style target: xkcd-inspired, dry systems humor, precise dialogue, no filler.',
    `Layout: exactly ${input.panelCount} panels.`,
    'Each panel should advance the joke and remain easy to typeset.',
    `Topic: ${input.topic}`,
    `Scenario setup: ${input.scenario.label}.`,
    `Scenario tension: ${input.scenario.tension}.`,
    `Required recurring visual motif or prop: ${input.scenario.prop}.`,
    `Preferred scene progression: ${input.scenario.sceneHints.join(' -> ')}.`,
    'Both model variants receive this same limited improv menu. Pick the funniest coherent subset instead of inventing from the full universe.',
    `Character choices: ${input.improvMenu.characters.join(', ')}.`,
    `Tool choices: ${input.improvMenu.tools.join(', ')}.`,
    `Subject choices: ${input.improvMenu.subjects.join(', ')}.`,
    `Prop choices: ${input.improvMenu.props.join(', ')}.`,
    `Running gag choices: ${input.improvMenu.runningGags.join(', ')}.`,
    `Cameo choices: ${input.improvMenu.cameoChoices.join(', ')}.`,
    'Entropy requirement: each panel needs a distinct visible prop or staging idea; do not solve every setup with a whiteboard, terminal, meeting, or status page.',
    'Character requirement: optional cast members must change the joke mechanics through their behaviors, not merely appear as labels.',
    'Recurring cast bible:',
    '- The User is a plain round-head stick figure who asks vague, underspecified questions.',
    '- The LLM Robot is a square-head stick figure with an antenna. Its internal monologue appears in a cloud thought bubble using a technical monospace style.',
    '- Simon is a BOFH sysadmin with square glasses, a fedora, and grey goatee. He is dry, cynical, and usually lands the correction or punchline.',
    '- The Boss wears a tie and talks like an AI hype manager.',
    '- Ferris is a silent crab cameo or panic signal in the background.',
    '- Tux is a Linux penguin: use host/filesystem/package/kernel pragmatism and draw penguin features.',
    '- Python is a snake: use dependency/runtime/notebook/indentation traps and draw a curving snake body.',
    '- Kubernetes Captain wears a pirate captain hat and has a peg leg: use pod/rollout/probe/YAML nautical command logic.',
    'Characters to include:',
    castLines,
    'Scene requirements:',
    '- The strip must include both the User and the LLM Robot.',
    '- Keep the robot internal monologue compact and monospace-friendly.',
    '- Keep Simon deadpan if Simon is present.',
    '- Use dry systems-thinking humor about failure modes, architecture, operations, or specification gaps.',
    '- Prefer concrete nouns: deploy, cache key, rollback, runbook, timeout, queue, incident.',
    '- Prefer concrete visual nouns beyond the usual set: lockfiles, keys, clocks, levers, invoices, manifests, buckets, probes, flags, receipts, labels.',
    '- Avoid generic "AI is weird" jokes.',
    '- No watermark, no sponsor copy, no unrelated text.'
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

function randomChoice<T>(rand: () => number, values: T[]): T {
  return values[randomInt(rand, 0, values.length - 1)];
}

function shuffle<T>(rand: () => number, values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rand, 0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function pickExtraScenes(rand: () => number): string[] {
  return shuffle(rand, ['terminal', 'whiteboard', 'incident_room', 'meeting', 'network', 'desk', 'plain']).slice(0, 2);
}

function hashToUInt32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
