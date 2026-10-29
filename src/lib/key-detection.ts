import { isChord, keyOptions, noteValue } from './music';

/** Conservative harmonic estimate of the written chords, independent of capo. */
export function detectKey(body: string): string {
  const chords = [...body.replace(/```[\s\S]*?```/g, '').matchAll(/\[([^\]\n]+)\]/g)]
    .map(match => match[1]).filter(isChord).flatMap(chord => {
      const match = /^([A-G][#b]?)(.*)$/.exec(chord.replaceAll('♯', '#').replaceAll('♭', 'b'))!;
      const suffix = match[2].replace(/\/[A-G][#b]?$/, '');
      if (/sus|aug|dim|ø|°|\+|no|omit/.test(suffix)) return [];
      return [{ root: noteValue(match[1])!, minor: /^(?:m(?!aj)|min|-)/.test(suffix), dominant: /^7/.test(suffix) }];
    });
  if (chords.length < 4 || new Set(chords.map(c => c.root)).size < 3) return '';
  const ranked = keyOptions.map(key => {
    const tonic = noteValue(key)!;
    const minor = key.endsWith('m');
    const scale = minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    const minorDegrees = minor ? [0, 3, 4] : [1, 2, 5];
    let score = 0, matched = 0, cadences = 0;
    chords.forEach((chord, i) => {
      const degree = (chord.root - tonic + 12) % 12;
      const index = scale.indexOf(degree);
      const harmonicDominant = minor && degree === 7 && !chord.minor;
      const fits = harmonicDominant || (index >= 0 && minorDegrees.includes(index) === chord.minor && index !== (minor ? 1 : 6) && (!chord.dominant || degree === 7));
      score += fits ? 1 : -1;
      if (fits) matched++;
      if (degree === 0 && chord.minor === minor) {
        score += 0.3;
        if (i === 0) score += 1;
        if (i === chords.length - 1) score += 2;
        const previous = chords[i - 1];
        if (previous && (previous.root - tonic + 12) % 12 === 7 && !previous.minor) { score += 1.5; cadences++; }
      }
    });
    return { key, score: score / chords.length, coverage: matched / chords.length, cadences };
  }).sort((a, b) => b.score - a.score);
  const [best, runnerUp] = ranked;
  return best.coverage >= 0.8 && best.cadences > 0 && best.score - runnerUp.score >= 0.2 ? best.key : '';
}
