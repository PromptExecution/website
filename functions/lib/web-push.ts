import { buildPushHTTPRequest } from '@pushforge/builder';

interface StoredSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
  last_sent_day?: string | null;
}

interface PushDeps {
  buildRequest?: typeof buildPushHTTPRequest;
  fetchImpl?: typeof fetch;
}

const DEFAULT_ADMIN_CONTACT = 'mailto:hello@promptexecution.com';

export function isPushEnabled(env: Record<string, unknown>) {
  return String(env.ENABLE_PUSH_NOTIFICATIONS || '0') === '1';
}

export async function sendDailyComicPushNotifications(env: any, day: string, deps: PushDeps = {}) {
  if (!isPushEnabled(env)) {
    console.log('Push delivery is disabled, skipping push notifications');
    return { sent: 0, deleted: 0, skipped: true };
  }

  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    console.log('Push keys are not configured, skipping push delivery');
    return { sent: 0, deleted: 0, skipped: true };
  }

  const subs = await env.DB.prepare(
    'SELECT * FROM push_subscriptions WHERE last_sent_day IS NULL OR last_sent_day < ?'
  ).bind(day).all();

  const subscriptions = subs.results as StoredSubscription[];
  if (subscriptions.length === 0) {
    console.log('No subscriptions to notify');
    return { sent: 0, deleted: 0, skipped: false };
  }

  const payload = buildDailyComicPayload(env, day);
  let sent = 0;
  let deleted = 0;

  console.log(`Sending push to ${subscriptions.length} subscribers`);

  const results = await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await sendPushToSubscription(env, subscription, payload, deps);
        await env.DB.prepare(
          'UPDATE push_subscriptions SET last_sent_day = ? WHERE endpoint = ?'
        ).bind(day, subscription.endpoint).run();
        sent += 1;
      } catch (err: any) {
        console.error('Push failed for', subscription.endpoint, err);

        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await env.DB.prepare(
            'DELETE FROM push_subscriptions WHERE endpoint = ?'
          ).bind(subscription.endpoint).run();
          deleted += 1;
        }
      }
    })
  );

  const rejected = results.filter((result) => result.status === 'rejected').length;
  console.log('Push notifications processed', { sent, deleted, rejected });
  return { sent, deleted, skipped: false };
}

export async function sendPushToSubscription(
  env: any,
  subscription: StoredSubscription,
  payload: Record<string, unknown>,
  deps: PushDeps = {}
) {
  const buildRequest = deps.buildRequest || buildPushHTTPRequest;
  const fetchImpl = deps.fetchImpl || fetch;

  const request = await buildRequest({
    privateJWK: env.VAPID_PRIVATE_KEY,
    subscription: {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    },
    message: {
      payload,
      adminContact: String(env.VAPID_SUBJECT || DEFAULT_ADMIN_CONTACT),
      options: {
        ttl: 86400,
        urgency: 'normal',
        topic: `daily-comic-${payload.day}`
      }
    }
  });

  const response = await fetchImpl(request.endpoint, {
    method: 'POST',
    headers: request.headers,
    body: request.body
  });

  if (!response.ok) {
    throw {
      statusCode: response.status,
      message: await response.text()
    };
  }

  return response;
}

export function buildDailyComicPayload(env: any, day: string) {
  return {
    title: 'New LLM DOES NOT COMPUTE Comic!',
    body: `Today's comic for ${day} is ready. Vote for your favorite.`,
    icon: '/PromptExecution-LogoV2-semi-transparent.webp',
    badge: '/PromptExecution-LogoV2-semi-transparent.webp',
    url: `${resolveSiteUrl(env)}/?tab=comic&day=${day}`,
    day
  };
}

function resolveSiteUrl(env: any) {
  const siteUrl = String(env.SITE_URL || env.CF_PAGES_URL || 'https://promptexecution.com');
  return siteUrl.replace(/\/+$/, '');
}
