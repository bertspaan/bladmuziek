import { importSong } from '#lib/server/providers/index.ts';
import { store } from '#lib/server/store.ts';
import { body, respond } from '#lib/server/http.ts';
import { AppError } from '#lib/server/errors.ts';
export const POST = ({ request }: { request: Request }) => respond(async () => {
  const { url } = await body(request);
  if (typeof url !== 'string' || url.length > 2000) throw new AppError(400, 'Vul een geldige URL in.');
  const saved = await store.findSource(url);
  if (saved) return { draft: saved, warnings: [], existing: { id: saved.id, slug: saved.slug, title: saved.title } };
  const preview = await importSong(url);
  const existing = await store.findSource(preview.draft.sourceUrl);
  return { ...preview, existing: existing ? { id: existing.id, slug: existing.slug, title: existing.title } : undefined };
});
