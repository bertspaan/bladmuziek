import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, rm, mkdir, rename, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SongStore } from '../src/lib/server/store';
import { emptyDraft } from '../src/lib/types';
import { filterSongs, parseTags, folderTree } from '../src/lib/organization';
let directory: string, store: SongStore;
const draft = { ...emptyDraft(), title: 'Eigen lied', artist: 'Test', body: '[C]Hallo' };
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'bladmuziek-mappen-')); store = new SongStore(directory); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
describe('Tags en mappen', () => {
  it('maakt echte submappen en schrijft tags als YAML', async () => {
    const song = await store.save({ ...draft, folder: 'Piano/Jazz', tags: ['#jazz', 'oefenen', 'Jazz'] });
    expect(song.filename).toBe('Piano/Jazz/Test - Eigen lied.md');
    expect(song.tags).toEqual(['jazz', 'oefenen']);
    expect(await readFile(join(directory, song.filename), 'utf8')).toContain('tags:\n  - jazz\n  - oefenen');
    expect(await store.organization()).toEqual({ folders: ['Piano', 'Piano/Jazz'], tags: ['jazz', 'oefenen'] });
  });
  it('verplaatst een nummer zonder ID, voorkeur of onbekende metadata te verliezen', async () => {
    let song = await store.save({ ...draft, tags: ['folk'] });
    const oldPath = join(directory, song.filename);
    await writeFile(oldPath, (await readFile(oldPath, 'utf8')).replace('title:', 'custom: bewaren\n# Mijn opmerking\ntitle:'));
    song = await store.get(song.id);
    song = await store.preference(song.id, song.revision, 2);
    const moved = await store.save({ ...song, folder: 'Optredens/2026', tags: ['folk', 'klaar'] }, { id: song.id, revision: song.revision });
    expect(moved.id).toBe(song.id); expect(moved.preferredTranspose).toBe(2);
    expect(moved.filename).toBe('Optredens/2026/Test - Eigen lied.md');
    await expect(readFile(oldPath)).rejects.toMatchObject({ code: 'ENOENT' });
    const content = await readFile(join(directory, moved.filename), 'utf8');
    expect(content).toContain('custom: bewaren'); expect(content).toContain('# Mijn opmerking');
    expect((await store.list()).songs).toHaveLength(1);
    const back = await store.save({ ...moved, folder: '' }, { id: moved.id, revision: moved.revision });
    expect(back.filename).toBe('Test - Eigen lied.md');
  });
  it('overschrijft geen bestaande naam in de doelmap', async () => {
    const existing = await store.save({ ...draft, folder: 'Jazz', body: 'Bewaren' });
    const song = await store.save(draft);
    const moved = await store.save({ ...song, folder: 'Jazz' }, { id: song.id, revision: song.revision });
    expect(moved.filename).toBe('Jazz/Test - Eigen lied (2).md');
    expect((await store.get(existing.id)).body).toBe('Bewaren');
  });
  it('leest externe tags en verplaatsingen opnieuw en weigert een verouderde opslag', async () => {
    const song = await store.save(draft);
    await mkdir(join(directory, 'Gitaar'));
    const path = join(directory, 'Gitaar', song.filename);
    await rename(join(directory, song.filename), path);
    await expect(store.save({ ...song, folder: 'Piano' }, { id: song.id, revision: song.revision })).rejects.toMatchObject({ status: 409 });
    await writeFile(path, (await readFile(path, 'utf8')).replace('tags: []', 'tags: [folk, oefenen/gitaar]'));
    const fresh = await store.get(song.id);
    expect(fresh.folder).toBe('Gitaar'); expect(fresh.tags).toEqual(['folk', 'oefenen/gitaar']);
    expect((await store.list()).songs).toHaveLength(1);
  });
  it('behoudt organisatie bij oudere API-clients en transpositie', async () => {
    const song = await store.save({ ...draft, folder: 'Piano', tags: ['folk'] });
    const { folder, tags, ...legacy } = song;
    const saved = await store.save(legacy, { id: song.id, revision: song.revision });
    const preferred = await store.preference(saved.id, saved.revision, 1);
    expect(preferred.folder).toBe('Piano'); expect(preferred.tags).toEqual(['folk']);
  });
  it.each(['../buiten', '/tmp/buiten', 'Piano/../../buiten', '.obsidian', 'Piano//Jazz', 'Piano/./Jazz', 'Piano\\Jazz'])('weigert onveilige map %s', async folder => {
    await expect(store.save({ ...draft, folder })).rejects.toMatchObject({ status: 400 });
  });
  it('volgt geen symlinks naar andere mappen', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'bladmuziek-buiten-'));
    try {
      await writeFile(join(outside, 'Privé.md'), 'Privé');
      await symlink(outside, join(directory, 'Link'));
      expect((await store.list()).songs).toHaveLength(0);
      await expect(store.save({ ...draft, folder: 'Link/Nieuw' })).rejects.toMatchObject({ status: 400 });
      await expect(readFile(join(outside, 'Nieuw', 'Test - Eigen lied.md'))).rejects.toMatchObject({ code: 'ENOENT' });
    } finally { await rm(outside, { recursive: true, force: true }); }
  });
  it('leest handmatige bestanden met dezelfde naam in verschillende mappen apart', async () => {
    for (const folder of ['Piano', 'Gitaar']) { await mkdir(join(directory, folder)); await writeFile(join(directory, folder, 'Lied.md'), '[C]Hallo'); }
    const { songs } = await store.list();
    expect(songs).toHaveLength(2); expect(new Set(songs.map(song => song.id)).size).toBe(2);
  });
  it('combineert tekst, map en tagfilters en neemt submappen mee', () => {
    const songs = [
      { ...draft, folder: 'Piano/Jazz', tags: ['oefenen'] },
      { ...draft, folder: 'Piano', tags: ['klaar'] },
      { ...draft, folder: '', tags: ['oefenen'] }
    ];
    expect(filterSongs(songs, 'jazz', 'Piano', 'oefenen')).toEqual([songs[0]]);
    expect(filterSongs(songs, '', 'Piano', '')).toHaveLength(2);
    expect(filterSongs(songs, '', '', '')).toEqual([songs[2]]);
    expect(filterSongs(songs, 'klaar', '*', '')).toEqual([songs[1]]);
    expect(parseTags('#folk, oefenen folk')).toEqual(['folk', 'oefenen']);
  });
});

