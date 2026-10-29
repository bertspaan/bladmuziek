import { describe, expect, it, vi, afterEach } from 'vitest';
import { ultimateGuitar, chordie } from '../src/lib/server/providers';
import { publicUrl, isPublicAddress, fetchHtml } from '../src/lib/server/providers/fetch';
const ugHtml = (data: unknown) => `<div class="js-store" data-content='${JSON.stringify({ store: { page: { data } } }).replaceAll("'", '&#39;')}'></div>`;
describe('bronadapters', () => {
  it('haalt alleen de muziek en metadata uit Ultimate Guitar', () => {
    const preview = ultimateGuitar.parseSong(`<nav>reclame</nav>${ugHtml({ tab: { type: 'Chords', song_name: 'Eigen lied', artist_name: 'Test' }, tab_view: { wiki_tab: { content: '[Verse]\n[ch]C[/ch]   [ch]G[/ch]\nMijn tekst' }, meta: { tonality: 'C', capo: 2 } } })}`, 'https://tabs.ultimate-guitar.com/tab/1');
    expect(preview.draft.body).toBe('## Verse\n[C]Mijn[G] tekst'); expect(preview.draft.title).toBe('Eigen lied'); expect(preview.draft.capo).toBe(2);
  });
  it('filtert niet-ondersteunde tabformaten uit zoekresultaten', () => {
    const results = ultimateGuitar.parseSearch(ugHtml({ results: [{ type: 'Tabs', tab_url: '/1' }, { type: 'Chords', song_name: 'Eigen lied', artist_name: 'Test', tab_url: 'https://tabs.ultimate-guitar.com/tab/2' }] }));
    expect(results).toHaveLength(1);
  });
  it('behoudt de volledige Ultimate Guitar-link bij zoeken en importeren', () => {
    const url = 'https://tabs.ultimate-guitar.com/tab/test/eigen-lied-chords-1819796';
    const results = ultimateGuitar.parseSearch(ugHtml({ results: [{ type: 'Chords', song_name: 'Eigen lied', artist_name: 'Test', tab_url: url }] }));
    expect(results[0].url).toBe(url);
    const preview = ultimateGuitar.parseSong(ugHtml({ tab: { type: 'Chords', song_name: 'Eigen lied', artist_name: 'Test' }, tab_view: { wiki_tab: { content: '[ch]C[/ch]\nEigen tekst' } } }), results[0].url);
    expect(preview.draft.sourceUrl).toBe(url);
  });
  it('ontdubbelt Chordie-resultaten en leest de ChordPro-inhoud', () => {
    const result = '<a href="/chord.pere/example/song.html"><span>Eigen lied</span><span>Test</span></a>';
    expect(chordie.parseSearch(`<title>Search Results</title>${result}${result}`)).toHaveLength(1);
    const preview = chordie.parseSong('<textarea id="chordproContent">{t:Eigen lied}\n{st:Test}\n[C]Een regel</textarea>', 'https://www.chordie.com/chord.pere/example/song.html');
    expect(preview.draft.title).toBe('Eigen lied'); expect(preview.draft.artist).toBe('Test'); expect(preview.draft.body).toBe('[C]Een regel');
  });
  it('meldt blokkades en lege of gewijzigde pagina’s', () => {
    expect(() => ultimateGuitar.parseSearch('<title>Blocked</title>')).toThrow();
    expect(() => chordie.parseSong('<div>Geen inhoud</div>', 'https://www.chordie.com/')).toThrow();
  });
});
describe('URL-begrenzing', () => {
  it.each(['http://tabs.ultimate-guitar.com/tab/1', 'https://localhost/', 'https://127.0.0.1/', 'https://tabs.ultimate-guitar.com.evil.test/', 'https://user:pass@tabs.ultimate-guitar.com/tab/1', 'https://www.chordie.com:1234/'])('weigert %s', url => { expect(() => publicUrl(url)).toThrow(); });
  it.each(['127.0.0.1','10.1.1.1','172.16.1.1','192.168.1.1','169.254.169.254','100.64.1.1','::1','::ffff:127.0.0.1','fc00::1'])('weigert intern adres %s', address => { expect(isPublicAddress(address)).toBe(false); });
  it('staat publieke bronhosts en adressen toe', () => { expect(publicUrl('https://tabs.ultimate-guitar.com/tab/1').hostname).toBe('tabs.ultimate-guitar.com'); expect(isPublicAddress('8.8.8.8')).toBe(true); });
});
