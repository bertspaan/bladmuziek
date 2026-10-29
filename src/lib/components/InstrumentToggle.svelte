<script lang="ts">
  import { useInstrument } from '#lib/instrument.ts';
  const instrument = useInstrument();
</script>
<div class="instrument-toggle" role="group" aria-label="Instrument">
  <button type="button" aria-pressed={$instrument === 'piano'} onclick={() => instrument.set('piano')}>Piano</button>
  <button type="button" aria-pressed={$instrument === 'guitar'} onclick={() => instrument.set('guitar')}>Gitaar</button>
</div>
<style>
  .instrument-toggle { display: inline-flex; gap: 3px; padding: 3px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); }
  button { padding: 8px 12px; min-height: 36px; border-radius: 5px; font-size: 12px; font-weight: 550; color: var(--color-muted); background: transparent; }
  button:hover { background: var(--color-soft); }
  button[aria-pressed='true'] { background: var(--color-accent); color: var(--color-ink); }
</style>
