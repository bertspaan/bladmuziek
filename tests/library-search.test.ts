import { describe, expect, it } from 'vitest';
import { searchLibrary } from '../src/lib/library-search.ts';
import { emptyDraft, type Song } from '../src/lib/types.ts';

const song = (id: string, values: Partial<Song>): Song => ({
  ...emptyDraft(), id, slug: id, revision: '', createdAt: '', updatedAt: '',
  preferredTranspose: 0, filename: `${id}.md`, ...values
});
const songs = [
  song('zomer', { title: 'Zomerlied', artist: 'André', body: 'Een [Am]zachte morgen', tags: ['piano'], folder: 'Oefenen' }),
  song('avond', { title: 'Avondlied', artist: 'Amber', body: 'De nacht' })
];

describe('Zoeken in de bibliotheek en het command palette', () => {
  it('vindt titels, artiesten, tags, mappen en tekst zonder accenten of hoofdletterverschil', () => {
    for (const query of ['ZOMER', 'andre', 'piano', 'oefenen', 'zachte morgen', 'morgen andre']) {
      expect(searchLibrary(songs, query).map(song => song.id)).toEqual(['zomer']);
    }
  });
  it('vereist alle zoekwoorden en doorzoekt ook akkoordnotatie', () => {
    expect(searchLibrary(songs, 'zomer nacht')).toEqual([]);
    expect(searchLibrary([songs[0]], 'Am')).toEqual([songs[0]]);
  });
  it('doorzoekt toonsoort, capo, bron en bestandsnaam samen met andere velden', () => {
    const detailed = song('details', { title: 'Voorbeeld', key: 'F#m', capo: 3, sourceUrl: 'https://example.com/bron', filename: 'originele-naam.md' });
    for (const query of ['f#m', '3', 'example.com', 'originele-naam', 'voorbeeld f#m 3']) {
      expect(searchLibrary([detailed], query)).toEqual([detailed]);
    }
    expect(searchLibrary([song('zonder-capo', {})], 'null')).toEqual([]);
  });
  it('sorteert alfabetisch zonder de oorspronkelijke bibliotheek te wijzigen', () => {
    expect(searchLibrary(songs, '  ').map(song => song.id)).toEqual(['avond', 'zomer']);
    expect(songs.map(song => song.id)).toEqual(['zomer', 'avond']);
  });
});
