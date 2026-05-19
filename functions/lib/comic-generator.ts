import type { CastCharacter } from './cast.ts';

export interface ComicPanel {
  panelNumber: number;
  speaker: string;
  dialogue?: string;
  robotThought?: string;
  action?: string;
  pose?: string;
  scene?: ComicScene;
  beat?: ComicBeat;
  visualFocus?: string;
  expression?: ComicExpression;
  cameo?: string;
}

export interface ComicScript {
  title: string;
  panels: ComicPanel[];
  day: string;
  model: string;
}

export type ComicScene = 'terminal' | 'whiteboard' | 'incident_room' | 'meeting' | 'network' | 'desk' | 'plain';
export type ComicBeat = 'setup' | 'escalation' | 'reversal' | 'callback' | 'punchline' | 'silent';
export type ComicExpression = 'neutral' | 'confused' | 'worried' | 'deadpan' | 'smug' | 'panicked' | 'annoyed' | 'delighted' | 'thinking' | 'blank';

const COMIC_SCENES: ComicScene[] = ['terminal', 'whiteboard', 'incident_room', 'meeting', 'network', 'desk', 'plain'];
const COMIC_BEATS: ComicBeat[] = ['setup', 'escalation', 'reversal', 'callback', 'punchline', 'silent'];
const COMIC_EXPRESSIONS: ComicExpression[] = ['neutral', 'confused', 'worried', 'deadpan', 'smug', 'panicked', 'annoyed', 'delighted', 'thinking', 'blank'];

const CHARACTER_EXPRESSION_GUIDE: Record<string, ComicExpression[]> = {
  user: ['confused', 'worried', 'thinking', 'panicked', 'neutral'],
  robot: ['thinking', 'smug', 'confused', 'panicked', 'blank'],
  simon: ['deadpan', 'annoyed', 'smug', 'neutral'],
  boss: ['smug', 'delighted', 'panicked', 'annoyed', 'neutral'],
  ferris: ['panicked', 'annoyed', 'delighted', 'blank'],
  tux: ['neutral', 'thinking', 'deadpan', 'worried', 'delighted'],
  python: ['smug', 'thinking', 'confused', 'delighted', 'worried'],
  kube_captain: ['smug', 'panicked', 'annoyed', 'delighted', 'thinking'],
};

interface GenerateComicScriptOptions {
  ai: any;
  model: string;
  day: string;
  title: string;
  topic: string;
  panelCount: number;
  cast: CastCharacter[];
  variantDirective: string;
  improvMenu?: ComicImprovMenu;
  fallbackModel?: string;
}

export interface ComicImprovMenu {
  characters: string[];
  tools: string[];
  subjects: string[];
  props: string[];
  runningGags: string[];
  cameoChoices: string[];
}

const JSON_MODE_MODELS = new Set([
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
]);

export async function generateComicScript(options: GenerateComicScriptOptions): Promise<ComicScript> {
  try {
    return await generateComicScriptOnce(options);
  } catch (err) {
    if (options.fallbackModel && options.fallbackModel !== options.model) {
      try {
        return await generateComicScriptOnce({
          ...options,
          model: options.fallbackModel,
          fallbackModel: undefined,
        });
      } catch (fallbackErr) {
        console.error('Comic script generation fallback failed:', fallbackErr);
        return buildFallbackComicScript(options, `${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`);
      }
    }

    console.error('Comic script generation failed:', err);
    return buildFallbackComicScript(options, `${err instanceof Error ? err.message : String(err)}`);
  }
}

