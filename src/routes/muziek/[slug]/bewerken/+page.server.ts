import { error } from '@sveltejs/kit';
import { store } from '#lib/server/store.ts';
import { AppError } from '#lib/server/errors.ts';
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ params }) => {
  try { return { song: await store.getBySlug(params.slug), ...await store.organization() }; }
  catch (e) { if (e instanceof AppError) error(e.status, e.message); throw e; }
};
