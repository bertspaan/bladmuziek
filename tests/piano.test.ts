import { describe, expect, it } from 'vitest';
import { noteLabel, pianoVoicings } from '../src/lib/piano';

const right = (symbol: string) => pianoVoicings(symbol)[0].notes.filter(note => note.hand === 'right');
const pitches = (symbol: string) => right(symbol).map(note => note.midi % 12).sort((a, b) => a - b);

describe('piano voicings', () => {
  it.each([
    ['C', [0, 4, 7]], ['Am', [0, 4, 9]], ['Dm7b5', [0, 2, 5, 8]],
    ['G7b9', [5, 7, 8, 11]], ['Bbmaj7', [2, 5, 9, 10]], ['Cdim7', [0, 3, 6, 9]],
    ['Cø', [0, 3, 6, 10]], ['Csus2', [0, 2, 7]], ['G7sus4', [0, 2, 5, 7]],
    ['Caug', [0, 4, 8]], ['C6/9', [0, 2, 4, 9]], ['Cm(maj7)', [0, 3, 7, 11]],
    ['Cadd9', [0, 2, 4, 7]], ['C13', [0, 2, 4, 9, 10]], ['C7#5', [0, 4, 8, 10]]
  ])('plays the expected pitch classes for %s', (symbol, expected) => {
    expect(pitches(symbol)).toEqual(expected);
  });

  it('keeps the slash bass beneath every right-hand variant', () => {
    for (const symbol of ['C/E', 'Am7/G', 'F#7(b9)/A#', 'C/B', 'G/Bb']) {
      const variants = pianoVoicings(symbol);
      expect(variants).toHaveLength(3);
      for (const { notes } of variants) {
        expect(notes[0].hand).toBe('left');
        expect(notes.slice(1).every(note => note.midi > notes[0].midi)).toBe(true);
        expect(notes[0].name.replace('♯', '#').replace('♭', 'b')).toBe(symbol.split('/').at(-1));
      }
    }
  });

  it('creates distinct close positions while preserving chord tones', () => {
    for (const root of ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']) {
      for (const suffix of ['', 'm', '7', 'maj7', 'm7b5', '7b9', '9', '13', 'sus4']) {
        const variants = pianoVoicings(root + suffix);
        expect(new Set(variants.map(v => v.notes.map(n => n.midi).join(','))).size).toBe(3);
        for (const { notes } of variants) {
          const hand = notes.slice(1);
          expect(hand.at(-1)!.midi - hand[0].midi).toBeLessThan(12);
          expect(hand.map(note => note.midi % 12).sort((a, b) => a - b)).toEqual(pitches(root + suffix));
        }
      }
    }
  });

  it('spells chord tones by degree, including enharmonic C boundaries', () => {
    expect(right('F#maj7').map(note => note.name)).toEqual(['F♯', 'A♯', 'C♯', 'E♯']);
    expect(right('Cdim7').map(note => note.name)).toEqual(['C', 'E♭', 'G♭', 'B♭♭']);
    expect(noteLabel({ midi: 60, name: 'B♯', hand: 'right' })).toBe('B♯3');
    expect(noteLabel({ midi: 59, name: 'C♭', hand: 'right' })).toBe('C♭4');
  });

  it('does not guess unsupported or invalid chords', () => {
    for (const symbol of ['N.C.', 'H7', 'Cmystery', 'C7alt', 'Cmajmin']) expect(pianoVoicings(symbol)).toEqual([]);
  });
});