describe('Mappenbeheer vanuit de bibliotheek', () => {
  it('maakt lege en geneste mappen zichtbaar en weigert dubbele namen', async () => {
    expect(await store.createFolder('Piano/Jazz')).toEqual({ folder: 'Piano/Jazz' });
    expect((await store.list()).folders).toEqual(['Piano', 'Piano/Jazz']);
    expect((await store.list()).songs).toHaveLength(0);
    await expect(store.createFolder('Piano/Jazz')).rejects.toMatchObject({ status: 409 });
  });
  it.each(['', '../buiten', '.verborgen', '/tmp/test', 123, null])('weigert ongeldige map %s', async folder => {
    await expect(store.createFolder(folder)).rejects.toMatchObject({ status: 400 });
  });
  it('verplaatst met alleen ID, versie en doelmap en behoudt de metadata', async () => {
    await store.createFolder('Gitaar');
    const song = await store.save({ ...draft, tags: ['folk'] });
    const moved = await store.move(song.id, song.revision, 'Gitaar');
    expect(moved.filename).toBe('Gitaar/Test - Eigen lied.md');
    expect(moved.tags).toEqual(['folk']); expect(moved.body).toBe(song.body);
    expect((await store.list()).songs).toHaveLength(1);
    await expect(readFile(join(directory, song.filename))).rejects.toMatchObject({ code: 'ENOENT' });
    const same = await store.move(moved.id, moved.revision, 'Gitaar');
    expect(same.revision).toBe(moved.revision);
    const back = await store.move(moved.id, moved.revision, '');
    expect(back.folder).toBe('');
  });
  it('weigert slepen met een verouderde versie en bewaart externe wijzigingen', async () => {
    await store.createFolder('Gitaar');
    const song = await store.save(draft);
    const path = join(directory, song.filename);
    await writeFile(path, (await readFile(path, 'utf8')).replace('[C]Hallo', '[Am]Nieuw'));
    await expect(store.move(song.id, song.revision, 'Gitaar')).rejects.toMatchObject({ status: 409 });
    expect((await store.get(song.id)).folder).toBe('');
    expect((await store.get(song.id)).body).toBe('[Am]Nieuw');
  });
  it('weigert onveilige, verwijderde en symlink-doelmappen', async () => {
    const song = await store.save(draft);
    await expect(store.move(song.id, song.revision, '../buiten')).rejects.toMatchObject({ status: 400 });
    await expect(store.move(song.id, song.revision, 'Bestaat niet')).rejects.toMatchObject({ status: 404 });
    await symlink(tmpdir(), join(directory, 'Link'));
    await expect(store.createFolder('Link/Test')).rejects.toMatchObject({ status: 400 });
    await expect(store.move(song.id, song.revision, 'Link')).rejects.toMatchObject({ status: 400 });
  });
  it('bouwt de zichtbare hiërarchie zonder gedeelde voorvoegsels te verwarren', () => {
    expect(folderTree(['Piano/Jazz', 'Piano/Klassiek', 'Pianoles', 'Piano'])).toEqual([
      { name: 'Piano', path: 'Piano', children: [
        { name: 'Jazz', path: 'Piano/Jazz', children: [] },
        { name: 'Klassiek', path: 'Piano/Klassiek', children: [] }
      ] }, { name: 'Pianoles', path: 'Pianoles', children: [] }
    ]);
  });
});
