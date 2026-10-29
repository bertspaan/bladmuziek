import { noteValue } from './music';

export interface PianoNote { midi: number; name: string; hand: 'left' | 'right' }
export interface PianoVoicing { name: string; notes: PianoNote[] }
interface Tone { degree: number; interval: number }
const natural = [0, 2, 4, 5, 7, 9, 11];
const letters = 'CDEFGAB';
const mod = (n: number) => ((n % 12) + 12) % 12;

/** Parse only understood symbols, so unfamiliar chords never get a guessed diagram. */
function parseChord(symbol: string) {
  const clean = symbol.replaceAll('♯', '#').replaceAll('♭', 'b');
  const match = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(clean);
  if (!match) return null;
  const [, rootName, rawSuffix, bassName = rootName] = match;
  const root = noteValue(rootName)!;
  let suffix = rawSuffix.replace(/[()]/g, '');
  const quality = /^(maj|Δ|M|min|m|-|dim|°|ø|aug|\+)/.exec(suffix)?.[0] ?? '';
  suffix = suffix.slice(quality.length);
  const minor = ['min', 'm', '-'].includes(quality);
  const diminished = ['dim', '°', 'ø'].includes(quality);
  const major = ['maj', 'Δ', 'M'].includes(quality);
  const tones = new Map<number, number>([[1, 0], [3, minor || diminished ? 3 : 4], [5, diminished ? 6 : ['aug', '+'].includes(quality) ? 8 : 7]]);
  const majorSeventh = /^(maj|M|Δ)7/.test(suffix);
  if (majorSeventh) suffix = suffix.replace(/^(maj|M|Δ)/, '');
  const extension = /^(13|11|9|7|6|5)/.exec(suffix)?.[0];
  if (extension) {
    suffix = suffix.slice(extension.length);
    if (extension === '5') { tones.delete(3); tones.set(5, 7); }
    else if (extension === '6') tones.set(6, 9);
    else {
      tones.set(7, major || majorSeventh ? 11 : diminished && quality !== 'ø' ? 9 : 10);
      if (+extension >= 9) tones.set(9, 14);
      if (+extension >= 11) tones.set(11, 17);
      if (+extension >= 13) tones.set(13, 21);
    }
  } else if (quality === 'ø') tones.set(7, 10);
  if (extension === '6' && suffix.startsWith('/9')) { tones.set(9, 14); suffix = suffix.slice(2); }
  while (suffix) {
    const token = /^(sus2|sus4|sus|add[#b]?(?:13|11|9|[2456])|(?:omit|no)[135]|[#b](?:13|11|9|5))/.exec(suffix)?.[0];
    if (!token) return null;
    suffix = suffix.slice(token.length);
    if (token.startsWith('sus')) {
      tones.delete(3); tones.set(token === 'sus2' ? 2 : 4, token === 'sus2' ? 2 : 5);
    } else if (/^(omit|no)/.test(token)) tones.delete(+token.slice(-1));
    else {
      const [, accidental, degreeText] = /^(?:add)?([#b]?)(\d+)$/.exec(token)!;
      const degree = +degreeText;
      tones.set(degree, natural[(degree - 1) % 7] + Math.floor((degree - 1) / 7) * 12 + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0));
    }
  }
  return { root, rootName, bass: noteValue(bassName)!, bassName, tones: [...tones].map(([degree, interval]) => ({ degree, interval })) };
}

function toneName(rootName: string, root: number, tone: Tone) {
  const index = (letters.indexOf(rootName[0]) + tone.degree - 1) % 7;
  let difference = mod(root + tone.interval - natural[index]);
  if (difference > 6) difference -= 12;
  return letters[index] + (difference > 0 ? '♯'.repeat(difference) : '♭'.repeat(-difference));
}

export function pianoVoicings(symbol: string): PianoVoicing[] {
  const chord = parseChord(symbol);
  if (!chord || chord.tones.length < 2) return [];
  // Keep extended chords within a hand: omit the perfect fifth, and the 11th in 13ths.
  const tones = chord.tones.filter(tone => !(chord.tones.length > 4 && tone.degree === 5 && tone.interval === 7) && !(chord.tones.some(t => t.degree === 13) && tone.degree === 11));
  const ordered = tones.map(tone => ({ offset: mod(tone.interval), name: toneName(chord.rootName, chord.root, tone) })).sort((a, b) => a.offset - b.offset);
  const bassMidi = 48 + chord.bass - (chord.bass > 7 ? 12 : 0);
  const names = ['Basisligging', 'Tweede ligging', 'Derde ligging'];
  return ordered.slice(0, 3).map((_, inversion) => {
    const rotated = [...ordered.slice(inversion), ...ordered.slice(0, inversion).map(tone => ({ ...tone, offset: tone.offset + 12 }))];
    let rootMidi = 60 + chord.root;
    while (rootMidi + rotated[0].offset > 65) rootMidi -= 12;
    while (rootMidi + rotated[0].offset <= bassMidi) rootMidi += 12;
    return { name: names[inversion], notes: [
      { midi: bassMidi, name: chord.bassName.replace('#', '♯').replace('b', '♭'), hand: 'left' },
      ...rotated.map(tone => ({ midi: rootMidi + tone.offset, name: tone.name, hand: 'right' as const }))
    ] };
  });
}

export function noteLabel(note: PianoNote) {
  // MIDI determines the played octave; the spelling can cross a C boundary (B♯ / C♭).
  const letter = letters.indexOf(note.name[0]);
  const accidental = [...note.name.slice(1)].reduce((n, char) => n + (char === '♯' ? 1 : -1), 0);
  return `${note.name}${Math.floor((note.midi - natural[letter] - accidental) / 12) - 1}`;
}

/** Use the diagram's playable tones, accepting omitted extension tones when supplied. */
export function chordPitches(symbol: string) {
  const chord = parseChord(symbol);
  const voicing = pianoVoicings(symbol)[0];
  if (!chord || !voicing) return null;
  return {
    required: [...new Set(voicing.notes.map(note => note.midi % 12))],
    allowed: [...new Set([chord.bass, ...chord.tones.map(tone => mod(chord.root + tone.interval))])],
    bass: /\/[A-G][#b♯♭]?$/.test(symbol) ? chord.bass : null
  };
}
