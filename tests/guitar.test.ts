import { describe, expect, it } from 'vitest';
import { guitarVoicings, guitarTuning } from '../src/lib/guitar';
import { chordPitches } from '../src/lib/piano';
import { noteValue } from '../src/lib/music';

describe('guitar positions', () => {
  it.each([
    ['C', [-1, 3, 2, 0, 1, 0]], ['D', [-1, -1, 0, 2, 3, 2]], ['E', [0, 2, 2, 1, 0, 0]],
    ['Am', [-1, 0, 2, 2, 1, 0]], ['G', [3, 2, 0, 0, 0, 3]], ['F', [1, 3, 3, 2, 1, 1]]
  ])('prefers the familiar shape for %s', (symbol, frets) => {
    expect(guitarVoicings(symbol)[0].frets).toEqual(frets);
  });

  it('shows conventional separate fingers for open D and an index barre for F', () => {
    expect(guitarVoicings('D')[0].barre).toBeNull();
    expect(guitarVoicings('D')[0].fingers).toEqual([0, 0, 0, 1, 3, 2]);
    expect(guitarVoicings('F')[0].barre).toEqual({ fret: 1, from: 0, to: 5 });
    expect(guitarVoicings('F')[0].fingers).toEqual([1, 3, 4, 2, 1, 1]);
  });

  it('provides distinct, reachable shapes with the required notes and no unwanted pitches', () => {
    for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      for (const suffix of ['', 'm', '7', 'maj7', 'm7', 'm7b5', '7b9', 'dim7', 'sus4', '6', '13']) {
        const symbol = root + suffix;
        const chord = chordPitches(symbol)!;
        const voicings = guitarVoicings(symbol);
        expect(voicings.length, symbol).toBeGreaterThan(0);
        expect(voicings.length).toBeLessThanOrEqual(3);
        expect(new Set(voicings.map(v => v.frets.join(','))).size).toBe(voicings.length);
        for (const voicing of voicings) {
          const pitches = voicing.frets.flatMap((fret, i) => fret < 0 ? [] : [guitarTuning[i] + fret]);
          expect(pitches.length).toBeGreaterThanOrEqual(3);
          expect(Math.min(...pitches) % 12).toBe(noteValue(root));
          expect(chord.required.every(pitch => pitches.some(note => note % 12 === pitch)), symbol).toBe(true);
          expect(pitches.every(pitch => chord.allowed.includes(pitch % 12)), symbol).toBe(true);
          const pressed = voicing.frets.filter(fret => fret > 0);
          expect(Math.max(...pressed) - Math.min(...pressed)).toBeLessThanOrEqual(3);
          expect(voicing.fingers.every(finger => finger >= 0 && finger <= 4)).toBe(true);
          voicing.frets.forEach((fret, string) => {
            if (fret > 0) {
              expect(voicing.fingers[string]).toBeGreaterThan(0);
              expect(fret).toBeGreaterThanOrEqual(voicing.startFret);
              expect(fret).toBeLessThan(voicing.startFret + 4);
            } else expect(voicing.fingers[string]).toBe(0);
          });
          if (voicing.barre) {
            const { from, to, fret } = voicing.barre;
            expect(voicing.frets.slice(from, to + 1).every(value => value >= fret)).toBe(true);
          }
        }
      }
    }
  });

  it.each(['C/E', 'G/B', 'Am7/G', 'C/Bb', 'F#7(b9)/A#'])('respects the actual lowest note for %s', symbol => {
    const voicings = guitarVoicings(symbol);
    expect(voicings.length).toBeGreaterThan(0);
    for (const { frets } of voicings) {
      const notes = frets.flatMap((fret, i) => fret < 0 ? [] : [guitarTuning[i] + fret]);
      expect(Math.min(...notes) % 12).toBe(noteValue(symbol.split('/').at(-1)!));
    }
  });

  it('handles Unicode accidentals and returns no diagram for unsupported symbols', () => {
    expect(guitarVoicings('B♭m7')).toEqual(guitarVoicings('Bbm7'));
    expect(guitarVoicings('N.C.')).toEqual([]);
    expect(guitarVoicings('C7alt')).toEqual([]);
  });
});
