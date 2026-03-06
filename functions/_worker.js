// Main Worker entry point with cron trigger for daily comic generation

import { runAgenticComicWorkflow } from './lib/agentic-comic-workflow.ts';
import { onRequestGet as getToday } from './api/today.ts';
import { onRequestGet as getArchive } from './api/archive.ts';
import { onRequestGet as getDay } from './api/day.ts';
import { onRequestGet as getImage } from './api/image.ts';
import { onRequestGet as getWorkflow } from './api/workflow.ts';
import { onRequestGet as getPushKey } from './api/push-key.ts';
import { onRequestPost as postVote } from './api/vote.ts';
import { onRequestPost as postSubscribe, onRequestDelete as deleteSubscribe } from './api/subscribe.ts';
import { onRequestGet as getTestGenerate, onRequestPost as postTestGenerate } from './api/test-generate.ts';
import { sendDailyComicPushNotifications } from './lib/web-push.ts';

export default {
  fetch: handleFetch,
  scheduled,
};

// Fetch handler for API routes + static assets.
async function handleFetch(request, env, ctx) {
  const url = new URL(request.url);

  if (!url.pathname.startsWith('/api/')) {
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }
    return new Response('Asset binding is not configured', { status: 500 });
  }

  if (request.method === 'OPTIONS') {
    return withCorsHeaders(new Response(null, { status: 204 }));
  }

  const context = { request, env, waitUntil: ctx.waitUntil?.bind(ctx) };
  const routeKey = `${request.method} ${url.pathname}`;

  const handlers = {
    'GET /api/today': getToday,
    'GET /api/day': getDay,
    'GET /api/image': getImage,
    'GET /api/archive': getArchive,
    'GET /api/workflow': getWorkflow,
    'GET /api/push-key': getPushKey,
    'POST /api/vote': postVote,
    'POST /api/subscribe': postSubscribe,
    'DELETE /api/subscribe': deleteSubscribe,
    'GET /api/test-generate': getTestGenerate,
    'POST /api/test-generate': postTestGenerate,
  };

  const handler = handlers[routeKey];
  if (!handler) {
    return withCorsHeaders(Response.json({
      error: 'Not found',
      method: request.method,
      path: url.pathname
    }, { status: 404 }));
  }

  try {
    const response = await handler(context);
    return withCorsHeaders(response);
  } catch (err) {
    console.error('API route handler failed:', routeKey, err);
    return withCorsHeaders(Response.json({
      error: 'Internal server error'
    }, { status: 500 }));
  }
}

// Scheduled cron trigger (9 AM UTC daily)
export async function scheduled(event, env, ctx) {
  console.log('Cron trigger: starting agentic graphic comic workflow');

  const today = new Date().toISOString().split('T')[0];
  const keyA = `comics/${today}/a.png`;
  const keyB = `comics/${today}/b.png`;
  const legacyKeyA = `comics/${today}/a.svg`;
  const legacyKeyB = `comics/${today}/b.svg`;

  try {
    // Generate only when today's object does not exist.
    const [existingA, existingB, existingLegacyA, existingLegacyB] = await Promise.all([
      env.COMICS_BUCKET.head(keyA),
      env.COMICS_BUCKET.head(keyB),
      env.COMICS_BUCKET.head(legacyKeyA),
      env.COMICS_BUCKET.head(legacyKeyB),
    ]);
    if (existingA || existingB || existingLegacyA || existingLegacyB) {
      console.log(`Comic object for ${today} already exists in R2 (png/svg), skipping`);
      return;
    }

    const result = await runAgenticComicWorkflow(env, {
      day: today,
      trigger: 'cron'
    });

    console.log(`Comic for ${today} generated successfully`, {
      runId: result.run_id,
      modelA: result.model_a,
      modelB: result.model_b
    });

    // Send push notifications
    await sendDailyComicPushNotifications(env, today);

  } catch (err) {
    console.error('Error generating daily comic:', err);
    throw err;
  }
}

function withCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}
