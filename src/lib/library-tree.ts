import { folderTree, type FolderNode } from './organization.ts';
import type { Song } from './types.ts';

export type LibraryRow =
  | { type: 'folder'; path: string; name: string; depth: number }
  | { type: 'song'; song: Song; depth: number };

export function libraryRows(folders: string[], songs: Song[], collapsed: string[], root = ''): LibraryRow[] {
  const closed = new Set(collapsed);
  const songsByFolder = new Map<string, Song[]>();
  for (const song of songs) {
    const entries = songsByFolder.get(song.folder) ?? [];
    entries.push(song);
    songsByFolder.set(song.folder, entries);
  }
  let nodes = folderTree(folders);
  if (root) {
    let path = '';
    for (const part of root.split('/')) {
      path = path ? `${path}/${part}` : part;
      nodes = nodes.find(node => node.path === path)?.children ?? [];
    }
  }
  const rows: LibraryRow[] = [];
  function append(children: FolderNode[], path: string, depth: number) {
    for (const child of children) {
      rows.push({ type: 'folder', path: child.path, name: child.name, depth });
      if (!closed.has(child.path)) append(child.children, child.path, depth + 1);
    }
    for (const song of songsByFolder.get(path) ?? []) rows.push({ type: 'song', song, depth });
  }
  append(nodes, root, 0);
  return rows;
}
