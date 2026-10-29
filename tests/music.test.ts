import { describe, it, expect } from 'vitest';
import { cleanMusic, isChord, transposeChord, transposeBody, transposeKey, words } from '../src/lib/music';
describe('transponeren', () => {
  it('verplaatst grondtoon en slash-bas, maar bewaart uitbreidingen', () => {
    expect(transposeChord('Am7/G', 1, true)).toBe('Bbm7/Ab');
    expect(transposeChord('F#7(b9)/A#', -1)).toBe('F7(b9)/A');
    expect(transposeChord('Bbmaj7', 2, true)).toBe('Cmaj7');
    expect(transposeChord('Gsus4', 2)).toBe('Asus4');
    expect(transposeChord('C6/9', 2)).toBe('D6/9');
    expect(transposeChord('Cm7b5/Bb', 2, true)).toBe('Dm7b5/C');
  });
  it('laat onbekende akkoorden en lyrics intact', () => {
    expect(transposeBody('Een [C]regel [mysterie] met [G/B]tekst', 2, 'C')).toBe('Een [D]regel [mysterie] met [A/C#]tekst');
    expect(isChord('Couplet')).toBe(false);
    expect(isChord('N.C.')).toBe(false);
  });
  it('gebruikt altijd de oorspronkelijke tekst, ook na een octaaf', () => {
    expect(transposeChord('C♯m', 12)).toBe('C♯m');
    expect(transposeBody('[Db]tekst', 0)).toBe('[Db]tekst');
    expect(transposeKey('Am', -1)).toBe('G#m');
    expect(transposeKey('C', 1)).toBe('Db');
  });
});
describe('opschonen en uitlijnen', () => {
  it('plaatst akkoorden op dezelfde karakterpositie', () => {
    expect(cleanMusic('[Verse 1]\n[ch]C[/ch]       [ch]G[/ch]\nEen lange regel').body).toBe('## Verse 1\n[C]Een lang[G]e regel');
  });
  it('bewaart akkoordregels zonder lyrics en muzikale tekens', () => {
    expect(cleanMusic('C  Am  | G\n\n## Outro\n[C]tekst').body).toBe('[C]  [Am]  | [G]\n\n## Outro\n[C]tekst');
    expect(cleanMusic('C  Am\nF  G\n\n').body).toBe('[C]  [Am]\n[F]  [G]');
  });
  it('laat inline akkoorden intact bij opnieuw opschonen', () => {
    const body = '## Couplet\nEen [Am]regel met [G/B]akkoorden';
    expect(cleanMusic(body).body).toBe(body);
  });
  it('houdt akkoorden midden in een woord aan de juiste lettergreep', () => {
    expect(words('Een ge[C]deel[G]te')).toEqual([[{ chord: '', text: 'Een' }], [{ chord: '', text: 'ge' }, { chord: 'C', text: 'deel' }, { chord: 'G', text: 'te' }]]);
  });
  it('meldt onbekende inline akkoorden', () => {
    expect(cleanMusic('Een [Cwat]woord').warnings).toHaveLength(1);
  });
  it('verwijdert metadata en bewaart tabnotatie als code', () => {
    expect(cleanMusic('{t:Test}\n{st:Artiest}\n{soc}\n[C]Hoi\n{eoc}\n{sot}\ne|--1--2--|\n{eot}').body).toBe('## Refrein\n[C]Hoi\n```text\ne|--1--2--|\n```');
  });
});
