// POST /api/subscribe - Subscribe to push notifications

interface SubscribeRequest {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export async function onRequestPost(context: any) {
  const { request, env } = context;

  try {
    const body: SubscribeRequest = await request.json();

    if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
      return Response.json({
        error: 'Invalid subscription data'
      }, { status: 400 });
    }

    // Store subscription
    await env.DB.prepare(
      'INSERT OR REPLACE INTO push_subscriptions (endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?)'
    ).bind(
      body.endpoint,
      body.keys.p256dh,
      body.keys.auth,
      Math.floor(Date.now() / 1000)
    ).run();

    return Response.json({
      success: true,
      message: 'Subscribed to daily comic notifications'
    });

  } catch (err: any) {
    console.error('Error subscribing:', err);
    return Response.json({
      error: err.message || 'Failed to subscribe'
    }, { status: 500 });
  }
}

// DELETE /api/subscribe - Unsubscribe
export async function onRequestDelete(context: any) {
  const { request, env } = context;

  try {
    const body = await request.json();

    if (!body.endpoint) {
      return Response.json({
        error: 'Endpoint required'
      }, { status: 400 });
    }

    await env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE endpoint = ?'
    ).bind(body.endpoint).run();

    return Response.json({
      success: true,
      message: 'Unsubscribed from notifications'
    });

  } catch (err: any) {
    console.error('Error unsubscribing:', err);
    return Response.json({
      error: err.message || 'Failed to unsubscribe'
    }, { status: 500 });
  }
}
