<script lang="ts">
  import { useInstrument } from '#lib/instrument.ts';
  const instrument = useInstrument();
  import { sections, words, transposeBody } from '#lib/music.ts';
  let { body, transpose = 0, musicalKey = '', fontSize = 18, selectedChord = '', onchord }: { body: string; transpose?: number; musicalKey?: string; fontSize?: number; selectedChord?: string; onchord?: (chord: string, button: HTMLButtonElement) => void } = $props();
  let content = $derived(sections(transposeBody(body, transpose, musicalKey)));
</script>
<div class="sheet" style:--music-size={`${fontSize}px`}>
  {#each content as section}
    <section class="music-section" class:long={section.lines.length > 18}>
      {#if section.title}<h3>{section.title}</h3>{/if}
      {#each section.lines as line, index}
        {@const code = section.lines.slice(0, index).filter(l => l.startsWith('```')).length % 2 === 1}
        {#if line.startsWith('```')}{:else if code}<pre class="music-line tab-line">{line || '\u00a0'}</pre>{:else if !line.trim()}<div class="blank-line" aria-hidden="true"></div>
        {:else if /^[eEBGDA][|:]|^\s*[-|\d]{6,}/.test(line)}<pre class="music-line tab-line">{line}</pre>
        {:else}<div class="music-line">{#each words(line) as word}<span class="music-word">{#each word as part}<span class="music-fragment">{#if part.chord}{#if onchord}<button type="button" class="chord" class:selected={part.chord === selectedChord} aria-label={`Bekijk ${part.chord} op de ${$instrument === 'guitar' ? 'gitaar' : 'piano'}`} aria-pressed={part.chord === selectedChord} onclick={(event) => onchord?.(part.chord, event.currentTarget)}>{part.chord}</button>{:else}<span class="chord">{part.chord}</span>{/if}{/if}<span class="lyric">{part.text || '\u00a0'}</span></span>{/each}</span>{/each}</div>{/if}
      {/each}
    </section>
  {/each}
</div>
<style>
  .sheet { font-size: var(--music-size, 18px); line-height: 1.5; color: var(--color-ink); }
  .music-section { margin-bottom: 1.7em; }
  h3 { font-family: var(--font-sans); text-transform: uppercase; letter-spacing: .13em; font-size: .56em; color: var(--color-muted); font-weight: 600; margin: 0 0 1.4em; }
  .music-line { display: flex; flex-wrap: wrap; align-items: flex-end; column-gap: .27em; row-gap: .2em; margin: .2em 0; }
  .music-word { display: inline-flex; align-items: end; max-width: 100%; }
  .music-fragment { display: inline-grid; grid-template-rows: auto auto; align-items: end; min-width: 0; }
  .chord { grid-row: 1; font: 600 .71em/1.65 var(--font-sans); color: var(--color-ink); padding-right: .25em; white-space: nowrap; min-height: 1.65em; }
  button.chord { justify-self: start; background: transparent; border: 0; border-radius: 3px; text-align: left; padding-block: 0; padding-left: 0; text-decoration: underline; text-decoration-color: var(--color-border); text-underline-offset: 3px; }
  button.chord:hover, button.chord.selected { background: var(--color-accent); text-decoration-color: transparent; }
  .lyric { grid-row: 2; font-family: var(--font-serif); overflow-wrap: anywhere; }
  .blank-line { height: .65em; }
  .blank-line:first-child, .blank-line:last-child { display: none; }
  .tab-line { display: block; font: .65em/1.5 monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
  @media print { .sheet { color: black; } .chord { color: #222; background: transparent !important; text-decoration: none !important; } h3 { color: #555; } }
</style>
