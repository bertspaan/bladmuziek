import { describe, expect, it } from 'vitest';
import { detectKey } from '../src/lib/key-detection';
import { ultimateGuitar, chordie } from '../src/lib/server/providers';
const page = (data: unknown) => `<div class="js-store" data-content='${JSON.stringify({ store: { page: { data } } })}'></div>`;
const song = (meta: unknown = {}) => page({ tab: { type: 'Chords', song_name: 'Eigen lied', artist_name: 'Test' }, tab_view: { wiki_tab: { content: '[ch]C[/ch] [ch]F[/ch] [ch]G7[/ch] [ch]C[/ch]' }, meta } });
describe('Toonsoortherkenning', () => {
  it.each([
    ['[C] [F] [G7] [C]', 'C'],
    ['[Am] [Dm] [E7] [Am]', 'Am'],
    ['[Bb] [Eb] [F7] [Bb]', 'Bb'],
    ['[F#m] [Bm] [C#7] [F#m]', 'F#m'],
    ['[D/F#] [G] [A7] [D]', 'D'],
    ['[C] [G] [G7] [G] [C] [F] [C] [D] [G] [G7] [G] [C]', 'C']
  ])('herkent %s als %s', (body, key) => expect(detectKey(body)).toBe(key));
  it.each(['[C] [C] [C] [C]', '[C] [G]', '[C] [Am] [F] [G]', 'Gewoon tekst', '[C] [Db] [D] [Eb] [E] [F] [Gb]'])('laat onzekere gevallen leeg: %s', body => expect(detectKey(body)).toBe(''));
  it('vult metadata aan en houdt capo afzonderlijk', () => {
    const result = ultimateGuitar.parseSong(song({ capo: 2 }), 'https://tabs.ultimate-guitar.com/tab/1');
    expect(result.draft).toMatchObject({ title: 'Eigen lied', artist: 'Test', key: 'C', capo: 2 });
    expect(result.warnings).toContain('Toonsoort geschat uit de akkoorden: C.');
  });
  it('geeft een opgegeven toonsoort voorrang', () => {
    const result = ultimateGuitar.parseSong(song({ tonality: 'G', capo: 2 }), 'https://tabs.ultimate-guitar.com/tab/1');
    expect(result.draft.key).toBe('G'); expect(result.warnings).toHaveLength(0);
  });
  it('leest titel en artiest ook uit de paginakop', () => {
    const result = ultimateGuitar.parseSong(page({ tab: { type: 'Chords' }, tab_view: { headerMeta: { name: 'Eigen lied', artists: [{ name: 'Test' }] }, wiki_tab: { content: '[ch]C[/ch]' } } }), 'https://tabs.ultimate-guitar.com/tab/1');
    expect(result.draft).toMatchObject({ title: 'Eigen lied', artist: 'Test' });
  });
  it('herkent de toonsoort ook bij Chordie', () => {
    const result = chordie.parseSong('<textarea id="chordproContent">{t:Eigen lied}\n[C] [F] [G7] [C]</textarea>', 'https://www.chordie.com/chord.pere/example/song.html');
    expect(result.draft.key).toBe('C'); expect(result.warnings).toContain('Toonsoort geschat uit de akkoorden: C.');
  });
});
