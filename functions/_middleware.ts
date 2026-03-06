// Cloudflare Pages Functions middleware
// Handles CORS, auth, and common functionality

export async function onRequest(context: any) {
  const { request, next, env } = context;

  // CORS headers for API routes
  if (request.url.includes('/api/')) {
    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Add CORS to response
    const response = await next();
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders,
    });
  }

  return next();
}
