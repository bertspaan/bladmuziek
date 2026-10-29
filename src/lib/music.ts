const pitch: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const sharps = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const flats = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
export const keyOptions = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];
const chordPattern = /^[A-G][#b]?(?:maj|min|m|M|dim|aug|sus|add|omit|no|ø|°|Δ|\+|-|[0-9#b()/])*(?:\/[A-G][#b]?)?$/;
const normalize = (value: string) => value.replaceAll('♯', '#').replaceAll('♭', 'b');
export function isChord(value: string) { return chordPattern.test(normalize(value)); }
export function noteValue(value: string): number | null {
  const match = /^([A-G])([#b]?)(?:m)?$/.exec(normalize(value));
  return match ? (pitch[match[1]] + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0) + 12) % 12 : null;
}
export function preferFlats(key: string) { return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm', 'Dm', 'Gm'].includes(key); }
export function transposeChord(chord: string, semitones: number, useFlats?: boolean): string {
  if (semitones % 12 === 0) return chord;
  const clean = normalize(chord);
  if (!isChord(clean)) return chord;
  const names = (useFlats ?? clean.includes('b')) ? flats : sharps;
  return clean.replace(/(^|\/)([A-G])([#b]?)/g, (_, prefix: string, root: string, accidental: string) => {
    const value = pitch[root] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
    return prefix + names[((value + semitones) % 12 + 12) % 12];
  });
}
export function transposeKey(key: string, semitones: number) {
  const value = noteValue(key);
  if (value === null || semitones % 12 === 0) return key;
  return keyOptions[((value + semitones) % 12 + 12) % 12 + (key.endsWith('m') ? 12 : 0)];
}
export function transposeBody(body: string, semitones: number, key = '') {
  const target = key ? transposeKey(key, semitones) : '';
  return body.replace(/\[([^\]\n]+)\]/g, (_, chord: string) => `[${transposeChord(chord, semitones, target ? preferFlats(target) : undefined)}]`);
}
export interface MusicSection { title: string; lines: string[] }
export function sections(body: string): MusicSection[] {
  const result: MusicSection[] = [];
  let section: MusicSection = { title: '', lines: [] };
  let code = false;
  for (const line of body.replaceAll('\r', '').split('\n')) {
    if (line.startsWith('```')) code = !code;
    const heading = !code && /^#{1,6}\s+(.+)/.exec(line);
    if (heading) {
      if (section.title || section.lines.some(Boolean)) result.push(section);
      section = { title: heading[1], lines: [] };
    } else section.lines.push(line);
  }
  if (section.title || section.lines.some(Boolean)) result.push(section);
  return result;
}
export interface Segment { chord: string; text: string }
export function words(line: string): Segment[][] {
  const result: Segment[][] = [];
  let word: Segment[] = [];
  for (const token of line.match(/\[[^\]]*\]|[^\s\[]+|\[|\s+/g) ?? []) {
    if (/^\s+$/.test(token)) { if (word.length) result.push(word); word = []; }
    else if (token.startsWith('[') && token.endsWith(']') && isChord(token.slice(1, -1))) word.push({ chord: token.slice(1, -1), text: '' });
    else if (word.length) word[word.length - 1].text += token;
    else word.push({ chord: '', text: token });
  }
  if (word.length) result.push(word);
  return result;
}

/** Convert legacy chords-over-lyrics without collapsing alignment spaces first. */
export function cleanMusic(input: string): { body: string; warnings: string[] } {
  const warnings = new Set<string>();
  let text = input.replaceAll('\r', '').replace(/\[\/?(?:ch|tab)\]/g, '');
  text = text.split('\n').map(line => line.replace(/\t/g, '    ').trimEnd()).join('\n');
  const lines = text.split('\n');
  const output: string[] = [];
  let code = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) { code = !code; output.push(line); continue; }
    if (/^\s*\{eot\}\s*$/i.test(line)) { output.push('```'); code = false; continue; }
    if (code) { output.push(line); continue; }
    const directive = /^\s*\{(start_of_chorus|soc|start_of_verse|sov|start_of_bridge|sob|comment|c)(?::\s*(.*?))?\}\s*$/i.exec(line);
    if (directive) { output.push(`## ${directive[2] || (/chorus|soc/.test(directive[1]) ? 'Refrein' : /bridge|sob/.test(directive[1]) ? 'Bridge' : 'Couplet')}`); continue; }
    if (/^\s*\{sot\}\s*$/i.test(line)) { output.push('```text'); code = true; continue; }
    if (/^\s*\{(?:end_of_\w+|eoc|eov|eob|(?:title|t|artist|subtitle|st|key|k|capo):.*)\}\s*$/i.test(line)) continue;
    if (/^\s*\[[^\]]+\]\s*$/.test(line) && !isChord(line.trim().slice(1, -1))) { output.push(`## ${line.trim().slice(1, -1)}`); continue; }
    const chords = [...line.matchAll(/\S+/g)];
    const chordLine = chords.length > 0 && chords.every(m => isChord(m[0]) || /^[|:%\-]+$/.test(m[0]) || /^(?:N\.?C\.?|x\d+)$/.test(m[0]));
    if (chordLine) {
      const next = lines[i + 1];
      const nextTokens = next?.trim().split(/\s+/) ?? [];
      const nextIsChords = nextTokens.length > 0 && nextTokens.every(x => isChord(x) || /^[|:%\-]+$/.test(x) || /^(?:N\.?C\.?|x\d+)$/.test(x));
      const chordOnlyExtras = chords.some(m => !isChord(m[0]));
      if (next?.trim() && !nextIsChords && !/^[\s]*[#{\[]/.test(next) && !chordOnlyExtras && !next.includes('[')) {
        let merged = next;
        for (const chord of chords.toReversed()) {
          const position = chord.index!;
          merged = merged.padEnd(position, ' ');
          merged = merged.slice(0, position) + `[${chord[0]}]` + merged.slice(position);
        }
        output.push(merged.trimEnd()); i++;
      } else output.push(line.replace(/\S+/g, token => isChord(token) ? `[${token}]` : token));
    } else {
      output.push(line);
      if (/^[A-G][#b]?\S*\s{2,}/.test(line) && !line.includes('[')) warnings.add('Een regel kon niet zeker als akkoordregel worden herkend. Controleer het voorbeeld.');
      if (/^\s*\{/.test(line)) warnings.add('Onbekende ChordPro-aanwijzingen zijn als tekst behouden.');
    }
  }
  const body = output.join('\n').replace(/\n{4,}/g, '\n\n\n').trim();
  for (const [, chord] of body.matchAll(/\[([^\]\n]+)\]/g)) if (!isChord(chord)) warnings.add(`“${chord}” is als tekst behouden en wordt niet getransponeerd.`);
  return { body, warnings: [...warnings] };
}
