<script lang="ts">
  import { noteLabel, type PianoNote } from '#lib/piano.ts';
  let { notes }: { notes: PianoNote[] } = $props();
  const black = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
  let first = $derived(Math.min(...notes.map(note => note.midi)) - 2);
  let start = $derived(first - (black(first) ? 1 : 0));
  let last = $derived(Math.max(start + 24, Math.max(...notes.map(note => note.midi)) + 2));
  let end = $derived(last + (black(last) ? 1 : 0));
  let whites = $derived(Array.from({ length: end - start + 1 }, (_, i) => start + i).filter(midi => !black(midi)));
  let blacks = $derived(Array.from({ length: end - start }, (_, i) => start + i).filter(black));
  let width = $derived(whites.length * 20);
</script>
<svg viewBox={`0 0 ${width} 138`} role="img" aria-label={`Piano: ${notes.map(note => `${noteLabel(note)} (${note.hand === 'left' ? 'linkerhand' : 'rechterhand'})`).join(', ')}`}>
  {#each whites as midi, i}
    {@const note = notes.find(note => note.midi === midi)}
    <rect x={i * 20 + .5} y=".5" width="19" height="112" rx="2" class="white" class:left={note?.hand === 'left'} class:right={note?.hand === 'right'} />
    {#if note}<text x={i * 20 + 10} y="100" class="key-name">{note.name}</text>{/if}
    {#if midi % 12 === 0}<text x={i * 20 + 10} y="130" class="octave">C{midi / 12 - 1}</text>{/if}
  {/each}
  {#each blacks as midi}
    {@const note = notes.find(note => note.midi === midi)}
    {@const x = whites.filter(white => white < midi).length * 20}
    <rect x={x - 6} y=".5" width="12" height="68" rx="2" class="black" class:left={note?.hand === 'left'} class:right={note?.hand === 'right'} />
    {#if note}<circle cx={x} cy="57" r="2" class="marker" />{/if}
  {/each}
</svg>
<style>
  svg { display: block; width: 100%; overflow: visible; }
  rect { stroke: var(--color-border-strong); stroke-width: .7; }
  .white { fill: white; }
  .black { fill: var(--color-ink); stroke: var(--color-ink); }
  .left { fill: #9ac5ef; stroke: #527ca3; }
  .right { fill: var(--color-accent); stroke: #939800; }
  text { text-anchor: middle; font-family: var(--font-sans); }
  .key-name { font-size: 10px; font-weight: 650; fill: var(--color-ink); }
  .octave { font-size: 10px; fill: var(--color-muted); }
  .marker { fill: var(--color-ink); }
</style>
