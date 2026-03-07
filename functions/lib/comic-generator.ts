import type { CastCharacter } from './cast.ts';

export interface ComicPanel {
  panelNumber: number;
  speaker: string;
  dialogue?: string;
  robotThought?: string;
  action?: string;
  pose?: string;
}

export interface ComicScript {
  title: string;
  panels: ComicPanel[];
  day: string;
  model: string;
}

interface GenerateComicScriptOptions {
  ai: any;
  model: string;
  day: string;
  title: string;
  topic: string;
  panelCount: number;
  cast: CastCharacter[];
  variantDirective: string;
  fallbackModel?: string;
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
    `- ${character.id}: ${character.name}. Role: ${character.role}. Voice: ${character.voice}. Description: ${character.description}.`
  )).join('\n');

  const userPrompt = [
    `Write a ${options.panelCount}-panel comic script for day ${options.day}.`,
    `Title: ${options.title}`,
    `Topic: ${options.topic}`,
    `Variant direction: ${options.variantDirective}`,
    'Cast in scope:',
    castGuide,
    'Rules:',
    '- Include the User and the Robot somewhere in the strip.',
    '- At least one panel must contain the robot internal monologue in `robotThought`.',
    '- Keep every dialogue line short: target 4-10 words and never more than 65 characters.',
    '- Keep every robotThought block under 3 short lines.',
    '- Avoid verbose panel narration. `action` should be 2-6 words only (pose note, not a sentence).',
    '- Ferris is usually a silent cameo, not the main speaker.',
    '- Return valid JSON with keys: title, panels.',
    '- panels must be an array of objects using: panelNumber, speaker, dialogue?, robotThought?, action?, pose?.',
    '- pose should be one of: neutral, leaning, pointing, facepalm, slumped, hands_up, typing, smug, uncertain, deadpan.',
    '- speaker must be one of: user, robot, simon, boss, ferris.',
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

    normalizedPanels.push({
      panelNumber: index + 1,
      speaker,
      dialogue,
      robotThought,
      action,
      pose,
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
  const value = String(input || '').trim().toLowerCase();
  const allowed = new Set(['user', 'robot', 'simon', 'boss', 'ferris', ...cast.map((item) => item.id)]);

  if (allowed.has(value)) return value;
  if (['human', 'developer', 'customer', 'founder'].includes(value)) return 'user';
  if (['assistant', 'llm', 'bot'].includes(value)) return 'robot';
  if (['manager', 'executive'].includes(value)) return 'boss';
  if (['admin', 'sysadmin', 'operator'].includes(value)) return 'simon';
  if (['crab'].includes(value)) return 'ferris';
  return 'user';
}

function sanitizeLine(input: unknown, maxLength = 65): string | undefined {
  if (typeof input !== 'string') return undefined;
  const clean = input.replace(/\s+/g, ' ').trim();
  if (!clean) return undefined;
  return clean.slice(0, maxLength);
}

function sanitizeThought(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const lines = input
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => (line.startsWith('>') ? line : `> ${line}`))
    .map((line) => line.slice(0, 34));

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
  return 'neutral';
}

function buildFallbackComicScript(options: GenerateComicScriptOptions, error: string): ComicScript {
  const castIds = new Set(options.cast.map((character) => character.id));
  const closer = castIds.has('simon') ? 'simon' : 'boss';

  const fallbackPanels: ComicPanel[] = [
    { panelNumber: 1, speaker: 'user', dialogue: `Can we rebuild ${options.topic}?`, pose: 'pointing' },
    { panelNumber: 2, speaker: 'robot', robotThought: '> rewriting premise\n> preserving punchline\n> no gibberish', pose: 'typing' },
    { panelNumber: 3, speaker: 'robot', dialogue: 'Yes. Words are readable now.', pose: 'smug' },
    { panelNumber: 4, speaker: closer, dialogue: 'Low bar. Still progress.', pose: 'deadpan' },
  ].slice(0, options.panelCount);

  while (fallbackPanels.length < options.panelCount) {
    fallbackPanels.splice(fallbackPanels.length - 1, 0, {
      panelNumber: fallbackPanels.length,
      speaker: 'user',
      dialogue: 'So we stopped asking image models to typeset?',
      pose: 'leaning',
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
