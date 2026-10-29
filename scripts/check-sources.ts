import assert from 'node:assert/strict';
import { ultimateGuitar, chordie, importSong, searchMusic } from '../src/lib/server/providers/index';
import { cleanMusic } from '../src/lib/music';
const search = await searchMusic('uit mijn bol');
assert(search.results.some(r => /[/-]2483253$/.test(r.url)), 'Ultimate Guitar-resultaat ontbreekt');
for (const [provider, url] of [[ultimateGuitar, 'https://tabs.ultimate-guitar.com/tab/2483253'], [ultimateGuitar, 'https://tabs.ultimate-guitar.com/tab/raffi/baby-beluga-chords-1819796'], [chordie, 'https://www.chordie.com/chord.pere/www.guitaretab.com/d/doe-maar/386571.html']] as const) {
  const preview = await importSong(url);
  assert(preview.draft.body.length > 100);
  assert(preview.draft.body.includes('['));
  assert(!preview.draft.body.includes('[ch]'));
  assert(!/<script|<nav/i.test(preview.draft.body));
  assert.equal(cleanMusic(preview.draft.body).body, preview.draft.body, 'Opschonen moet herhaalbaar zijn');
  console.log(JSON.stringify({ provider: provider.name, title: preview.draft.title, artist: preview.draft.artist, key: preview.draft.key, characters: preview.draft.body.length, warnings: preview.warnings, entities: preview.draft.body.match(/&\w+;/g)?.length ?? 0 }));
}
console.log(JSON.stringify({ results: search.results.length, sources: [...new Set(search.results.map(r => r.source))], warnings: search.warnings }));
