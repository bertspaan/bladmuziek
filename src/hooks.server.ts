import type { Handle } from '@sveltejs/kit/hooks';
export const handle: Handle = async ({ event, resolve }) => {
  const origin = event.request.headers.get('origin');
  const host = event.request.headers.get('host') || '';
  const localOrigin = /^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(host) && origin === `http://${host}`;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method) && origin && origin !== event.url.origin && !localOrigin) return Response.json({ error: 'Dit verzoek komt van een andere website.' }, { status: 403 });
  const response = await resolve(event);
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  if (!event.url.pathname.startsWith('/_app/')) response.headers.set('Cache-Control', 'no-store');
  return response;
};