async function generateComicScriptOnce(options: GenerateComicScriptOptions): Promise<ComicScript> {
  const systemPrompt = [
    'You are the head writer for "LLM DOES NOT COMPUTE", a dry, technically accurate webcomic.',
    'Return only JSON.',
    'The comic must be funny because the dialogue is sharp and specific, not because the characters explain the joke.',
    'Keep language sparse and punchy. No rambling setup.',
    'Avoid generic AI hype language, vague corporate filler, and repeated punchlines.',
    'Each panel should move the joke forward.',
    'The final panel must land a deadpan punchline or brutal correction.',
  ].join(' ');

  const castGuide = options.cast.map((character) => (
    [
      `- ${character.id}: ${character.name}. Role: ${character.role}. Voice: ${character.voice}. Description: ${character.description}.`,
      `  Available expressions: ${getAllowedExpressions(character.id).join(', ')}.`,
      character.behaviors?.length ? `  Behaviors: ${character.behaviors.join('; ')}.` : '',
      character.idea_space?.length ? `  Idea space: ${character.idea_space.join(', ')}.` : '',
      character.drawable_features?.length ? `  Drawable features: ${character.drawable_features.join(', ')}.` : '',
    ].filter(Boolean).join('\n')
  )).join('\n');
  const allowedSpeakers = uniqueStrings(['user', 'robot', ...options.cast.map((character) => character.id)]);
  const improvMenu = options.improvMenu ? formatImprovMenu(options.improvMenu) : '';

  const userPrompt = [
    `Write a ${options.panelCount}-panel comic script for day ${options.day}.`,
    `Title: ${options.title}`,
    `Topic: ${options.topic}`,
    `Variant direction: ${options.variantDirective}`,
    'Cast in scope:',
    castGuide,
    improvMenu ? 'Shared improv menu for both competing models:' : '',
    improvMenu,
    'Rules:',
    '- You are competing against another model on the same limited improv menu. Pick the funniest coherent subset; do not try to use every item.',
    '- Choose characters, tools, subjects, props, and running gags from the shared improv menu when it is provided.',
    '- Maintain continuity: reuse one chosen subject and one chosen visual motif across the strip, with escalation.',
    '- Include the User and the Robot somewhere in the strip.',
    '- At least one panel must contain the robot internal monologue in `robotThought`.',
    '- Keep every dialogue line short: target 4-10 words and never more than 65 characters.',
    '- Keep every robotThought block under 3 short lines.',
    '- Avoid verbose panel narration. `action` should be 2-6 words only (pose note, not a sentence).',
    '- Assign every panel a `scene` and `beat`; vary scenes unless the joke needs repetition.',
    '- Use `visualFocus` for one concrete visible prop, artifact, diagram, or physical gag, 2-5 words.',
    '- Do not reuse the same scene type, prop category, or character reaction pattern across panels unless it is the joke.',
    '- Every optional character should contribute a specific behavior from the cast guide, not just stand in the background.',
    '- Assign every panel an `expression` chosen from that character\'s available expressions.',
    '- Use `cameo` only for a non-speaking visual cameo from cameo choices, especially ferris when available.',
    '- Ferris is usually a silent cameo, not the main speaker.',
    '- Return valid JSON with keys: title, panels.',
    '- panels must be an array of objects using: panelNumber, speaker, dialogue?, robotThought?, action?, pose?, scene?, beat?, visualFocus?, expression?, cameo?.',
    '- pose should be one of: neutral, leaning, pointing, facepalm, slumped, hands_up, typing, smug, uncertain, deadpan.',
    `- scene should be one of: ${COMIC_SCENES.join(', ')}.`,
    `- beat should be one of: ${COMIC_BEATS.join(', ')}.`,
    `- expression should be one of: ${COMIC_EXPRESSIONS.join(', ')}.`,
    `- speaker must be one of: ${allowedSpeakers.join(', ')}.`,
    '- Do not wrap the JSON in markdown.',
  ].join('\n');

  const request: Record<string, unknown> = {
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1400,
    temperature: 0.9,
  };

  if (JSON_MODE_MODELS.has(options.model)) {
    request.response_format = {
      type: 'json_schema',
      json_schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          panels: {
            type: 'array',
            minItems: options.panelCount,
            maxItems: options.panelCount,
            items: {
              type: 'object',
              properties: {
                panelNumber: { type: 'integer' },
                speaker: { type: 'string' },
                dialogue: { type: 'string' },
                robotThought: { type: 'string' },
                action: { type: 'string' },
                pose: { type: 'string' },
                scene: { type: 'string' },
                beat: { type: 'string' },
                visualFocus: { type: 'string' },
                expression: { type: 'string' },
                cameo: { type: 'string' },
              },
              required: ['panelNumber', 'speaker'],
              additionalProperties: false,
            },
          },
        },
        required: ['title', 'panels'],
        additionalProperties: false,
      },
    };
  }

  const response = await options.ai.run(options.model, request);
  const raw = extractModelPayload(response);
  const parsed = typeof raw === 'string' ? parseJsonFromText(raw) : raw;

  if (!parsed) {
    throw new Error(`Model ${options.model} returned no parseable JSON`);
  }

  return normalizeComicScript(parsed, options);
}

