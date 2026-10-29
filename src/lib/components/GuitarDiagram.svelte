<script lang="ts">
  import { guitarStrings, type GuitarVoicing } from '#lib/guitar.ts';
  let { voicing }: { voicing: GuitarVoicing } = $props();
  const x = (string: number) => 48 + string * 30;
  const y = (fret: number, start: number) => 68 + (fret - start) * 40;
</script>
<svg viewBox="0 0 246 262" role="img" aria-label={`Gitaar, van lage E naar hoge e: ${voicing.frets.map((fret, i) => `${guitarStrings[i]} ${fret < 0 ? 'niet spelen' : fret === 0 ? 'open' : `fret ${fret}, vinger ${voicing.fingers[i]}`}`).join(', ')}${voicing.barre ? `. Barré op fret ${voicing.barre.fret}` : ''}`}>
  {#each [0, 1, 2, 3, 4] as fret}
    <line x1="48" x2="198" y1={48 + fret * 40} y2={48 + fret * 40} class:nut={fret === 0 && voicing.startFret === 1} />
  {/each}
  {#each guitarStrings as name, string}
    <line x1={x(string)} x2={x(string)} y1="48" y2="208" style:stroke-width={1.7 - string * .2} />
    <text x={x(string)} y="234" class="string-name">{name}</text>
    <text x={x(string)} y="254" class="tab-number">{voicing.frets[string] < 0 ? '×' : voicing.frets[string]}</text>
    {#if voicing.frets[string] <= 0}<text x={x(string)} y="30" class="open-muted">{voicing.frets[string] < 0 ? '×' : '○'}</text>{/if}
  {/each}
  <text x="25" y="73" class="fret-number">{voicing.startFret}</text>
  {#if voicing.barre}
    <line x1={x(voicing.barre.from)} x2={x(voicing.barre.to)} y1={y(voicing.barre.fret, voicing.startFret)} y2={y(voicing.barre.fret, voicing.startFret)} class="barre" />
  {/if}
  {#each voicing.frets as fret, string}
    {#if fret > 0}
      <circle cx={x(string)} cy={y(fret, voicing.startFret)} r="11" />
      <text x={x(string)} y={y(fret, voicing.startFret) + 4} class="finger">{voicing.fingers[string]}</text>
    {/if}
  {/each}
</svg>
<style>
  svg { display: block; width: 100%; max-width: 240px; margin: 0 auto; }
  line { stroke: var(--color-border-strong); stroke-width: 1; }
  .nut { stroke: var(--color-ink); stroke-width: 5; }
  .barre { stroke: var(--color-accent); stroke-width: 20; stroke-linecap: round; }
  circle { fill: var(--color-accent); stroke: #939800; stroke-width: .7; }
  text { text-anchor: middle; font-family: var(--font-sans); fill: var(--color-muted); font-size: 12px; }
  .open-muted { font-size: 20px; fill: var(--color-ink); }
  .finger { fill: var(--color-ink); font-weight: 650; font-size: 12px; }
  .tab-number { fill: var(--color-ink); font-family: monospace; }
  @media (max-width: 1100px) { svg { max-width: 180px; } }
</style>
