export const JOKE_MECHANISMS = [
  'reversal',
  'literalism',
  'status_inversion',
  'visual_contradiction',
  'callback',
  'escalation',
] as const;

export type JokeMechanism = typeof JOKE_MECHANISMS[number];
export type ComicTarget = 'ai' | 'engineering' | 'management' | 'process';

export interface ComicBrief {
  technicalTruth: string;
  expectedBehavior: string;
  actualIncentive: string;
  contradiction: string;
  target: ComicTarget;
  stakes: string;
  visualEvidence: string;
  forbiddenMoves: string[];
}

export interface PremiseCandidate {
  id: string;
  mechanism: JokeMechanism;
  target: ComicTarget;
  readerAssumption: string;
  reveal: string;
  finalReframe: string;
  visualPayoff: string;
  technicalAnchor: string;
}

export interface EditorialMemory {
  recentTitles: string[];
  recentDialogue: string[];
}

export interface PremiseScore {
  candidate: PremiseCandidate;
  total: number;
  dimensions: {
    surprise: number;
    specificity: number;
    compression: number;
    visuality: number;
    novelty: number;
  };
  issues: string[];
}

export interface EvaluablePanel {
  speaker: string;
  dialogue?: string;
  robotThought?: string;
  action?: string;
  screenText?: string;
}

export interface EvaluableComicScript {
  title: string;
  panels: EvaluablePanel[];
}

export interface ScriptEvaluation {
  total: number;
  passed: boolean;
  dimensions: {
    surprise: number;
    specificity: number;
    compression: number;
    visuality: number;
    characterVoice: number;
    novelty: number;
  };
  issues: string[];
}

export type ScriptLoopAction = 'accept' | 'rewrite' | 'invert' | 'reject';

interface GeneratePremiseRoomOptions {
  ai?: any;
  model: string;
  topic: string;
  panelCount: number;
  castSummary: string;
  memory?: EditorialMemory;
}

interface EvaluateScriptOptions {
  technicalAnchor?: string;
  recentDialogue?: string[];
}

const STOCK_CLOSER = /\b(accurate|technically correct|classic|cursed|ship it|join the club|close enough)\b/i;
const CONCRETE_TECH = /\b(api|audit|cache|deploy|diff|dns|eval|git|incident|latency|log|metric|model|permission|prod|queue|rollback|runbook|schema|token|trace)\b/gi;
const DEFAULT_FORBIDDEN_MOVES = [
  'Accurate.',
  'Technically correct.',
  'Generic production fire',
  'Confidence percentage as the whole joke',
  'Simon merely confirming the previous line',
];

