import type { ComicScript } from './comic-generator.ts';
import { renderComicToSVG } from './svg-renderer.ts';

export async function ensureLocalBootstrapComic(env: any, day: string) {
  const existing = await env.DB.prepare('SELECT day FROM comics WHERE day = ?').bind(day).first();
  if (existing) return;

  const scriptA: ComicScript = {
    title: 'LLM DOES NOT COMPUTE: Local Bootstrap (A)',
    day,
    model: '@local/bootstrap-a',
    panels: [
      { panelNumber: 1, speaker: 'user', dialogue: 'Why is prod green?', pose: 'pointing', scene: 'incident_room', beat: 'setup', visualFocus: 'green status page', expression: 'confused' },
      { panelNumber: 2, speaker: 'tux', dialogue: 'The host stopped answering.', pose: 'deadpan', scene: 'terminal', beat: 'escalation', visualFocus: 'permission matrix', expression: 'deadpan', cameo: 'ferris' },
      { panelNumber: 3, speaker: 'robot', robotThought: '> metrics absent\n> therefore healthy\n> concise lie', pose: 'typing', scene: 'network', beat: 'reversal', visualFocus: 'broken telemetry', expression: 'thinking' },
      { panelNumber: 4, speaker: 'simon', dialogue: 'It stopped reporting.', pose: 'deadpan', scene: 'whiteboard', beat: 'punchline', visualFocus: 'missing arrow', expression: 'deadpan' }
    ]
  };

  const scriptB: ComicScript = {
    title: 'LLM DOES NOT COMPUTE: Local Bootstrap (B)',
    day,
    model: '@local/bootstrap-b',
    panels: [
      { panelNumber: 1, speaker: 'kube_captain', dialogue: 'The pods mutinied politely.', pose: 'pointing', scene: 'network', beat: 'setup', visualFocus: 'mutinying pods', expression: 'annoyed' },
      { panelNumber: 2, speaker: 'python', dialogue: 'I brought one tiny helper.', pose: 'leaning', scene: 'desk', beat: 'escalation', visualFocus: 'dependency knot', expression: 'smug', cameo: 'ferris' },
      { panelNumber: 3, speaker: 'robot', robotThought: '> install helper\n> helper installs fleet\n> fleet requests budget', pose: 'typing', scene: 'whiteboard', beat: 'reversal', visualFocus: 'lockfile scroll', expression: 'panicked' },
      { panelNumber: 4, speaker: 'simon', dialogue: 'That is a supply chain.', pose: 'deadpan', scene: 'incident_room', beat: 'punchline', visualFocus: 'blast-radius circle', expression: 'annoyed' }
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
    'LLM DOES NOT COMPUTE: Local bootstrap comic',
    scriptA.model,
    scriptB.model,
    keyA,
    keyB,
    JSON.stringify(scriptA),
    JSON.stringify(scriptB),
    now
  ).run();
}
