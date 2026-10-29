import { chordPitches } from './piano';
import { noteValue } from './music';

/** Standard tuning, from the lowest/thickest string to the highest/thinnest. */
export const guitarTuning = [40, 45, 50, 55, 59, 64];
export const guitarStrings = ['E', 'A', 'D', 'G', 'B', 'e'];
export interface GuitarVoicing {
  name: string;
  frets: number[]; // -1 = muted, 0 = open
  fingers: number[];
  startFret: number;
  barre: { fret: number; from: number; to: number } | null;
}
// Familiar open chords and first-position barres take precedence when available.
const familiar = new Set([
  '-1,3,2,0,1,0', '-1,-1,0,2,3,2', '-1,-1,0,2,3,1', '0,2,2,1,0,0', '0,2,2,0,0,0',
  '-1,0,2,2,2,0', '-1,0,2,2,1,0', '3,2,0,0,0,3', '1,3,3,2,1,1', '-1,2,4,4,3,2',
  '-1,-1,0,2,1,2', '0,2,0,1,0,0', '0,2,0,0,0,0', '-1,0,2,0,2,0', '-1,0,2,0,1,0',
  '3,2,0,0,0,1', '-1,3,2,0,0,0', '-1,-1,0,2,2,2', '-1,-1,0,2,1,1', '-1,0,2,1,2,0'
]);
const cache = new Map<string, GuitarVoicing[]>();

function fingerShape(frets: number[]) {
  const pressed = frets.map((fret, string) => ({ fret, string })).filter(note => note.fret > 0);
  const fingers = frets.map(() => 0);
  if (!pressed.length) return { fingers, barre: null };
  const min = Math.min(...pressed.map(note => note.fret));
  const lowest = pressed.filter(note => note.fret === min);
  const from = lowest[0].string, to = lowest.at(-1)!.string;
  const barre = lowest.length > 1 && (pressed.length > 4 || to - from + 1 === lowest.length) && frets.slice(from, to + 1).every(fret => fret >= min) ? { fret: min, from, to } : null;
  let finger = 1;
  if (barre) { for (const note of lowest) fingers[note.string] = 1; finger++; }
  for (const note of pressed.sort((a, b) => a.fret - b.fret || a.string - b.string)) {
    if (!fingers[note.string]) fingers[note.string] = finger++;
  }
  return finger > 5 ? null : { fingers, barre };
}

export function guitarVoicings(symbol: string): GuitarVoicing[] {
  const cached = cache.get(symbol);
  if (cached) return cached;
  const chord = chordPitches(symbol);
  const root = noteValue(/^([A-G][#b♯♭]?)/.exec(symbol)?.[1] ?? '');
  if (!chord || root === null) return [];
  const bass = chord.bass ?? root;
  const required = chord.required;
  const candidates = new Map<string, GuitarVoicing & { score: number }>();
  for (let position = 1; position <= 10; position++) {
    const options = guitarTuning.map(open => [-1, 0, ...Array.from({ length: 4 }, (_, i) => position + i)]
      .filter(fret => fret < 0 || chord.allowed.includes((open + fret) % 12)));
    function visit(frets: number[], pitches: Set<number>, started: boolean, ended: boolean) {
      const string = frets.length;
      if (string === 6) {
        if (frets.filter(fret => fret >= 0).length < 3 || !required.every(pitch => pitches.has(pitch))) return;
        const shape = fingerShape(frets);
        if (!shape) return;
        const pressed = frets.filter(fret => fret > 0);
        const low = pressed.length ? Math.min(...pressed) : 1;
        const high = Math.max(0, ...pressed);
        const id = frets.join(',');
        const score = (familiar.has(id) ? -100 : 0) + high * 2 + (high - low) * 2 + frets.filter(fret => fret < 0).length * 3 + Math.max(...shape.fingers) + (shape.barre ? 2 : 0);
        candidates.set(id, { name: '', frets, ...shape, startFret: high <= 4 ? 1 : low, score });
        return;
      }
      for (const fret of options[string]) {
        if (fret >= 0 && ended) continue; // Avoid shapes requiring muted strings between sounding strings.
        const midi = guitarTuning[string] + fret;
        if (fret >= 0 && !started && midi % 12 !== bass) continue;
        // Enforce the actual lowest pitch, including slash chords, even across differently fretted strings.
        if (fret >= 0 && started) {
          const first = frets.findIndex(value => value >= 0);
          if (midi < guitarTuning[first] + frets[first]) continue;
        }
        visit([...frets, fret], fret >= 0 ? new Set([...pitches, midi % 12]) : pitches, started || fret >= 0, ended || (started && fret < 0));
      }
    }
    visit([], new Set(), false, false);
  }
  const ranked = [...candidates.values()].sort((a, b) => a.score - b.score || a.frets.join(',').localeCompare(b.frets.join(',')));
  const selected: typeof ranked = [];
  for (const candidate of ranked) {
    if (selected.every(other => Math.abs(candidate.startFret - other.startFret) >= 2)) selected.push(candidate);
    if (selected.length === 3) break;
  }
  for (const candidate of ranked) {
    if (selected.length === 3) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  const result = selected.map(({ score: _, ...voicing }, index) => ({ ...voicing, name: `Greep ${index + 1}${voicing.frets.includes(0) && Math.max(...voicing.frets) <= 4 ? ' · open' : ` · fret ${Math.min(...voicing.frets.filter(fret => fret > 0))}`}` }));
  if (cache.size >= 200) cache.clear();
  cache.set(symbol, result);
  return result;
}
