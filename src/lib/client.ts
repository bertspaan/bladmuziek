export class ApiError extends Error {
  constructor(message: string, public status: number, public details?: { existing?: { id: string; slug: string; title: string } }) { super(message); }
}
export async function api<T>(url: string, method = 'GET', data?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { method, headers: data ? { 'Content-Type': 'application/json' } : undefined, body: data ? JSON.stringify(data) : undefined }); }
  catch { throw new ApiError('Geen verbinding met Mini. Probeer het opnieuw.', 0); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(result.error || 'Het verzoek is mislukt. Probeer het opnieuw.', response.status, result.details);
  return result;
}
