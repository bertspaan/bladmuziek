import { store } from '#lib/server/store.ts';
import { body, respond } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = ({ params, request }) => respond(async () => { const data = await body(request); return store.move(params.id, data.revision, data.folder); });
