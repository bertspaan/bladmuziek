import { load } from 'cheerio';
import { cleanMusic, noteValue } from '../../music';
import { detectKey } from '../../key-detection';
import { emptyDraft, type ImportPreview, type SearchResult } from '../../types';
import { AppError } from '../errors';
import { canonicalSource } from '../store';
import { fetchHtml, publicUrl } from './fetch';
export interface Provider {
  name: string;
  accepts(url: URL): boolean;
  searchUrl(query: string): string;
  parseSearch(html: string): SearchResult[];
  parseSong(html: string, url: string): ImportPreview;
}
function ugData(html: string) {
  const data = load(html)('.js-store').attr('data-content');
  if (!data) throw new AppError(502, 'Ultimate Guitar kon niet worden uitgelezen. Open de bron en plak de tekst.');
  try { return JSON.parse(data).store.page.data; }
  catch { throw new AppError(502, 'De indeling van Ultimate Guitar is veranderd. Plak voorlopig de tekst.'); }
}
export const ultimateGuitar: Provider = {
  name: 'Ultimate Guitar',
  accepts: url => url.hostname === 'tabs.ultimate-guitar.com' && /^\/tab\/(?:.*-)?\d+\/?$/.test(url.pathname),
  searchUrl: q => `https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(q)}`,
  parseSearch(html) {
    const data = ugData(html);
    if (!Array.isArray(data.results)) throw new AppError(502, 'Ultimate Guitar gaf geen leesbare zoekresultaten terug.');
    return data.results.filter((r: { type: string; tab_url?: string }) => r.type === 'Chords' && r.tab_url).map((r: { song_name: string; artist_name: string; tab_url: string; rating?: number; votes?: number; version?: number }) => ({
      title: r.song_name, artist: r.artist_name, url: r.tab_url, source: this.name,
      detail: [r.version ? `Versie ${r.version}` : '', r.votes ? `${Number(r.rating).toFixed(1)} / 5 · ${r.votes} beoordelingen` : ''].filter(Boolean).join(' · ')
    }));
  },
  parseSong(html, url) {
    const data = ugData(html);
    const content = data.tab_view?.wiki_tab?.content;
    if (typeof content !== 'string' || !content.trim()) throw new AppError(422, 'Op deze pagina zijn geen toegankelijke lyrics en akkoorden gevonden.');
    if (data.tab?.type !== 'Chords') throw new AppError(422, 'Kies een akkoordenschema (Chords). Andere tabformaten worden nog niet ondersteund.');
    const clean = cleanMusic(content);
    const declaredKey = [data.tab_view?.meta?.tonality, data.tab?.tonality_name].find(value => typeof value === 'string' && noteValue(value.trim()) !== null)?.trim() || '';
    const key = declaredKey || detectKey(clean.body);
    if (!declaredKey && key) clean.warnings.push(`Toonsoort geschat uit de akkoorden: ${key}.`);
    const capo = Number(data.tab_view?.meta?.capo);
    // Some tabs return 404 for /tab/:id even though their full URL works.
    // canonicalSource is only suitable for comparing sources, not linking to them.
    return { draft: { ...emptyDraft(), title: data.tab?.song_name?.trim() || data.tab_view?.headerMeta?.name?.trim() || '', artist: data.tab?.artist_name?.trim() || data.tab_view?.headerMeta?.artists?.map((artist: { name: string }) => artist.name).filter(Boolean).join(', ') || '', key: noteValue(key) !== null ? key : '', capo: Number.isInteger(capo) && capo >= 0 && capo <= 12 ? capo : null, sourceUrl: url, body: clean.body }, warnings: clean.warnings };
  }
};
export const chordie: Provider = {
  name: 'Chordie',
  accepts: url => ['www.chordie.com', 'chordie.com'].includes(url.hostname) && url.pathname.startsWith('/chord.pere/'),
  searchUrl: q => `https://www.chordie.com/result.php?q=${encodeURIComponent(q)}`,
  parseSearch(html) {
    const $ = load(html);
    if (!/Search Results/i.test($('title').text())) throw new AppError(502, 'Chordie kon niet worden uitgelezen.');
    const results: SearchResult[] = []; const seen = new Set<string>();
    $('a[href*="/chord.pere/"]').each((_, el) => {
      const a = $(el); const spans = a.find('span');
      const href = a.attr('href'); if (!href || spans.length < 2) return;
      const url = new URL(href, 'https://www.chordie.com').toString();
      if (seen.has(url)) return; seen.add(url);
      results.push({ title: spans.first().text().trim(), artist: spans.eq(1).text().trim(), url, source: this.name });
    });
    return results;
  },
  parseSong(html, url) {
    const $ = load(html);
    const content = $('#chordproContent').text();
    if (!content.trim()) throw new AppError(422, 'Chordie gaf geen leesbaar akkoordenschema terug. Open de bron en plak de tekst.');
    const directive = (names: string) => new RegExp(`\\{(?:${names}):\\s*([^}]+)\\}`, 'i').exec(content)?.[1]?.trim() || '';
    const declaredKey = directive('key|k');
    const capo = directive('capo');
    const clean = cleanMusic(content);
    const key = noteValue(declaredKey) !== null ? declaredKey : detectKey(clean.body);
    if (noteValue(declaredKey) === null && key) clean.warnings.push(`Toonsoort geschat uit de akkoorden: ${key}.`);
    return { draft: { ...emptyDraft(), title: directive('title|t') || $('h1').text().trim(), artist: directive('artist|subtitle|st'), key: noteValue(key) !== null ? key : '', capo: /^\d+$/.test(capo) && Number(capo) <= 12 ? Number(capo) : null, sourceUrl: canonicalSource(url), body: clean.body }, warnings: clean.warnings };
  }
};
export const providers = [ultimateGuitar, chordie];
export async function importSong(input: string): Promise<ImportPreview> {
  const url = publicUrl(input);
  const provider = providers.find(p => p.accepts(url));
  if (!provider) throw new AppError(400, 'Gebruik een nummerpagina van Ultimate Guitar of Chordie, of plak de tekst.');
  return provider.parseSong(await fetchHtml(url.toString()), url.toString());
}
const cache = new Map<string, { expires: number; data: { results: SearchResult[]; warnings: string[] } }>();
export async function searchMusic(query: string) {
  const q = query.trim();
  if (q.length < 2 || q.length > 150) throw new AppError(400, 'Gebruik een zoekopdracht van 2 tot 150 tekens.');
  const cached = cache.get(q); if (cached && cached.expires > Date.now()) return cached.data;
  const settled = await Promise.allSettled(providers.map(async provider => provider.parseSearch(await fetchHtml(provider.searchUrl(q)))));
  const results: SearchResult[] = []; const warnings: string[] = [];
  settled.forEach((result, i) => {
    if (result.status === 'fulfilled') results.push(...result.value.slice(0, 30));
    else warnings.push(`${providers[i].name} is tijdelijk niet beschikbaar. Je kunt de website rechtstreeks openen.`);
  });
  const data = { results, warnings };
  if (cache.size > 100) cache.delete(cache.keys().next().value!);
  if (settled.some(s => s.status === 'fulfilled')) cache.set(q, { expires: Date.now() + 300_000, data });
  return data;
}
