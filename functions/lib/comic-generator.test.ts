import { describe, expect, test } from 'bun:test';
import castData from '../../cast/characters.ts';
import { evaluateComicScript } from './comic-loop.ts';
import { generateComicScript, rewriteComicScript, type GenerateComicScriptOptions } from './comic-generator.ts';

function options(ai: any): GenerateComicScriptOptions {
  return {
    ai,
    model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    day: '2026-07-22',
    title: 'Open Book',
    topic: 'evaluation answer leakage',
    panelCount: 3,
    cast: castData.slice(0, 3).map((character) => ({ ...character, visual_traits: [...character.visual_traits] })),
    variantDirective: 'Use a visual contradiction.',
  };
}

describe('comic script generation loop', () => {
  test('does not inject a mandatory robot thought when the draft omits one', async () => {
    const ai = {
      async run() {
        return {
          response: {
            title: 'Open Book',
            panels: [
              { panelNumber: 1, speaker: 'user', dialogue: 'The model aced the eval.' },
              { panelNumber: 2, speaker: 'robot', dialogue: 'The answers were in Git.', action: 'points at eval file' },
              { panelNumber: 3, speaker: 'simon', dialogue: "Promote grep. It's cheaper." },
            ],
          },
        };
      },
    };
    const script = await generateComicScript(options(ai));

    expect(script.panels.every((panel) => panel.robotThought === undefined)).toBe(true);
  });

  test('passes the selected TRIZ inversion into a rewrite request', async () => {
    let rewritePrompt = '';
    const ai = {
      async run(_model: string, request: any) {
        rewritePrompt = request.messages[1].content;
        return {
          response: {
            title: 'Open Book',
            panels: [
              { panelNumber: 1, speaker: 'boss', dialogue: 'The model aced the eval.' },
              { panelNumber: 2, speaker: 'robot', action: 'shows eval file', screenText: 'tests/evals.json\nSCORE 100%' },
              { panelNumber: 3, speaker: 'simon', dialogue: "Promote grep. It's cheaper." },
            ],
          },
        };
      },
    };
    const draft = {
      title: 'Open Book',
      day: '2026-07-22',
      model: 'test-model',
      panels: [
        { panelNumber: 1, speaker: 'user', dialogue: 'Did the eval pass?' },
        { panelNumber: 2, speaker: 'robot', dialogue: 'Yes.' },
        { panelNumber: 3, speaker: 'simon', dialogue: 'Accurate.' },
      ],
    };
    const evaluation = evaluateComicScript(draft);
    const inversion = 'Invert spoken explanation into a silent visual consequence.';
    const rewritten = await rewriteComicScript(options(ai), draft, evaluation, inversion);

    expect(rewritePrompt).toContain(`Required inversion: ${inversion}`);
    expect(rewritten.panels[1].dialogue).toBeUndefined();
    expect(rewritten.panels[1].action).toBe('shows eval file');
    expect(rewritten.panels[1].screenText).toBe('tests/evals.json\nSCORE 100%');
  });
});
