import { randomUUID, createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile, rename, unlink, link, lstat } from 'node:fs/promises';
import { resolve, join, basename as pathBasename } from 'node:path';
import { homedir } from 'node:os';
import { parseDocument, Document } from 'yaml';
import { z } from 'zod';
import type { Song, SongDraft } from '../types';
import { noteValue } from '../music';
import { AppError } from './errors';
import { parseTags, validFolder, validTag } from '../organization';

export const draftSchema = z.object({
  tags: z.array(z.string()).transform(parseTags).refine(tags => tags.length <= 50 && tags.every(validTag), 'Gebruik tags zonder spaties of leestekens, bijvoorbeeld folk of oefenen/piano.').optional(),
  folder: z.string().trim().refine(validFolder, 'Gebruik een mapnaam binnen Bladmuziek, bijvoorbeeld Piano/Jazz.').optional(),
  title: z.string().trim().min(1, 'Vul een titel in.').max(200),
  artist: z.string().trim().max(200),
  key: z.string().trim().refine(k => !k || noteValue(k) !== null, 'Gebruik een toonsoort zoals C, Bb of Am.'),
  capo: z.number().int().min(0).max(12).nullable(),
  sourceUrl: z.string().max(2000).refine(s => !s || /^https?:\/\//.test(s), 'Gebruik een volledige bron-URL.'),
  body: z.string().trim().min(1, 'Voeg lyrics of akkoorden toe.').max(200_000)
});
const digest = (text: string) => createHash('sha256').update(text).digest('hex');
const str = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback;
const date = (value: unknown) => value instanceof Date ? value.toISOString() : str(value);
const slug = (text: string) => text.replace(/[<>:"/\\|?*\x00-\x1F]/g, '').replace(/\s+/g, ' ').trim().slice(0, 90) || 'Nummer';
const songSlug = (song: SongDraft) => [song.artist, song.title].filter(Boolean).join('-').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '') || 'nummer';
interface RecordData { song: Song; document: Document; path: string }

export function canonicalSource(input: string) {
  if (!input) return '';
  try {
    const u = new URL(input);
    const id = u.hostname === 'tabs.ultimate-guitar.com' && /^\/tab\/(?:.*-)?(\d+)\/?$/.exec(u.pathname)?.[1];
    if (id) return `https://tabs.ultimate-guitar.com/tab/${id}`;
    u.hash = ''; u.search = ''; u.protocol = 'https:';
    return u.toString().replace(/\/$/, '');
  } catch { return input; }
}

export class SongStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(public directory: string) { this.directory = resolve(directory); }
  private async records(): Promise<{ records: RecordData[]; warnings: string[]; folders: string[] }> {
    const records: RecordData[] = []; const warnings: string[] = []; const folders: string[] = [];
    const files: { name: string; folder: string }[] = [];
    const walk = async (folder: string) => {
      let entries;
      try { entries = await readdir(await this.folderPath(folder), { withFileTypes: true }); }
      catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return; warnings.push(`Map ${folder || 'Bladmuziek'} kon niet worden gelezen.`); return; }
      for (const entry of entries.sort((a,b) => a.name.localeCompare(b.name))) {
        if (entry.name.startsWith('.')) continue;
        if (entry.isDirectory()) {
          const child = folder ? `${folder}/${entry.name}` : entry.name;
          if (validFolder(child)) { folders.push(child); await walk(child); }
        } else if (entry.isFile() && entry.name.endsWith('.md')) files.push({ name: entry.name, folder });
      }
    };
    await walk('');
    for (const entry of files) {
      const filename = entry.folder ? `${entry.folder}/${entry.name}` : entry.name;
      try {
        const path = join(await this.folderPath(entry.folder), entry.name);
        if (!(await lstat(path)).isFile()) continue;
        const raw = await readFile(path, 'utf8');
        const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(raw);
        const document = frontmatter ? parseDocument(frontmatter[1]) : new Document({});
        if (document.errors.length || (document.contents && !document.toJSON()) || (document.contents && (Array.isArray(document.toJSON()) || typeof document.toJSON() !== 'object'))) throw new Error('Ongeldige YAML');
        const meta = document.toJSON() || {};
        const id = str(meta.id) || digest(filename).slice(0, 24);
        if (!/^[\w-]{1,80}$/.test(id) || records.some(r => r.song.id === id)) throw new Error('Dubbel of ongeldig ID');
        const key = str(meta.key);
        const song: Song = {
          id, slug: '', folder: entry.folder, tags: parseTags(Array.isArray(meta.tags) ? meta.tags.filter((tag: unknown) => typeof tag === 'string') : str(meta.tags)), title: str(meta.title, entry.name.replace(/\.md$/, '')), artist: str(meta.artist),
          key: noteValue(key) !== null ? key : '', capo: Number.isInteger(meta.capo) && meta.capo >= 0 && meta.capo <= 12 ? meta.capo : null,
          sourceUrl: str(meta.source_url), body: raw.slice(frontmatter?.[0].length ?? 0).trim(),
          createdAt: date(meta.created_at), updatedAt: date(meta.updated_at),
          preferredTranspose: Number.isInteger(meta.preferred_transpose) ? ((meta.preferred_transpose % 12) + 12) % 12 : 0,
          revision: digest(`${filename}\0${raw}`), filename
        };
        records.push({ song, document, path });
      } catch { warnings.push(`${filename} kon niet worden gelezen. Controleer de metadata in Obsidian.`); }
    }
    const bases = new Set(records.map(r => songSlug(r.song)));
    const used = new Set<string>();
    for (const { song } of [...records].sort((a, b) => a.song.createdAt.localeCompare(b.song.createdAt) || a.song.filename.localeCompare(b.song.filename))) {
      const base = songSlug(song);
      let candidate = base;
      let version = 2;
      while (used.has(candidate)) {
        do { candidate = `${base}-${version++}`; } while (bases.has(candidate));
      }
      song.slug = candidate;
      used.add(candidate);
    }
    return { records, warnings, folders };
  }
  async list() { const { records, warnings, folders } = await this.records(); return { songs: records.map(r => r.song), warnings, folders }; }
  async organization() { const { songs, folders } = await this.list(); return { folders, tags: [...new Set(songs.flatMap(song => song.tags))].sort((a,b) => a.localeCompare(b, 'nl')) }; }
  private async folderPath(folder: string, create = false): Promise<string> {
    if (!validFolder(folder)) throw new AppError(400, 'Ongeldige mapnaam.');
    if (create) await mkdir(this.directory, { recursive: true });
    let path = this.directory;
    for (const part of folder ? folder.split('/') : []) {
      path = join(path, part);
      if (create) { try { await mkdir(path); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; } }
      const info = await lstat(path);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new AppError(400, 'Kies een gewone submap binnen Bladmuziek.');
    }
    return path;
  }
  async get(id: string) {
    const { records } = await this.records();
    const record = records.find(r => r.song.id === id);
    if (!record) throw new AppError(404, 'Dit nummer is niet gevonden. Mogelijk is het bestand verplaatst.');
    return record.song;
  }
  async getBySlug(slug: string) {
    const { songs } = await this.list();
    const song = songs.find(song => song.slug === slug);
    if (!song) throw new AppError(404, 'Dit nummer is niet gevonden.');
    return song;
  }
  async findSource(url: string) { if (!url) return undefined; const { songs } = await this.list(); return songs.find(s => canonicalSource(s.sourceUrl) === canonicalSource(url)); }
  private serialized<T>(fn: () => Promise<T>): Promise<T> { const result = this.queue.then(fn); this.queue = result.catch(() => {}); return result; }
  async save(input: unknown, options: { id?: string; revision?: string; allowDuplicate?: boolean } = {}): Promise<Song> {
    const parsed = draftSchema.safeParse(input);
    if (!parsed.success) throw new AppError(400, parsed.error.issues[0].message);
    return this.serialized(async () => {
      const { records } = await this.records();
      const current = options.id ? records.find(r => r.song.id === options.id) : undefined;
      if (options.id && !current) throw new AppError(404, 'Dit nummer bestaat niet meer.');
      if (current && current.song.revision !== options.revision) throw new AppError(409, 'Dit bestand is ondertussen gewijzigd. Laad de nieuwste versie voordat je opslaat.');
      const draft: SongDraft = { ...parsed.data, tags: parsed.data.tags ?? current?.song.tags ?? [], folder: parsed.data.folder ?? current?.song.folder ?? '' };
      const duplicate = draft.sourceUrl && records.find(r => canonicalSource(r.song.sourceUrl) === canonicalSource(draft.sourceUrl));
      if (!options.id && duplicate && !options.allowDuplicate) throw new AppError(409, 'Deze bron staat al in je bibliotheek.', { existing: { id: duplicate.song.id, slug: duplicate.song.slug, title: duplicate.song.title } });
      return this.write(draft, current);
    });
  }
  async createFolder(input: unknown): Promise<{ folder: string }> {
    if (typeof input !== 'string' || !input.trim() || !validFolder(input.trim())) throw new AppError(400, 'Vul een geldige mapnaam in.');
    const folder = input.trim();
    return this.serialized(async () => {
      try {
        await this.folderPath(folder);
        throw new AppError(409, 'Deze map bestaat al.');
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      await this.folderPath(folder, true);
      return { folder };
    });
  }
  async move(id: string, revision: string, folder: unknown): Promise<Song> {
    if (typeof folder !== 'string' || !validFolder(folder)) throw new AppError(400, 'Ongeldige doelmap.');
    return this.serialized(async () => {
      const { records } = await this.records();
      const current = records.find(record => record.song.id === id);
      if (!current) throw new AppError(404, 'Dit nummer bestaat niet meer.');
      if (current.song.revision !== revision) throw new AppError(409, 'Dit bestand is ondertussen gewijzigd. Laad de bibliotheek opnieuw.');
      try { await this.folderPath(folder); } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AppError(404, 'De doelmap bestaat niet meer.');
        throw error;
      }
      if (current.song.folder === folder) return current.song;
      return this.write({ ...current.song, folder }, current);
    });
  }
  async preference(id: string, revision: string, transpose: number): Promise<Song> {
    if (!Number.isInteger(transpose) || Math.abs(transpose) > 120) throw new AppError(400, 'Ongeldige transpositie.');
    return this.serialized(async () => {
      const { records } = await this.records();
      const current = records.find(r => r.song.id === id);
      if (!current) throw new AppError(404, 'Dit nummer bestaat niet meer.');
      if (current.song.revision !== revision) throw new AppError(409, 'Dit bestand is ondertussen gewijzigd. Laad de nieuwste versie voordat je opslaat.');
      return this.write(current.song, current, ((transpose % 12) + 12) % 12);
    });
  }
  private async write(draft: SongDraft, current?: RecordData, transpose?: number): Promise<Song> {
    const destination = await this.folderPath(draft.folder, true);
    const id = current?.song.id ?? randomUUID();
    const timestamp = new Date().toISOString();
    const document = current?.document ?? new Document({});
    const data = { id, title: draft.title, artist: draft.artist, key: draft.key, capo: draft.capo, source_url: draft.sourceUrl, tags: draft.tags,
      created_at: current?.song.createdAt || timestamp, updated_at: timestamp, preferred_transpose: transpose ?? current?.song.preferredTranspose ?? 0 };
    for (const [key, value] of Object.entries(data)) {
      if (JSON.stringify(document.toJSON()?.[key]) !== JSON.stringify(value)) document.set(key, value);
    }
    const basename = [draft.artist, draft.title].filter(Boolean).map(slug).join(' - ').replace(/^\.+/, '') || 'Nummer';
    let filename = current?.song.filename ?? `${basename}.md`;
    const moving = !!current && current.song.folder !== draft.folder;
    const target = current?.path ?? join(destination, filename);
    const temp = join(this.directory, `.bladmuziek-${randomUUID()}.tmp`);
    const content = `---\n${document.toString()}---\n\n${draft.body}\n`;
    try {
      await writeFile(temp, content, { flag: 'wx', mode: 0o600 });
      if (current) {
        let latest: string;
        try { await this.folderPath(current.song.folder); if (!(await lstat(target)).isFile()) throw new Error(); latest = await readFile(target, 'utf8'); } catch { throw new AppError(409, 'Het bestand is ondertussen verplaatst. Laad de bibliotheek opnieuw.'); }
        if (digest(`${current.song.filename}\0${latest}`) !== current.song.revision) throw new AppError(409, 'Dit bestand is ondertussen gewijzigd. Laad de nieuwste versie voordat je opslaat.');
        if (!moving) await rename(temp, target);
      }
      if (!current || moving) {
        for (let version = 1; ; version++) {
          const base = current ? pathBasename(current.song.filename, '.md') : basename;
          filename = `${base}${version === 1 ? '' : ` (${version})`}.md`;
          try { await link(temp, join(destination, filename)); break; }
          catch (e) { if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e; }
        }
        if (current) {
          try {
            const latest = await readFile(current.path, 'utf8');
            if (digest(`${current.song.filename}\0${latest}`) !== current.song.revision) throw new AppError(409, 'Dit bestand is ondertussen gewijzigd. Laad de nieuwste versie voordat je opslaat.');
            await unlink(current.path);
          } catch (e) { await unlink(join(destination, filename)); throw e; }
        }
      }
    } finally { await unlink(temp).catch(() => {}); }
    return this.get(id);
  }
}
export const store = new SongStore(process.env.MUSIC_DIR || join(homedir(), 'Documents/Obsidian/Bladmuziek'));
