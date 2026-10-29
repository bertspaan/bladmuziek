import type { Song } from './types.ts';

const fold = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('nl');

export function searchLibrary(songs: Song[], query: string) {
  const terms = fold(query).trim().split(/\s+/).filter(Boolean);
  return songs.filter(song => {
    const text = fold([
      song.title, song.artist, song.folder, ...song.tags, song.key,
      song.capo === null ? '' : String(song.capo), song.sourceUrl, song.filename,
      song.body.replace(/\[[^\]]*\]/g, ''), song.body
    ].join(' '));
    return terms.every(term => text.includes(term));
  }).toSorted((a, b) => a.title.localeCompare(b.title, 'nl') || a.artist.localeCompare(b.artist, 'nl'));
}
