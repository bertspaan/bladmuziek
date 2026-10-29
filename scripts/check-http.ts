import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import type { Song } from '../src/lib/types';
// Only for the isolated development server, never the real vault.
const base = 'http://127.0.0.1:3101';
const directory = '/tmp/bladmuziek-browser-qa';
const sourceUrl = 'https://example.com/bladmuziek-http-test';
async function call(path: string, method = 'GET', data?: unknown, origin = base) {
  const response = await fetch(base + path, { method, headers: data ? { 'Content-Type': 'application/json', Origin: origin } : undefined, body: data ? JSON.stringify(data) : undefined });
  return { status: response.status, data: await response.json() };
}
const draft = { title: 'HTTP-controle', artist: 'Test', key: 'Am', capo: 2, body: '## Couplet\nEen [Am]eigen [G/B]regel.', sourceUrl };
const create = await call('/api/songs', 'POST', { draft });
assert.equal(create.status, 200);
const song: Song = create.data;
const path = join(directory, song.filename);
try {
  const raw = await readFile(path, 'utf8');
  assert(raw.includes('HTTP-controle'));
  const denied = await call(`/api/songs/${song.id}`, 'PUT', { draft, revision: song.revision }, 'https://untrusted.example');
  assert.equal(denied.status, 403);
  await writeFile(path, raw.replace('title: HTTP-controle', 'title: Obsidian-controle\ntags: [oefenen]'));
  const conflict = await call(`/api/songs/${song.id}`, 'PUT', { draft, revision: song.revision });
  assert.equal(conflict.status, 409);
  const current = await call(`/api/songs/${song.id}`);
  assert.equal(current.data.title, 'Obsidian-controle');
  const updated = await call(`/api/songs/${song.id}`, 'PATCH', { revision: current.data.revision, transpose: 3 });
  assert.equal(updated.status, 200); assert.equal(updated.data.preferredTranspose, 3);
  assert((await readFile(path, 'utf8')).includes('tags: [ oefenen ]'));
  const duplicate = await call('/api/songs', 'POST', { draft });
  assert.equal(duplicate.status, 409); assert.equal(duplicate.data.details.existing.id, song.id);
  const invalid = await call('/api/import', 'POST', { url: 'http://127.0.0.1/secret' });
  assert.equal(invalid.status, 400);
  const missing = await call('/api/songs/not-found');
  assert.equal(missing.status, 404);
  console.log('HTTP: create, disk readback, Obsidian edit, conflict, preference, unknown metadata, duplicate, origin and URL checks passed.');
} finally { await unlink(path); }
