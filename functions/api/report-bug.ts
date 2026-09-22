import type { EventContext } from '@cloudflare/workers-types';

export async function onRequestPost(context: EventContext<Env, string, unknown>): Promise<Response> {
  const { request, env } = context;

  try {
    const body = await request.json() as { day?: string; category?: string; details?: string; title?: string };
    const day = body.day || new Date().toISOString().split('T')[0];
    const category = body.category || 'unknown';
    const details = body.details || '';
    const title = body.title || '';

    // Store the bug report in D1
    await env.DB.prepare(
      'CREATE TABLE IF NOT EXISTS comic_bugs (id INTEGER PRIMARY KEY AUTOINCREMENT, day TEXT NOT NULL, category TEXT NOT NULL, details TEXT, title TEXT, created_at INTEGER NOT NULL)'
    ).run();

    await env.DB.prepare(
      'INSERT INTO comic_bugs (day, category, details, title, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(day, category, details, title, Math.floor(Date.now() / 1000)).run();

    // If category is "identical" or "unfunny", delete the comic so it regenerates on next read
    if (category === 'identical' || category === 'unfunny' || category === 'wrong') {
      try {
        // Delete from comics table
        await env.DB.prepare('DELETE FROM comics WHERE day = ?').bind(day).run();
        // Delete SVGs from R2
        await env.COMICS_BUCKET.delete(`comics/${day}/a.svg`);
        await env.COMICS_BUCKET.delete(`comics/${day}/b.svg`);
      } catch {
        // Best effort — comic may not exist
      }
    }

    return new Response(JSON.stringify({ success: true, message: 'Bug report submitted. Comic will be regenerated.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