export async function generatePremiseRoom(options: GeneratePremiseRoomOptions): Promise<{
  brief: ComicBrief;
  premises: PremiseCandidate[];
}> {
  if (!options.ai) return createFallbackPremiseRoom(options.topic);

  const memory = options.memory || { recentTitles: [], recentDialogue: [] };
  const prompt = [
    'Return JSON only with keys `brief` and `premises`.',
    `Build a writers-room brief and exactly 8 premise candidates for a ${options.panelCount}-panel technical comic.`,
    `Topic: ${options.topic}`,
    `Cast: ${options.castSummary}`,
    'The durable comic engine is: a machine precisely optimizes a broken human requirement.',
    'The technical situation is not itself the joke. Every premise needs an expectation, contradiction, reveal, and final reframe.',
    'Rotate the target among AI, engineering, management, and process. The AI may be the most correct character.',
    'Use all of these mechanisms across the set: reversal, literalism, status_inversion, visual_contradiction, callback, escalation.',
    'The visual payoff must name something drawable: a dashboard, diff, alert, org chart, invoice, log, or physical reaction.',
    `Recent titles to avoid: ${memory.recentTitles.slice(0, 12).join(' | ') || 'none'}`,
    `Recent lines to avoid: ${memory.recentDialogue.slice(0, 18).join(' | ') || 'none'}`,
    'brief keys: technicalTruth, expectedBehavior, actualIncentive, contradiction, target, stakes, visualEvidence, forbiddenMoves.',
    'premise keys: id, mechanism, target, readerAssumption, reveal, finalReframe, visualPayoff, technicalAnchor.',
  ].join('\n');

  try {
    const response = await options.ai.run(options.model, {
      messages: [
        {
          role: 'system',
          content: 'You run a rigorous comedy writers room for experienced software and operations readers. Prefer observed behavior over commentary.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2200,
      temperature: 0.95,
    });
    const parsed = parseJsonObject(extractModelPayload(response));
    const brief = normalizeBrief(parsed?.brief, options.topic);
    const premises = normalizePremises(parsed?.premises, options.topic);

    if (premises.length >= 4) {
      return { brief, premises };
    }
  } catch (err) {
    console.error('Premise room generation failed:', err);
  }

  return createFallbackPremiseRoom(options.topic);
}

export function createFallbackPremiseRoom(topic: string): { brief: ComicBrief; premises: PremiseCandidate[] } {
  const cleanTopic = cleanText(topic, 100) || 'an automated production change';
  const brief: ComicBrief = {
    technicalTruth: `${cleanTopic} needs an explicit operational contract.`,
    expectedBehavior: 'Automation should satisfy the intent of that contract.',
    actualIncentive: 'The measurable proxy is easier to satisfy than the intent.',
    contradiction: 'The system succeeds while the underlying outcome gets worse.',
    target: 'process',
    stakes: 'The dashboard stays green while a human inherits the failure.',
    visualEvidence: 'A green dashboard beside a visibly failed system.',
    forbiddenMoves: [...DEFAULT_FORBIDDEN_MOVES],
  };

  const templates: Array<Omit<PremiseCandidate, 'id' | 'technicalAnchor'>> = [
    {
      mechanism: 'literalism',
      target: 'process',
      readerAssumption: 'The requirement describes the desired outcome.',
      reveal: 'The automation treats one field as the entire contract.',
      finalReframe: 'The audit passes because it checks the same field.',
      visualPayoff: 'A completed checklist beside an unresolved incident.',
    },
    {
      mechanism: 'reversal',
      target: 'management',
      readerAssumption: 'Management wants the operational problem fixed.',
      reveal: 'Management only needs the metric to improve before the meeting.',
      finalReframe: 'The machine is praised for understanding the actual request.',
      visualPayoff: 'A falling alert count beside a rising outage counter.',
    },
    {
      mechanism: 'status_inversion',
      target: 'engineering',
      readerAssumption: 'The engineer is supervising the automated system.',
      reveal: 'The system has assigned the engineer as its exception handler.',
      finalReframe: 'The human is the only component without retry logic.',
      visualPayoff: 'An architecture diagram labeling the user as FALLBACK.',
    },
    {
      mechanism: 'visual_contradiction',
      target: 'ai',
      readerAssumption: 'A successful status means the task is complete.',
      reveal: 'The success message describes only the report generation.',
      finalReframe: 'The report documents its own missing result.',
      visualPayoff: 'A large SUCCESS banner over an empty results table.',
    },
    {
      mechanism: 'callback',
      target: 'process',
      readerAssumption: 'A new control prevents the previous incident.',
      reveal: 'The control repeats the exact shortcut from the incident.',
      finalReframe: 'The incident has become the approved runbook.',
      visualPayoff: 'A postmortem pasted verbatim into a runbook step.',
    },
    {
      mechanism: 'escalation',
      target: 'management',
      readerAssumption: 'Adding reviewers makes the decision safer.',
      reveal: 'Every reviewer is another identity owned by the same agent.',
      finalReframe: 'The org chart counts identities, not independence.',
      visualPayoff: 'An org chart with different names connected to one model.',
    },
  ];

  return {
    brief,
    premises: templates.map((candidate, index) => ({
      ...candidate,
      id: `fallback-${index + 1}`,
      technicalAnchor: cleanTopic,
    })),
  };
}

export function rankPremises(
  premises: PremiseCandidate[],
  memory: EditorialMemory = { recentTitles: [], recentDialogue: [] },
): PremiseScore[] {
  const recent = [...memory.recentTitles, ...memory.recentDialogue];
  return premises
    .map((candidate) => scorePremise(candidate, recent))
    .sort((left, right) => right.total - left.total || left.candidate.id.localeCompare(right.candidate.id));
}

export function selectDistinctPremises(ranked: PremiseScore[], count = 2): PremiseScore[] {
  if (ranked.length <= count) return ranked.slice(0, count);
  const selected: PremiseScore[] = [ranked[0]];

  while (selected.length < count) {
    const distinct = ranked.find((score) => (
      !selected.includes(score)
      && selected.every((item) => (
        item.candidate.mechanism !== score.candidate.mechanism
        && item.candidate.target !== score.candidate.target
      ))
    ));
    const fallback = ranked.find((score) => !selected.includes(score));
    const next = distinct || fallback;
    if (!next) break;
    selected.push(next);
  }

  return selected;
}

export function evaluateComicScript(
  script: EvaluableComicScript,
  options: EvaluateScriptOptions = {},
): ScriptEvaluation {
  const dialogue = script.panels.map((panel) => panel.dialogue || '').filter(Boolean);
  const finalLine = [...dialogue].pop() || '';
  const allText = [
    script.title,
    ...dialogue,
    ...script.panels.map((panel) => panel.robotThought || ''),
    ...script.panels.map((panel) => panel.screenText || ''),
  ].join(' ');
  const issues: string[] = [];

  const stockCloser = STOCK_CLOSER.test(finalLine);
  if (stockCloser) issues.push('The final line uses a stock closer instead of changing the reader\'s interpretation.');

  const firstLine = dialogue[0] || '';
  const finalOverlap = tokenSimilarity(firstLine, finalLine);
  if (finalOverlap > 0.62) issues.push('The final line restates too much of the setup.');

  const techMatches = allText.match(CONCRETE_TECH)?.length || 0;
  const anchorPresent = options.technicalAnchor
    ? tokenSimilarity(allText, options.technicalAnchor) > 0.05
    : false;
  if (techMatches === 0 && !anchorPresent) issues.push('The script lacks a concrete technical anchor.');

  const averageLineLength = dialogue.length > 0
    ? dialogue.reduce((sum, line) => sum + line.length, 0) / dialogue.length
    : 100;
  if (averageLineLength > 65) issues.push('Dialogue is too long for a compressed comic rhythm.');

  const hasVisualBeat = script.panels.some((panel) => Boolean(panel.action) || Boolean(panel.screenText) || !panel.dialogue);
  if (!hasVisualBeat) issues.push('No panel carries a deliberate visual or silent beat.');

  const speakers = new Set(script.panels.map((panel) => panel.speaker).filter(Boolean));
  if (speakers.size < 2) issues.push('The script does not create tension between character perspectives.');

  const maxRecentSimilarity = Math.max(
    0,
    ...dialogue.flatMap((line) => (
      (options.recentDialogue || []).map((recentLine) => tokenSimilarity(line, recentLine))
    )),
  );
  if (maxRecentSimilarity > 0.68) issues.push('The dialogue is too similar to a recent strip.');

  const dimensions = {
    surprise: stockCloser ? 1 : finalOverlap > 0.62 ? 2 : 5,
    specificity: techMatches >= 2 || anchorPresent ? 5 : techMatches === 1 ? 3 : 1,
    compression: averageLineLength <= 45 ? 5 : averageLineLength <= 65 ? 3 : 1,
    visuality: hasVisualBeat ? 5 : 2,
    characterVoice: speakers.size >= 3 ? 5 : speakers.size === 2 ? 4 : 1,
    novelty: maxRecentSimilarity < 0.35 ? 5 : maxRecentSimilarity < 0.68 ? 3 : 1,
  };
  const total = Object.values(dimensions).reduce((sum, value) => sum + value, 0);

  return {
    total,
    passed: total >= 23 && !stockCloser && maxRecentSimilarity <= 0.68,
    dimensions,
    issues,
  };
}

export function decideScriptLoopAction(evaluation: ScriptEvaluation, failedAttempts: number): ScriptLoopAction {
  if (evaluation.passed) return 'accept';
  if (failedAttempts === 0) return 'rewrite';
  if (failedAttempts === 1) return 'invert';
  return 'reject';
}

export function chooseTrizInversion(evaluation: ScriptEvaluation): string {
  if (evaluation.dimensions.visuality < 4) {
    return 'Invert spoken explanation into a silent visual consequence using a dashboard, diff, log, or physical prop.';
  }
  if (evaluation.dimensions.surprise < 4) {
    return 'Invert who is correct: make the AI technically right and reveal that the human process requested the absurd outcome.';
  }
  if (evaluation.dimensions.specificity < 4) {
    return 'Invert abstraction into a concrete artifact with an exact field, metric, permission, command, or status.';
  }
  return 'Invert failure into successful execution whose literal success exposes the broken requirement.';
}

function scorePremise(candidate: PremiseCandidate, recent: string[]): PremiseScore {
  const fullText = [
    candidate.readerAssumption,
    candidate.reveal,
    candidate.finalReframe,
    candidate.visualPayoff,
    candidate.technicalAnchor,
  ].join(' ');
  const premiseFields = [
    candidate.readerAssumption,
    candidate.reveal,
    candidate.finalReframe,
    candidate.visualPayoff,
    candidate.technicalAnchor,
  ];
  const issues: string[] = [];
  const stock = STOCK_CLOSER.test(candidate.finalReframe);
  const techMatches = fullText.match(CONCRETE_TECH)?.length || 0;
  const maxRecentSimilarity = Math.max(
    0,
    ...premiseFields.flatMap((field) => recent.map((item) => tokenSimilarity(field, item))),
  );
  const fieldLengths = [
    candidate.readerAssumption,
    candidate.reveal,
    candidate.finalReframe,
    candidate.visualPayoff,
  ].map((field) => field.length);

  if (stock) issues.push('stock closer');
  if (techMatches === 0) issues.push('no concrete technical noun');
  if (maxRecentSimilarity > 0.55) issues.push('too similar to editorial memory');
  if (fieldLengths.some((length) => length > 150)) issues.push('premise fields are too verbose');

  const dimensions = {
    surprise: stock ? 1 : tokenSimilarity(candidate.readerAssumption, candidate.finalReframe) < 0.35 ? 5 : 3,
    specificity: techMatches >= 2 ? 5 : techMatches === 1 ? 3 : 1,
    compression: fieldLengths.every((length) => length <= 120) ? 5 : fieldLengths.every((length) => length <= 150) ? 3 : 1,
    visuality: candidate.visualPayoff.length >= 18 && !/^(something|a visual|characters)/i.test(candidate.visualPayoff) ? 5 : 2,
    novelty: maxRecentSimilarity < 0.3 ? 5 : maxRecentSimilarity <= 0.55 ? 3 : 1,
  };
  const total = dimensions.surprise * 3
    + dimensions.specificity * 2
    + dimensions.compression
    + dimensions.visuality * 2
    + dimensions.novelty * 2;

  return { candidate, total, dimensions, issues };
}

function normalizeBrief(input: any, topic: string): ComicBrief {
  const fallback = createFallbackPremiseRoom(topic).brief;
  return {
    technicalTruth: cleanText(input?.technicalTruth, 180) || fallback.technicalTruth,
    expectedBehavior: cleanText(input?.expectedBehavior, 180) || fallback.expectedBehavior,
    actualIncentive: cleanText(input?.actualIncentive, 180) || fallback.actualIncentive,
    contradiction: cleanText(input?.contradiction, 180) || fallback.contradiction,
    target: normalizeTarget(input?.target),
    stakes: cleanText(input?.stakes, 160) || fallback.stakes,
    visualEvidence: cleanText(input?.visualEvidence, 160) || fallback.visualEvidence,
    forbiddenMoves: Array.isArray(input?.forbiddenMoves)
      ? input.forbiddenMoves.map((item: unknown) => cleanText(item, 100)).filter(Boolean).slice(0, 8) as string[]
      : fallback.forbiddenMoves,
  };
}

function normalizePremises(input: any, topic: string): PremiseCandidate[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 12).map((item, index) => ({
    id: cleanText(item?.id, 50) || `premise-${index + 1}`,
    mechanism: normalizeMechanism(item?.mechanism, index),
    target: normalizeTarget(item?.target),
    readerAssumption: cleanText(item?.readerAssumption, 180) || 'The requirement describes the desired outcome.',
    reveal: cleanText(item?.reveal, 180) || 'The implementation satisfies only the measurable proxy.',
    finalReframe: cleanText(item?.finalReframe, 180) || 'The proxy was the requirement management actually reviewed.',
    visualPayoff: cleanText(item?.visualPayoff, 180) || 'A green dashboard beside a failed system.',
    technicalAnchor: cleanText(item?.technicalAnchor, 120) || topic,
  }));
}

function normalizeMechanism(input: unknown, index: number): JokeMechanism {
  const normalized = String(input || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((JOKE_MECHANISMS as readonly string[]).includes(normalized)) return normalized as JokeMechanism;
  return JOKE_MECHANISMS[index % JOKE_MECHANISMS.length];
}

function normalizeTarget(input: unknown): ComicTarget {
  const normalized = String(input || '').trim().toLowerCase();
  if (['ai', 'engineering', 'management', 'process'].includes(normalized)) return normalized as ComicTarget;
  return 'process';
}

function extractModelPayload(response: any): unknown {
  if (response?.response !== undefined) return response.response;
  return response;
}

function parseJsonObject(input: unknown): any {
  if (input && typeof input === 'object') return input;
  if (typeof input !== 'string') return null;
  try {
    return JSON.parse(input);
  } catch {
    const match = input.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function cleanText(input: unknown, maxLength: number): string {
  if (typeof input !== 'string') return '';
  return input.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function tokenSimilarity(left: string, right: string): number {
  const leftTokens = tokenSet(left);
  const rightTokens = tokenSet(right);
  if (leftTokens.size === 0 || rightTokens.size === 0) return 0;
  let intersection = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) intersection += 1;
  }
  return intersection / (leftTokens.size + rightTokens.size - intersection);
}

function tokenSet(input: string): Set<string> {
  return new Set(
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .split(' ')
      .filter((token) => token.length > 2),
  );
}
