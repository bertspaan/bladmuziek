import { searchMusic } from '#lib/server/providers/index.ts';
import { respond } from '#lib/server/http.ts';
export const GET = ({ url }: { url: URL }) => respond(() => searchMusic(url.searchParams.get('q') || ''));
