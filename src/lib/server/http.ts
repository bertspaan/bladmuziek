import { AppError } from './errors';
export async function respond(fn: () => Promise<unknown>) {
  try { return Response.json(await fn(), { headers: { 'cache-control': 'no-store' } }); }
  catch (error) {
    if (error instanceof AppError) return Response.json({ error: error.message, details: error.details }, { status: error.status });
    console.error(error);
    return Response.json({ error: 'Er ging iets mis. Probeer het opnieuw; je bestaande bestanden zijn behouden.' }, { status: 500 });
  }
}
export async function body(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AppError(415, 'Verstuur JSON.');
  let value;
  try { value = await request.json(); } catch { throw new AppError(400, 'Het verzoek kon niet worden gelezen.'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new AppError(400, 'Ongeldig verzoek.');
  return value;
}
