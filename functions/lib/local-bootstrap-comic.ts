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
      { panelNumber: 1, speaker: 'human', dialogue: 'Robot, quick status update?' },
      { panelNumber: 2, speaker: 'robot', robotThought: '> loading local mode\n> confidence: 0.62\n> still dramatic' },
      { panelNumber: 3, speaker: 'robot', dialogue: 'System stable, panic optional.' },
      { panelNumber: 4, speaker: 'simon', dialogue: 'Optional panic is still panic.' }
    ]
  };

  const scriptB: ComicScript = {
    title: 'LLM DOES NOT COMPUTE: Local Bootstrap (B)',
    day,
    model: '@local/bootstrap-b',
    panels: [
      { panelNumber: 1, speaker: 'human', dialogue: 'Why is prod slow again?' },
      { panelNumber: 2, speaker: 'robot', robotThought: '> tracing request path\n> found 37 middleware layers\n> neat' },
      { panelNumber: 3, speaker: 'robot', dialogue: 'Latency appears artisanal.' },
      { panelNumber: 4, speaker: 'simon', dialogue: 'Hand-crafted delays cost extra.' }
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
