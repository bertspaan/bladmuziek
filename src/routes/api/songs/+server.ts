import { store } from '#lib/server/store.ts';
import { body, respond } from '#lib/server/http.ts';
export const GET = () => respond(() => store.list());
export const POST = ({ request }: { request: Request }) => respond(async () => { const data = await body(request); return store.save(data.draft, { allowDuplicate: data.allowDuplicate === true }); });
