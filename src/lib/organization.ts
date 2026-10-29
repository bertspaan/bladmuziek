export function parseTags(value: string | string[]): string[] {
  const tags = (Array.isArray(value) ? value : value.split(/[,\s]+/)).map(tag => tag.trim().replace(/^#+/, '')).filter(Boolean);
  return tags.filter((tag, index) => tags.findIndex(other => other.toLocaleLowerCase() === tag.toLocaleLowerCase()) === index);
}
export function validFolder(folder: string) {
  return folder === '' || (folder.length <= 240 && folder.split('/').every(part => part.length > 0 && !part.startsWith('.') && part === part.trim() && !/[<>:"\\|?*\x00-\x1f]/.test(part)));
}
export function validTag(tag: string) {
  return tag.length <= 100 && /^[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*$/u.test(tag) && /[^\d/]/.test(tag);
}
export function filterSongs<T extends { title: string; artist: string; body: string; tags: string[]; folder: string }>(songs: T[], query: string, folder: string, tag: string): T[] {
  const fold = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('nl');
  return songs.filter(song => (folder === '*' || song.folder === folder || (!!folder && song.folder.startsWith(`${folder}/`))) && (!tag || song.tags.includes(tag)) && fold(`${song.title} ${song.artist} ${song.tags.join(' ')} ${song.folder} ${song.body.replace(/\[[^\]]*\]/g, '')}`).includes(fold(query)));
}
export interface FolderNode { name: string; path: string; children: FolderNode[] }
export function folderTree(paths: string[]): FolderNode[] {
  const roots: FolderNode[] = [];
  for (const path of [...paths].sort((a, b) => a.localeCompare(b, 'nl', { numeric: true }))) {
    let children = roots, current = '';
    for (const name of path.split('/')) {
      current = current ? `${current}/${name}` : name;
      let node = children.find(child => child.name === name);
      if (!node) { node = { name, path: current, children: [] }; children.push(node); }
      children = node.children;
    }
  }
  return roots;
}
