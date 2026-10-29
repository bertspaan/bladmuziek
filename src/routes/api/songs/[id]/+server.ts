import { store } from '#lib/server/store.ts';
import { body, respond } from '#lib/server/http.ts';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = ({ params }) => respond(() => store.get(params.id));
export const PUT: RequestHandler = ({ params, request }) => respond(async () => { const data = await body(request); return store.save(data.draft, { id: params.id, revision: data.revision }); });
export const PATCH: RequestHandler = ({ params, request }) => respond(async () => { const data = await body(request); return store.preference(params.id, data.revision, data.transpose); });
