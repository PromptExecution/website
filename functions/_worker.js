// Main Worker entry point with cron trigger for daily comic generation

import { generateComicScript } from './lib/comic-generator';
import { renderComicToSVG } from './lib/svg-renderer';
import { onRequestGet as getToday } from './api/today';
import { onRequestGet as getArchive } from './api/archive';
import { onRequestGet as getDay } from './api/day';
import { onRequestGet as getPushKey } from './api/push-key';
import { onRequestPost as postVote } from './api/vote';
import { onRequestPost as postSubscribe, onRequestDelete as deleteSubscribe } from './api/subscribe';
import { onRequestGet as getTestGenerate, onRequestPost as postTestGenerate } from './api/test-generate';

export default {
  // Scheduled cron trigger (9 AM UTC daily)
  async scheduled(event, env, ctx) {
    console.log('Cron trigger: Generating daily comic');

    const today = new Date().toISOString().split('T')[0];
    const keyA = `comics/${today}/a.svg`;
    const keyB = `comics/${today}/b.svg`;

    try {
      // Generate only when today's object does not exist.
      const [existingA, existingB] = await Promise.all([
        env.COMICS_BUCKET.head(keyA),
        env.COMICS_BUCKET.head(keyB),
      ]);
      if (existingA || existingB) {
        console.log(`Comic object for ${today} already exists in R2, skipping`);
        return;
      }

      // Generate from two different models
      const MODEL_A = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
      const MODEL_B = '@cf/mistral/mistral-7b-instruct-v0.2-lora';

      console.log('Generating comic scripts...');
      const [scriptA, scriptB] = await Promise.all([
        generateComicScript(env.AI, MODEL_A, today),
        generateComicScript(env.AI, MODEL_B, today)
      ]);

      console.log('Rendering SVGs...');
      const svgA = renderComicToSVG(scriptA);
      const svgB = renderComicToSVG(scriptB);

      // Store in R2
      await Promise.all([
        env.COMICS_BUCKET.put(keyA, svgA, {
          httpMetadata: { contentType: 'image/svg+xml' }
        }),
        env.COMICS_BUCKET.put(keyB, svgB, {
          httpMetadata: { contentType: 'image/svg+xml' }
        })
      ]);

      // Store metadata in D1
      await env.DB.prepare(
        'INSERT OR REPLACE INTO comics (day, prompt, model_a, model_b, r2_key_a, r2_key_b, script_a, script_b, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        today,
        scriptA.title,
        MODEL_A,
        MODEL_B,
        keyA,
        keyB,
        JSON.stringify(scriptA),
        JSON.stringify(scriptB),
        Math.floor(Date.now() / 1000)
      ).run();

      console.log(`Comic for ${today} generated successfully`);

      // Send push notifications
      await sendPushNotifications(env, today);

    } catch (err) {
      console.error('Error generating daily comic:', err);
      throw err;
    }
  },

  // Fetch handler for API routes + static assets.
  async fetch(request, env, ctx) {
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
      'GET /api/archive': getArchive,
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
};

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

async function sendPushNotifications(env, day) {
  try {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      console.log('Push keys are not configured, skipping push delivery');
      return;
    }

    // Get all subscriptions that haven't been notified today
    const subs = await env.DB.prepare(
      'SELECT * FROM push_subscriptions WHERE last_sent_day IS NULL OR last_sent_day < ?'
    ).bind(day).all();

    if (subs.results.length === 0) {
      console.log('No subscriptions to notify');
      return;
    }

    console.log(`Sending push to ${subs.results.length} subscribers`);

    const payload = JSON.stringify({
      title: 'New LLM DOES NOT COMPUTE Comic!',
      body: `Today's comic is ready. Vote for your favorite!`,
      icon: '/PromptExecution-LogoV2-semi-transparent.webp',
      url: `https://promptexecution.com/comic`
    });

    // Send to all subscribers
    const pushPromises = subs.results.map(async (sub) => {
      try {
        await sendWebPush(sub, payload, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

        // Update last_sent_day
        await env.DB.prepare(
          'UPDATE push_subscriptions SET last_sent_day = ? WHERE endpoint = ?'
        ).bind(day, sub.endpoint).run();
      } catch (err) {
        console.error('Push failed for', sub.endpoint, err);

        // If subscription is invalid, remove it
        if (err.statusCode === 410) {
          await env.DB.prepare(
            'DELETE FROM push_subscriptions WHERE endpoint = ?'
          ).bind(sub.endpoint).run();
        }
      }
    });

    await Promise.allSettled(pushPromises);
    console.log('Push notifications sent');

  } catch (err) {
    console.error('Error sending push notifications:', err);
  }
}

async function sendWebPush(subscription, payload, vapidPublicKey, vapidPrivateKey) {
  // Web Push implementation using VAPID
  // See: https://developers.cloudflare.com/workers/examples/web-push/

  const { endpoint, p256dh, auth } = subscription;

  // This is a simplified version - in production you'd use a library
  // or implement the full Web Push protocol
  // For now, this is a placeholder

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
    },
    body: payload
  });

  if (!response.ok) {
    throw { statusCode: response.status, message: await response.text() };
  }
}
