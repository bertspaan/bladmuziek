import { lookup } from 'node:dns/promises';
import { AppError } from '../errors';
const allowed = new Set(['tabs.ultimate-guitar.com', 'www.ultimate-guitar.com', 'ultimate-guitar.com', 'www.chordie.com', 'chordie.com']);
export function publicUrl(input: string): URL {
  let url: URL;
  try { url = new URL(input); } catch { throw new AppError(400, 'Vul een geldige URL in.'); }
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || !allowed.has(url.hostname)) throw new AppError(400, 'Deze website wordt nog niet ondersteund. Open de bron en plak de tekst.');
  return url;
}
export function isPublicAddress(address: string): boolean {
  if (address.includes(':')) return /^2[0-9a-f]{3}:/i.test(address) && !address.toLowerCase().startsWith('2001:db8:');
  const [a, b] = address.split('.').map(Number);
  return ![0, 10, 127].includes(a) && a < 224 && !(a === 169 && b === 254) && !(a === 172 && b >= 16 && b <= 31) && !(a === 192 && b === 168) && !(a === 100 && b >= 64 && b <= 127) && !(a === 198 && [18, 19].includes(b));
}
export async function fetchHtml(input: string, request: typeof fetch = fetch): Promise<string> {
  let url = publicUrl(input);
  const signal = AbortSignal.timeout(12_000);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const addresses = await Promise.race([
        lookup(url.hostname, { all: true }),
        new Promise<never>((_, reject) => {
          if (signal.aborted) reject(signal.reason);
          else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        })
      ]);
      if (!addresses.length || addresses.some(a => !isPublicAddress(a.address))) throw new AppError(400, 'Deze bron verwijst niet naar een publieke website.');
      const response = await request(url, { redirect: 'manual', signal, headers: { 'user-agent': 'Bladmuziek/0.1', accept: 'text/html' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        await response.body?.cancel();
        const location = response.headers.get('location');
        if (!location) throw new AppError(502, 'De website stuurde een ongeldige doorverwijzing.');
        url = publicUrl(new URL(location, url).toString()); continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        if (response.status === 404 || response.status === 410) {
          const message = url.hostname === 'tabs.ultimate-guitar.com' && /^\/tab\/\d+\/?$/.test(url.pathname)
            ? 'Ultimate Guitar kan deze korte link niet vinden. Gebruik de volledige link met artiest en titel, of zoek het nummer via Toevoegen.'
            : 'Deze bronpagina is niet gevonden of verwijderd. Controleer de link of zoek het nummer via Toevoegen.';
          throw new AppError(502, message);
        }
        throw new AppError(502, 'De website kon niet worden uitgelezen. Open de bron en plak de tekst.');
      }
      if (Number(response.headers.get('content-length')) > 4_000_000) { await response.body?.cancel(); throw new AppError(502, 'Deze pagina is te groot om te importeren.'); }
      if (!response.body) throw new AppError(502, 'De website gaf geen inhoud terug.');
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 4_000_000) { await reader.cancel(); throw new AppError(502, 'Deze pagina is te groot om te importeren.'); }
        chunks.push(value);
      }
      return Buffer.concat(chunks).toString('utf8');
    }
    throw new AppError(502, 'De website verwijst te vaak door.');
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, 'De website reageert niet. Probeer opnieuw of plak de tekst.');
  }
}