function extractModelPayload(response: any): unknown {
  if (response?.response && typeof response.response === 'object') {
    return response.response;
  }

  if (typeof response?.response === 'string') {
    return response.response;
  }

  if (typeof response === 'string') {
    return response;
  }

  return response;
}

function normalizeComicScript(raw: any, options: GenerateComicScriptOptions): ComicScript {
  const panels = Array.isArray(raw?.panels) ? raw.panels : [];
  const normalizedPanels: ComicPanel[] = [];

  for (let index = 0; index < options.panelCount; index += 1) {
    const panel = panels[index] || {};
    const speaker = normalizeSpeaker(panel.speaker, options.cast);
    const dialogue = sanitizeLine(panel.dialogue, 65);
    const robotThought = sanitizeThought(panel.robotThought);
    const action = sanitizeAction(panel.action);
    const pose = sanitizePose(panel.pose, panel.action, speaker);
    const scene = sanitizeScene(panel.scene, action, dialogue, robotThought);
    const beat = sanitizeBeat(panel.beat, index, options.panelCount);
    const visualFocus = sanitizeVisualFocus(panel.visualFocus, scene, action);
    const expression = sanitizeExpression(panel.expression, speaker, pose, robotThought, dialogue);
    const cameo = sanitizeCameo(panel.cameo, speaker, options);

    normalizedPanels.push({
      panelNumber: index + 1,
      speaker,
      dialogue,
      robotThought,
      action,
      pose,
      scene,
      beat,
      visualFocus,
      expression,
      cameo,
    });
  }

  if (!normalizedPanels.some((panel) => panel.robotThought)) {
    const robotPanel = normalizedPanels.find((panel) => panel.speaker === 'robot') || normalizedPanels[1] || normalizedPanels[0];
    robotPanel.speaker = 'robot';
    robotPanel.robotThought = '> parsing punchline\n> confidence: 0.61\n> ship it anyway';
  }

  if (!normalizedPanels.some((panel) => panel.dialogue)) {
    normalizedPanels[0].speaker = 'user';
    normalizedPanels[0].dialogue = 'Did prod recover?';
    normalizedPanels[normalizedPanels.length - 1].speaker = 'simon';
    normalizedPanels[normalizedPanels.length - 1].dialogue = 'Graphs recovered. Production did not.';
  }

  return {
    title: sanitizeLine(raw?.title, 120) || options.title,
    panels: normalizedPanels,
    day: options.day,
    model: options.model,
  };
}

function normalizeSpeaker(input: unknown, cast: CastCharacter[]): string {
  const value = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = new Set(['user', 'robot', ...cast.map((item) => item.id)]);

  if (allowed.has(value)) return value;
  if (['human', 'developer', 'customer', 'founder'].includes(value)) return 'user';
  if (['assistant', 'llm', 'bot'].includes(value)) return 'robot';
  if (['manager', 'executive'].includes(value)) return 'boss';
  if (['admin', 'sysadmin', 'operator'].includes(value)) return 'simon';
  if (['crab'].includes(value)) return 'ferris';
  if (['linux', 'penguin'].includes(value)) return 'tux';
  if (['snake', 'python_snake', 'py'].includes(value)) return 'python';
  if (['kubernetes', 'k8s', 'captain', 'kube'].includes(value)) return 'kube_captain';
  return 'user';
}

function sanitizeLine(input: unknown, maxLength = 65): string | undefined {
  if (typeof input !== 'string') return undefined;
  const clean = input.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return truncateAtWord(clean, maxLength);
}

function sanitizeThought(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const lines = input
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => (line.startsWith('>') ? line : `> ${line}`))
    .map((line) => truncateAtWord(line, 34));

  if (lines.length === 0) return undefined;
  return lines.join('\n');
}

function sanitizeAction(input: unknown): string | undefined {
  const clean = sanitizeLine(input, 46);
  if (!clean) return undefined;
  const words = clean.split(' ').filter(Boolean);
  if (words.length > 8) return undefined;
  return clean;
}

function sanitizeVisualFocus(input: unknown, scene: ComicScene, action: string | undefined): string {
  const clean = sanitizeLine(input, 34);
  if (clean) return clean;
  if (action) return action;

  const defaults: Record<ComicScene, string> = {
    terminal: 'terminal output',
    whiteboard: 'wrong diagram',
    incident_room: 'incident clock',
    meeting: 'status table',
    network: 'packet path',
    desk: 'keyboard',
    plain: 'blank expression',
  };
  return defaults[scene];
}

