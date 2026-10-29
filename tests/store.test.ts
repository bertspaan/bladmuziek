import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SongStore, canonicalSource } from '../src/lib/server/store';
import type { SongDraft } from '../src/lib/types';
let directory: string; let store: SongStore;
const draft: SongDraft = { tags: [], folder: '', title: 'Eigen melodie', artist: 'Test', key: 'C', capo: 2, sourceUrl: 'https://tabs.ultimate-guitar.com/tab/2483253', body: '## Couplet\nEen [C]eigen [G]regel.' };
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'bladmuziek-test-')); store = new SongStore(directory); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
describe('Markdown-opslag', () => {
  it('schrijft leesbare Markdown en leest wijzigingen vanuit Obsidian opnieuw', async () => {
    const song = await store.save(draft);
    const path = join(directory, song.filename);
    const original = await readFile(path, 'utf8');
    expect(original).toContain('title: Eigen melodie');
    await writeFile(path, original.replace('Een [C]eigen', 'Een [Am]andere'));
    expect((await store.get(song.id)).body).toContain('[Am]andere');
    expect((await store.get(song.id)).revision).not.toBe(song.revision);
  });
  it('weigert verouderde writes en behoudt onbekende metadata', async () => {
    const song = await store.save(draft); const path = join(directory, song.filename);
    await writeFile(path, (await readFile(path, 'utf8')).replace('title:', 'categories: [oefenen]\n# Mijn opmerking\ntitle:'));
    await expect(store.save({ ...draft, title: 'Niet opslaan' }, { id: song.id, revision: song.revision })).rejects.toMatchObject({ status: 409 });
    const fresh = await store.get(song.id);
    await store.save({ ...fresh, title: 'Nieuwe titel' }, { id: fresh.id, revision: fresh.revision });
    const raw = await readFile(path, 'utf8');
    expect(raw).toContain('categories: [ oefenen ]'); expect(raw).toContain('# Mijn opmerking');
    expect((await store.list()).songs[0].title).toBe('Nieuwe titel');
  });
  it('detecteert dubbele bron-URLs en laat bewust een aparte versie toe', async () => {
    await store.save(draft);
    const other = { ...draft, sourceUrl: 'https://tabs.ultimate-guitar.com/tab/andre-hazes/uit-mijn-bol-chords-2483253?foo=bar' };
    await expect(store.save(other)).rejects.toMatchObject({ status: 409 });
    await store.save(other, { allowDuplicate: true });
    expect((await store.list()).songs).toHaveLength(2);
    expect(canonicalSource(other.sourceUrl)).toBe(draft.sourceUrl);
  });
  it('slaat de voorkeur op zonder de oorspronkelijke akkoorden te veranderen', async () => {
    const song = await store.save(draft);
    const preferred = await store.preference(song.id, song.revision, -1);
    expect(preferred.preferredTranspose).toBe(11); expect(preferred.body).toBe(draft.body);
    await expect(store.preference(song.id, song.revision, 2)).rejects.toMatchObject({ status: 409 });
  });
  it('serialiseert gelijktijdige wijzigingen', async () => {
    const song = await store.save(draft);
    const results = await Promise.allSettled([store.preference(song.id, song.revision, 1), store.preference(song.id, song.revision, 2)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect((await readdir(directory)).filter(f => f.endsWith('.tmp'))).toHaveLength(0);
  });
  it('leest handmatig aangemaakte bestanden en isoleert kapotte bestanden', async () => {
    await writeFile(join(directory, 'Handmatig.md'), '---\ntitle: Handmatig\nartist: Ik\n---\n\n[C]Hallo');
    await writeFile(join(directory, 'Fout.md'), '---\ntitle: [fout\n---\n[G]Hallo');
    await symlink('/etc/hosts', join(directory, 'Link.md'));
    const result = await store.list(); expect(result.songs).toHaveLength(1); expect(result.warnings).toHaveLength(1);
    const song = result.songs[0];
    await store.save(song, { id: song.id, revision: song.revision });
    expect((await store.get(song.id)).body).toBe('[C]Hallo');
  });
  it('valideert inhoud en maakt bestandsnamen veilig', async () => {
    await expect(store.save({ ...draft, body: '' })).rejects.toMatchObject({ status: 400 });
    const song = await store.save({ ...draft, title: '../../Muziek', artist: '/tmp/anders' });
    expect(song.filename).not.toContain('/');
  });
});

describe('Leesbare nummerlinks', () => {
  it('gebruikt artiest en titel zonder accenten of IDs', async () => {
    const song = await store.save({ ...draft, artist: 'André Hazes', title: 'Uit Mijn Bol' });
    expect(song.slug).toBe('andre-hazes-uit-mijn-bol');
    expect((await store.getBySlug(song.slug)).id).toBe(song.id);
    await expect(store.getBySlug(song.id)).rejects.toMatchObject({ status: 404 });
  });
  it('maakt verschillende links voor gelijke namen en bestaande volgnummers', async () => {
    for (const title of ['Eigen melodie', 'Eigen melodie', 'Eigen melodie 2', 'Eigen melodie']) {
      await store.save({ ...draft, title, sourceUrl: '' });
    }
    const { songs } = await store.list();
    expect(new Set(songs.map(s => s.slug)).size).toBe(4);
    expect(songs.map(s => s.slug)).toEqual(expect.arrayContaining(['test-eigen-melodie', 'test-eigen-melodie-2', 'test-eigen-melodie-3', 'test-eigen-melodie-4']));
    for (const song of songs) expect((await store.getBySlug(song.slug)).id).toBe(song.id);
  });
  it('past links aan na bewerken in de app of Obsidian en behoudt bestanden', async () => {
    const original = await store.save(draft);
    const changed = await store.save({ ...original, title: 'Nieuwe titel' }, { id: original.id, revision: original.revision });
    expect(changed.slug).toBe('test-nieuwe-titel');
    expect(changed.filename).toBe(original.filename);
    await expect(store.getBySlug(original.slug)).rejects.toMatchObject({ status: 404 });
    const path = join(directory, changed.filename);
    await writeFile(path, (await readFile(path, 'utf8')).replace('artist: Test', 'artist: Iemand anders'));
    expect((await store.getBySlug('iemand-anders-nieuwe-titel')).id).toBe(original.id);
  });
  it('maakt links zonder artiest en behoudt niet-Latijnse titels', async () => {
    const song = await store.save({ ...draft, artist: '', title: 'Lied / voor jou!' });
    expect(song.slug).toBe('lied-voor-jou');
    const other = await store.save({ ...draft, artist: '', title: '春天', sourceUrl: '' });
    expect((await store.getBySlug(other.slug)).title).toBe('春天');
  });
  it('geeft ook bij dubbele bronmeldingen de leesbare link terug', async () => {
    await store.save(draft);
    await expect(store.save(draft)).rejects.toMatchObject({ details: { existing: { slug: 'test-eigen-melodie' } } });
  });
});

describe('Bestandsnamen zonder IDs', () => {
  it('gebruikt artiest en titel, of alleen titel bij onbekende artiest', async () => {
    const song = await store.save({ ...draft, artist: 'André Hazes', title: 'Uit Mijn Bol' });
    expect(song.filename).toBe('André Hazes - Uit Mijn Bol.md');
    const anonymous = await store.save({ ...draft, artist: '', sourceUrl: '' });
    expect(anonymous.filename).toBe('Eigen melodie.md');
  });
  it('nummert dubbele namen zonder bestaande bestanden te overschrijven', async () => {
    const first = await store.save(draft);
    const original = await readFile(join(directory, first.filename), 'utf8');
    await writeFile(join(directory, 'Test - Eigen melodie (2).md'), 'Mijn eigen bestand');
    const second = await store.save({ ...draft, body: '[G]Andere versie' }, { allowDuplicate: true });
    expect(second.filename).toBe('Test - Eigen melodie (3).md');
    expect(await readFile(join(directory, first.filename), 'utf8')).toBe(original);
    expect(await readFile(join(directory, 'Test - Eigen melodie (2).md'), 'utf8')).toBe('Mijn eigen bestand');
  });
  it('voorkomt overschrijven bij gelijktijdige nieuwe bestanden', async () => {
    const otherStore = new SongStore(directory);
    const songs = await Promise.all([store.save({ ...draft, sourceUrl: '' }), otherStore.save({ ...draft, sourceUrl: '' })]);
    expect(new Set(songs.map(song => song.filename)).size).toBe(2);
    expect((await store.list()).songs).toHaveLength(2);
  });
});
