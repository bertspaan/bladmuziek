import { store } from '#lib/server/store.ts';
import { body, respond } from '#lib/server/http.ts';
export const POST = ({ request }: { request: Request }) => respond(async () => { const { folder } = await body(request); return store.createFolder(folder); });