function sanitizeExpression(input: unknown, speaker: string, pose?: string, robotThought?: string, dialogue?: string): ComicExpression {
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const allowed = getAllowedExpressions(speaker);
  if ((allowed as string[]).includes(raw)) return raw as ComicExpression;
  if ((COMIC_EXPRESSIONS as string[]).includes(raw)) return raw as ComicExpression;

  const hint = `${pose || ''} ${robotThought || ''} ${dialogue || ''}`.toLowerCase();
  if (/\bpanic|fail|outage|sev|fire|rollback|broken\b/.test(hint)) return allowed.includes('panicked') ? 'panicked' : allowed[0];
  if (/\bthink|parse|trace|debug|why|how\b/.test(hint)) return allowed.includes('thinking') ? 'thinking' : allowed[0];
  if (/\bconfus|uncertain|maybe|what\b/.test(hint)) return allowed.includes('confused') ? 'confused' : allowed[0];
  if (/\bsmug|yes|success|autonomous\b/.test(hint)) return allowed.includes('smug') ? 'smug' : allowed[0];
  if (speaker === 'simon') return 'deadpan';
  if (speaker === 'boss') return 'smug';
  if (speaker === 'robot') return 'thinking';
  if (speaker === 'tux') return 'deadpan';
  if (speaker === 'python') return 'smug';
  if (speaker === 'kube_captain') return 'smug';
  return allowed[0] || 'neutral';
}

function sanitizeCameo(input: unknown, speaker: string, options: GenerateComicScriptOptions): string | undefined {
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!raw || raw === speaker || raw === 'none') return undefined;
  const cameoChoices = new Set(options.improvMenu?.cameoChoices || ['ferris']);
  if (cameoChoices.has(raw)) return raw;
  if (raw === 'crab' && cameoChoices.has('ferris')) return 'ferris';
  return undefined;
}

function getAllowedExpressions(speaker: string): ComicExpression[] {
  return CHARACTER_EXPRESSION_GUIDE[speaker] || COMIC_EXPRESSIONS;
}

function sanitizePose(input: unknown, action: unknown, speaker: string): string | undefined {
  const allowed = new Set([
    'neutral',
    'leaning',
    'pointing',
    'facepalm',
    'slumped',
    'hands_up',
    'typing',
    'smug',
    'uncertain',
    'deadpan',
  ]);
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (allowed.has(raw)) return raw;

  const hint = String(action || '').toLowerCase();
  if (/\btype|typing|keyboard|terminal|laptop|screen\b/.test(hint)) return 'typing';
  if (/\bpoint|pointing\b/.test(hint)) return 'pointing';
  if (/\bfacepalm\b/.test(hint)) return 'facepalm';
  if (/\bslump|slouched|deflated\b/.test(hint)) return 'slumped';
  if (/\bhands up|arms up|panic\b/.test(hint)) return 'hands_up';
  if (speaker === 'simon') return 'deadpan';
  if (speaker === 'robot') return 'uncertain';
  if (speaker === 'kube_captain') return 'pointing';
  if (speaker === 'python') return 'leaning';
  return 'neutral';
}

function sanitizeScene(input: unknown, action?: string, dialogue?: string, robotThought?: string): ComicScene {
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((COMIC_SCENES as string[]).includes(raw)) return raw as ComicScene;

  const hint = `${action || ''} ${dialogue || ''} ${robotThought || ''}`.toLowerCase();
  if (/\bwhiteboard|diagram|arrow|architecture|box|flow|schema|chart\b/.test(hint)) return 'whiteboard';
  if (/\bincident|outage|pager|status|sev|war room|rollback|postmortem\b/.test(hint)) return 'incident_room';
  if (/\bmeeting|standup|roadmap|kpi|slide|stakeholder|executive\b/.test(hint)) return 'meeting';
  if (/\bdns|tcp|packet|cache|cdn|api|queue|service|network\b/.test(hint)) return 'network';
  if (/\bterminal|shell|deploy|build|compile|keyboard|monitor|logs?|ssh|kubectl|merge|commit|branch|prod|production|code\b/.test(hint)) return 'terminal';
  if (/\bdesk|laptop|coffee|keyboard|chair\b/.test(hint)) return 'desk';
  return 'plain';
}

