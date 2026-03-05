// GET /api/push-key - Returns the VAPID public key for browser subscriptions

export async function onRequestGet(context: any) {
  const { env } = context;
  const publicKey = env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return Response.json({
      error: 'Push notifications are not configured on this environment'
    }, { status: 404 });
  }

  return Response.json({ publicKey });
}
