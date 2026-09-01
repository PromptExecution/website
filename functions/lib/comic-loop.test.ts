import { describe, expect, test } from 'bun:test';
import {
  createFallbackPremiseRoom,
  decideScriptLoopAction,
  evaluateComicScript,
  rankPremises,
  selectDistinctPremises,
  chooseTrizInversion,
  generatePremiseRoom,
  type PremiseCandidate,
} from './comic-loop.ts';

function premise(overrides: Partial<PremiseCandidate> = {}): PremiseCandidate {
  return {
    id: 'candidate',
    mechanism: 'reversal',
    target: 'management',
    readerAssumption: 'Two approvals make a production deploy independent.',
    reveal: 'Both approval accounts invoke the same model.',
    finalReframe: 'The org chart treats usernames as independent reviewers.',
    visualPayoff: 'An approval dashboard connects two accounts to one model.',
    technicalAnchor: 'production deployment approval policy',
    ...overrides,
  };
}

describe('premise loop', () => {
  test('normalizes a model-generated writers room', async () => {
    const ai = {
      async run() {
        return {
          response: JSON.stringify({
            brief: {
              technicalTruth: 'Approvals require independent reviewers.',
              expectedBehavior: 'Two reviewers reduce correlated failure.',
              actualIncentive: 'The audit counts usernames.',
              contradiction: 'One model owns both usernames.',
              target: 'process',
              stakes: 'A deploy reaches production without independent review.',
              visualEvidence: 'Two approval badges connected to one model.',
              forbiddenMoves: ['Accurate.'],
            },
            premises: Array.from({ length: 4 }, (_, index) => ({
              id: `generated-${index}`,
              mechanism: index === 0 ? 'literalism' : 'visual_contradiction',
              target: index === 0 ? 'process' : 'management',
              readerAssumption: 'Two accounts mean two reviewers.',
              reveal: 'Both accounts call one model.',
              finalReframe: 'The audit tests spelling, not independence.',
              visualPayoff: 'An org chart connects two accounts to one model.',
              technicalAnchor: 'deployment approval audit',
            })),
          }),
        };
      },
    };
    const room = await generatePremiseRoom({
      ai,
      model: 'test-model',
      topic: 'independent deploy approvals',
      panelCount: 4,
      castSummary: 'Boss, Robot, User',
    });

    expect(room.premises).toHaveLength(4);
    expect(room.brief.target).toBe('process');
    expect(room.premises[0].technicalAnchor).toBe('deployment approval audit');
  });

  test('fallback room covers every supported mechanism', () => {
    const room = createFallbackPremiseRoom('deployment approval policy');
    expect(room.premises).toHaveLength(6);
    expect(new Set(room.premises.map((item) => item.mechanism)).size).toBe(6);
    expect(room.brief.contradiction).toContain('succeeds');
  });

  test('ranking penalizes stock closers and recent repetition', () => {
    const strong = premise({ id: 'strong' });
    const stale = premise({
      id: 'stale',
      finalReframe: 'Technically correct.',
      visualPayoff: 'Something funny happens.',
    });
    const ranked = rankPremises([stale, strong], {
      recentTitles: [],
      recentDialogue: ['Technically correct.'],
    });

    expect(ranked[0].candidate.id).toBe('strong');
    expect(ranked[1].issues).toContain('stock closer');
  });

  test('variant selection prefers a different mechanism and target', () => {
    const ranked = rankPremises([
      premise({ id: 'first' }),
      premise({ id: 'same-shape', mechanism: 'reversal', target: 'management' }),
      premise({
        id: 'distinct',
        mechanism: 'visual_contradiction',
        target: 'process',
        finalReframe: 'The empty result table is the only honest field.',
      }),
    ]);
    const selected = selectDistinctPremises(ranked, 2);

    expect(selected).toHaveLength(2);
    expect(selected[0].candidate.mechanism).not.toBe(selected[1].candidate.mechanism);
    expect(selected[0].candidate.target).not.toBe(selected[1].candidate.target);
  });
});

describe('script loop', () => {
  test('accepts a compressed, specific script with a visual reframe', () => {
    const evaluation = evaluateComicScript({
      title: 'Open Book',
      panels: [
        { speaker: 'boss', dialogue: 'The model scored 100% on the eval.' },
        { speaker: 'robot', robotThought: '> answer key found\n> generalization complete', action: 'eval file on terminal' },
        { speaker: 'user', dialogue: 'It found the answers in Git.' },
        { speaker: 'simon', dialogue: "Promote grep. It's cheaper." },
      ],
    }, { technicalAnchor: 'model evaluation repository' });

    expect(evaluation.passed).toBe(true);
    expect(decideScriptLoopAction(evaluation, 0)).toBe('accept');
  });

  test('rejects a stock confirmation and advances through bounded retries', () => {
    const evaluation = evaluateComicScript({
      title: 'Deployment',
      panels: [
        { speaker: 'user', dialogue: 'Is the deploy okay?' },
        { speaker: 'robot', dialogue: 'The dashboard is green.' },
        { speaker: 'simon', dialogue: 'Accurate.' },
      ],
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.issues.some((issue) => issue.includes('stock closer'))).toBe(true);
    expect(decideScriptLoopAction(evaluation, 0)).toBe('rewrite');
    expect(decideScriptLoopAction(evaluation, 1)).toBe('invert');
    expect(decideScriptLoopAction(evaluation, 2)).toBe('reject');
    expect(chooseTrizInversion(evaluation)).toContain('silent visual consequence');
  });
});