function sanitizeBeat(input: unknown, index: number, panelCount: number): ComicBeat {
  const raw = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((COMIC_BEATS as string[]).includes(raw)) return raw as ComicBeat;
  if (index === 0) return 'setup';
  if (index === panelCount - 1) return 'punchline';
  if (index === panelCount - 2) return 'reversal';
  return 'escalation';
}

function buildFallbackComicScript(options: GenerateComicScriptOptions, error: string): ComicScript {
  const castIds = new Set(options.cast.map((character) => character.id));
  const optionalCloser = ['simon', 'tux', 'python', 'kube_captain', 'boss'].find((id) => castIds.has(id)) || 'user';

  const fallbackPanels: ComicPanel[] = [
    { panelNumber: 1, speaker: 'user', dialogue: `Can we rebuild ${options.topic}?`, pose: 'pointing', scene: 'whiteboard', beat: 'setup', visualFocus: 'architecture sketch', expression: 'confused' },
    { panelNumber: 2, speaker: 'robot', robotThought: '> rewriting premise\n> preserving punchline\n> no gibberish', pose: 'typing', scene: 'terminal', beat: 'escalation', visualFocus: 'log tail', expression: 'thinking' },
    { panelNumber: 3, speaker: castIds.has('kube_captain') ? 'kube_captain' : 'robot', dialogue: castIds.has('kube_captain') ? 'The pods mutinied politely.' : 'Yes. Words are readable now.', pose: 'smug', scene: 'incident_room', beat: 'reversal', visualFocus: 'incident timer', expression: 'smug' },
    { panelNumber: 4, speaker: optionalCloser, dialogue: fallbackCloserLine(optionalCloser), pose: optionalCloser === 'kube_captain' ? 'pointing' : 'deadpan', scene: 'meeting', beat: 'punchline', visualFocus: fallbackVisualFocus(optionalCloser), expression: fallbackExpression(optionalCloser) },
  ].slice(0, options.panelCount);

  while (fallbackPanels.length < options.panelCount) {
    fallbackPanels.splice(fallbackPanels.length - 1, 0, {
      panelNumber: fallbackPanels.length,
      speaker: 'user',
      dialogue: 'So we stopped asking image models to typeset?',
      pose: 'leaning',
      scene: 'desk',
      beat: 'callback',
      visualFocus: 'keyboard',
      expression: 'thinking',
      cameo: castIds.has('ferris') ? 'ferris' : undefined,
    });
  }

  fallbackPanels.forEach((panel, index) => {
    panel.panelNumber = index + 1;
  });

  return {
    title: `${options.title}${error ? ' [fallback]' : ''}`,
    day: options.day,
    model: `${options.model} (fallback script)`,
    panels: fallbackPanels,
  };
}

function fallbackCloserLine(speaker: string): string {
  const lines: Record<string, string> = {
    simon: 'Low bar. Still progress.',
    tux: 'Check the host first.',
    python: 'Tiny scripts grow teeth.',
    kube_captain: 'That is not a rollout. That is a boarding action.',
    boss: 'Can we call that autonomous?',
  };
  return lines[speaker] || 'That explains the outage.';
}

function fallbackVisualFocus(speaker: string): string {
  const focus: Record<string, string> = {
    tux: 'permission bit',
    python: 'dependency knot',
    kube_captain: 'mutinying pods',
    boss: 'KPI slide',
    simon: 'empty KPI chart',
  };
  return focus[speaker] || 'root cause';
}

function fallbackExpression(speaker: string): ComicExpression {
  const expressions: Record<string, ComicExpression> = {
    tux: 'deadpan',
    python: 'smug',
    kube_captain: 'annoyed',
    boss: 'smug',
    simon: 'deadpan',
  };
  return expressions[speaker] || 'neutral';
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function formatImprovMenu(menu: ComicImprovMenu): string {
  return [
    `- Character choices: ${menu.characters.join(', ')}`,
    `- Tool choices: ${menu.tools.join(', ')}`,
    `- Subject choices: ${menu.subjects.join(', ')}`,
    `- Prop choices: ${menu.props.join(', ')}`,
    `- Running gag choices: ${menu.runningGags.join(', ')}`,
    `- Cameo choices: ${menu.cameoChoices.join(', ')}`,
  ].join('\n');
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

function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const clipped = text.slice(0, maxLength);
  const boundary = clipped.lastIndexOf(' ');
  if (boundary < 10) return clipped.trim();
  return clipped.slice(0, boundary).trim();
}
