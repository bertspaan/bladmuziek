export interface SongDraft {
  tags: string[];
  folder: string;
  title: string;
  artist: string;
  key: string;
  capo: number | null;
  sourceUrl: string;
  body: string;
}
export interface Song extends SongDraft {
  id: string;
  slug: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
  preferredTranspose: number;
  filename: string;
}
export interface SearchResult {
  title: string;
  artist: string;
  url: string;
  source: string;
  detail?: string;
}
export interface ImportPreview {
  draft: SongDraft;
  warnings: string[];
  existing?: { id: string; slug: string; title: string };
}
export const emptyDraft = (): SongDraft => ({ tags: [], folder: '', title: '', artist: '', key: '', capo: null, sourceUrl: '', body: '' });
