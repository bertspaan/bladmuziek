import { describe, expect, it } from 'vitest';
import { libraryRows } from '../src/lib/library-tree.ts';
import { emptyDraft, type Song } from '../src/lib/types.ts';

const song = (id: string, folder: string): Song => ({
  ...emptyDraft(), id, title: id, folder, slug: id, revision: '', createdAt: '', updatedAt: '',
  preferredTranspose: 0, filename: `${id}.md`
});
const folders = ['Piano', 'Piano/Jazz', 'Pianoles'];
const songs = [song('Jazzlied', 'Piano/Jazz'), song('Les', 'Pianoles'), song('Pianolied', 'Piano'), song('Root', '')];

describe('Uitklapbare bibliotheek', () => {
  it('toont standaard alle submappen en hun nummers op de juiste diepte', () => {
    expect(libraryRows(folders, songs, []).map(row => [row.type === 'folder' ? row.path : row.song.id, row.depth])).toEqual([
      ['Piano', 0], ['Piano/Jazz', 1], ['Jazzlied', 2], ['Pianolied', 1], ['Pianoles', 0], ['Les', 1], ['Root', 0]
    ]);
  });
  it('verbergt alleen de inhoud van ingeklapte mappen en bewaart de submapkeuze', () => {
    const visible = (collapsed: string[]) => libraryRows(folders, songs, collapsed).map(row => row.type === 'folder' ? row.path : row.song.id);
    expect(visible(['Piano', 'Piano/Jazz'])).toEqual(['Piano', 'Pianoles', 'Les', 'Root']);
    expect(visible(['Piano/Jazz'])).toEqual(['Piano', 'Piano/Jazz', 'Pianolied', 'Pianoles', 'Les', 'Root']);
  });
  it('opent nieuwe mappen standaard en kan een submap afzonderlijk tonen', () => {
    const rows = libraryRows([...folders, 'Piano/Nieuw'], songs, ['Verwijderd'], 'Piano');
    expect(rows.map(row => row.type === 'folder' ? row.path : row.song.id)).toEqual(['Piano/Jazz', 'Jazzlied', 'Piano/Nieuw', 'Pianolied']);
  });
});
