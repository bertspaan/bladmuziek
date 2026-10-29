<script lang="ts">
  import { pianoVoicings, noteLabel } from '#lib/piano.ts';
  import PianoKeyboard from './PianoKeyboard.svelte';
  import GuitarDiagram from './GuitarDiagram.svelte';
  import { guitarVoicings } from '#lib/guitar.ts';
  import { useInstrument } from '#lib/instrument.ts';
  const instrument = useInstrument();
  import Icon from './Icon.svelte';
  let { chord, onclose }: { chord: string; onclose: () => void } = $props();
  let selected = $state(0);
  let voicings = $derived($instrument === 'piano' ? pianoVoicings(chord) : []);
  let guitar = $derived($instrument === 'guitar' ? guitarVoicings(chord) : []);
  let currentGuitar = $derived(guitar[selected] ?? guitar[0]);
  $effect(() => { chord; $instrument; selected = 0; });
  let current = $derived(voicings[selected] ?? voicings[0]);
</script>
<aside class="voicings no-print" class:guitar={$instrument === 'guitar'} aria-label={$instrument === 'guitar' ? 'Gitaarakkoorden' : 'Piano-akkoorden'}>
  <header><div><p class="eyebrow">{$instrument === 'guitar' ? 'OP DE GITAAR' : 'OP DE PIANO'}</p><h2 aria-live="polite">{chord}</h2></div><button type="button" class="btn icon quiet" onclick={onclose} aria-label="Akkoorddiagram sluiten"><Icon name="close" size={16} /></button></header>
  {#if $instrument === 'guitar'}
    {#if currentGuitar}
      <GuitarDiagram voicing={currentGuitar} />
      <p class="guitar-legend">× niet spelen · ○ open snaar · 1–4 vingers</p>
      <div class="variants" aria-label="Gitaarposities">
        {#each guitar as voicing, index}
          <button type="button" class="variant" class:active={selected === index} aria-pressed={selected === index} onclick={() => selected = index}>
            <span class="variant-name">{voicing.name}{#if selected === index}<Icon name="check" size={14} />{/if}</span>
            <span class="notes fret-list">{voicing.frets.map(fret => fret < 0 ? '×' : fret).join(' · ')}</span>
          </button>
        {/each}
      </div>
      <p class="footnote">Standaardstemming E A D G B e, van dik naar dun. 1 = wijsvinger, 4 = pink. Een balk is een barré. Fretten zijn zonder capo.</p>
    {:else}<p class="unsupported">Voor dit akkoord is nog geen gitaargreep beschikbaar. Kies een ander akkoord of schakel naar piano.</p>{/if}
  {:else if current}
    <PianoKeyboard notes={current.notes} />
    <div class="legend"><span><i class="left"></i>Linkerhand</span><span><i class="right"></i>Rechterhand</span></div>
    <p class="hint">Kies een ligging die prettig speelt.</p>
    <div class="variants" aria-label="Liggingen">
      {#each voicings as voicing, index}
        <button type="button" class="variant" class:active={selected === index} aria-pressed={selected === index} onclick={() => selected = index}>
          <span class="variant-name">{voicing.name}{#if selected === index}<Icon name="check" size={14} />{/if}</span>
          <span class="notes"><span class="bass">{voicing.notes.filter(note => note.hand === 'left').map(noteLabel).join(' · ')}</span><span aria-hidden="true"> / </span>{voicing.notes.filter(note => note.hand === 'right').map(noteLabel).join(' · ')}</span>
        </button>
      {/each}
    </div>
    <p class="footnote">C4 is de centrale C. Speel de bas links en de overige noten rechts.</p>
  {:else}<p class="unsupported">Voor dit akkoord is nog geen pianoligging beschikbaar. Kies een ander akkoord in de muziek.</p>{/if}
</aside>
<style>
  .guitar-legend { text-align: center; font-size: 11px; color: var(--color-muted); margin: 10px 0 16px; }
  .fret-list { font-family: monospace; letter-spacing: .05em; }
  .voicings { padding: 20px; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-paper); }
  header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .eyebrow { font-size: 11px; letter-spacing: .14em; color: var(--color-muted); font-weight: 600; margin-bottom: 6px; }
  h2 { font-family: var(--font-sans); font-size: 30px; font-weight: 600; overflow-wrap: anywhere; }
  header .btn { min-height: 28px; min-width: 28px; padding: 5px; margin: -6px -6px 0 8px; }
  .legend { display: flex; gap: 16px; font-size: 12px; margin: 8px 0 20px; color: var(--color-muted); }
  .legend span { display: flex; gap: 5px; align-items: center; }
  i { width: 8px; height: 8px; border-radius: 2px; }
  .left { background: #9ac5ef; } .right { background: var(--color-accent); }
  .hint { font-size: 12px; color: var(--color-muted); margin-bottom: 10px; }
  .variants { display: grid; gap: 6px; }
  .variant { display: grid; gap: 5px; width: 100%; text-align: left; padding: 12px 14px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-ink); }
  .variant:hover { border-color: var(--color-border-strong); }
  .variant.active { border-color: var(--color-ink); }
  .variant-name { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; }
  .notes { font-size: 12px; line-height: 1.6; color: var(--color-muted); }
  .bass { color: #375e84; }
  .footnote { font-size: 12px; color: var(--color-muted); line-height: 1.6; margin-top: 14px; }
  .unsupported { font-size: 13px; line-height: 1.6; color: var(--color-muted); }
  @media (max-width: 1100px) {
    .voicings { padding: 14px; }
    header { margin-bottom: 10px; }
    .variants { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .variant { padding: 8px; }
    .variant-name { font-size: 11px; gap: 4px; }
    .notes { font-size: 11px; }
    .legend { margin-bottom: 10px; }
    .hint, .footnote { display: none; }
    .guitar { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px 12px; }
    .guitar header { grid-column: 1 / -1; margin-bottom: 0; }
    .guitar .variants { grid-template-columns: 1fr; align-content: center; gap: 4px; }
    .guitar-legend { grid-row: 3; grid-column: 1 / -1; font-size: 10px; margin: 0; }
    .guitar .fret-list { font-size: 10px; letter-spacing: 0; white-space: nowrap; }
    .guitar .unsupported { grid-column: 1 / -1; }
    .voicings:not(.guitar) :global(svg[role='img']) { max-height: 130px; }
  }
</style>
