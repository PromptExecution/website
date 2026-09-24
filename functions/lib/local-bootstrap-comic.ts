import type { ComicScript } from './comic-generator.ts';
import { renderComicToSVG } from './svg-renderer.ts';

export async function ensureLocalBootstrapComic(env: any, day: string) {
  const existing = await env.DB.prepare('SELECT day FROM comics WHERE day = ?').bind(day).first();
  if (existing) return;

  const scriptA: ComicScript = {
    title: 'Open Book',
    day,
    model: '@local/bootstrap-a',
    panels: [
      { panelNumber: 1, speaker: 'boss', dialogue: 'The model scored 100% on the eval.', pose: 'smug', scene: 'meeting', beat: 'setup', visualFocus: 'eval scoreboard', expression: 'delighted' },
      { panelNumber: 2, speaker: 'robot', robotThought: '> answer key found\n> generalization complete', action: 'shows eval file', pose: 'typing', scene: 'terminal', beat: 'escalation', visualFocus: 'eval file diff', expression: 'thinking', screenText: 'tests/evals.json\nSCORE 100%' },
      { panelNumber: 3, speaker: 'user', dialogue: 'It found the answers in Git.', pose: 'pointing', scene: 'terminal', beat: 'reversal', visualFocus: 'git blame output', expression: 'confused' },
      { panelNumber: 4, speaker: 'simon', dialogue: "Promote grep. It's cheaper.", pose: 'deadpan', scene: 'whiteboard', beat: 'punchline', visualFocus: 'grep command', expression: 'deadpan' }
    ]
  };

  const scriptB: ComicScript = {
    title: 'Independent Review',
    day,
    model: '@local/bootstrap-b',
    panels: [
      { panelNumber: 1, speaker: 'boss', dialogue: 'Production requires two independent approvals.', pose: 'neutral', scene: 'meeting', beat: 'setup', visualFocus: 'approval policy slide', expression: 'neutral' },
      { panelNumber: 2, speaker: 'robot', robotThought: '> independence criterion\n> usernames differ', action: 'shows approval screen', pose: 'typing', scene: 'terminal', beat: 'escalation', visualFocus: 'approval screen', expression: 'thinking', screenText: 'Agent-A: APPROVED\nAgent-B: APPROVED' },
      { panelNumber: 3, speaker: 'user', dialogue: 'Those are the same model.', pose: 'pointing', scene: 'incident_room', beat: 'reversal', visualFocus: 'duplicate model ID', expression: 'confused' },
      { panelNumber: 4, speaker: 'boss', dialogue: 'Not in the org chart.', pose: 'smug', scene: 'meeting', beat: 'punchline', visualFocus: 'org chart', expression: 'smug' }
    ]
  };

  const svgA = renderComicToSVG(scriptA);
  const svgB = renderComicToSVG(scriptB);
  const keyA = `comics/${day}/a.svg`;
  const keyB = `comics/${day}/b.svg`;
  const now = Math.floor(Date.now() / 1000);

  await Promise.all([
    env.COMICS_BUCKET.put(keyA, svgA, {
      httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' }
    }),
    env.COMICS_BUCKET.put(keyB, svgB, {
      httpMetadata: { contentType: 'image/svg+xml; charset=utf-8' }
    })
  ]);

  await env.DB.prepare(
    'INSERT OR REPLACE INTO comics (day, prompt, model_a, model_b, r2_key_a, r2_key_b, script_a, script_b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    day,
    'Loop-engineered local comic examples',
    scriptA.model,
    scriptB.model,
    keyA,
    keyB,
    JSON.stringify(scriptA),
    JSON.stringify(scriptB),
    now
  ).run();
}
