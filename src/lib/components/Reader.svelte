<script lang="ts">
  import { untrack } from 'svelte';
  import { refreshAll } from '$app/navigation';
  import { api, ApiError } from '#lib/client.ts';
  import type { Song } from '#lib/types.ts';
  import { keyOptions, transposeKey, noteValue } from '#lib/music.ts';
  import Icon from './Icon.svelte';
  import Sheet from './Sheet.svelte';
  import * as Select from './ui/select/index.ts';
  let { song }: { song: Song } = $props();
  let transpose = $state(untrack(() => song.preferredTranspose));
  $effect(() => { song.revision; transpose = song.preferredTranspose; });
  let fontSize = $state(22);
  let saving = $state(false); let status = $state(''); let conflict = $state(false);
  let currentKey = $derived(song.key ? transposeKey(song.key, transpose) : '');
  let options = $derived([...new Set([currentKey, ...keyOptions.filter(k => k.endsWith('m') === song.key.endsWith('m') && noteValue(k) !== noteValue(currentKey))])].filter(Boolean));
  const offset = (n: number) => ((n % 12) + 12) % 12;
  function shift(n: number) { transpose = offset(transpose + n); status = ''; }
  function setKey(value: string) { transpose = offset(noteValue(value)! - noteValue(song.key)!); status = ''; }
  async function savePreference() {
    saving = true; status = ''; conflict = false;
    try { await api(`/api/songs/${song.id}`, 'PATCH', { revision: song.revision, transpose }); await refreshAll(); }
    catch (e) { status = (e as Error).message; conflict = e instanceof ApiError && e.status === 409; }
    finally { saving = false; }
  }
</script>
<div class="page reader-page">
  <header class="reader-heading">
    <a class="btn icon back no-print" href="/" aria-label="Terug naar bibliotheek" title="Bibliotheek"><Icon name="back" size={18} /></a>
    <div class="song-title" title={[song.title, song.artist].filter(Boolean).join(' · ')}><h1>{song.title}</h1>{#if song.artist}<span class="artist">{song.artist}</span>{/if}</div>
    <button class="btn icon save-preference no-print" aria-label="Bewaar als voorkeur" title="Bewaar als voorkeur" disabled={saving || transpose === song.preferredTranspose} onclick={savePreference}>{#if saving}<span class="spinner"></span>{:else}<Icon name="save" size={17} />{/if}</button>
    <div class="transpose-controls no-print">
      <button class="btn icon" aria-label="Een halve toon lager" title="Een halve toon lager" onclick={() => shift(-1)}>−1</button>
      {#if song.key}
        <Select.Root type="single" value={currentKey} onValueChange={(value) => { if (value) setKey(value); }} items={options.map(key => ({ value: key, label: key }))}>
          <Select.Trigger aria-label="Toonsoort" class="w-22 shrink-0 gap-3 bg-background px-3 font-semibold data-[size=default]:h-9">
            <span class="flex-1 text-center">{currentKey}</span>
          </Select.Trigger>
          <Select.Content align="center" class="min-w-28 p-1">
            {#each options as key (key)}<Select.Item value={key} label={key} class="min-h-9 pl-3">{key}</Select.Item>{/each}
          </Select.Content>
        </Select.Root>
      {:else}<span class="offset" aria-label="Transpositie">{transpose === 0 ? '0' : `+${transpose}`}</span>{/if}
      <button class="btn icon" aria-label="Een halve toon hoger" title="Een halve toon hoger" onclick={() => shift(1)}>+1</button>
    </div>
    <button class="btn icon reset-transpose no-print" aria-label="Ga terug naar originele toonsoort" title="Ga terug naar originele toonsoort" disabled={transpose === 0} onclick={() => { transpose = 0; status = ''; }}><Icon name="reset" size={17} /></button>
    <details class="reader-options no-print">
      <summary class="btn icon" aria-label="Meer opties" title="Meer opties"><span aria-hidden="true">···</span></summary>
      <div class="options-menu">
        {#if song.capo !== null && song.capo > 0}<p class="capo">Capo {song.capo}</p>{/if}
        {#if !song.key}<a class="btn" href={`/muziek/${song.slug}/bewerken`}>Toonsoort instellen</a>{/if}
        <div class="font-controls"><span>Tekstgrootte</span><button class="btn icon" aria-label="Kleinere tekst" disabled={fontSize <= 14} onclick={() => fontSize -= 2}>A−</button><button class="btn icon" aria-label="Grotere tekst" disabled={fontSize >= 32} onclick={() => fontSize += 2}>A+</button></div>
        <a class="btn" href={`/muziek/${song.slug}/bewerken`}><Icon name="edit" size={17} />Nummer bewerken</a>
        <button class="btn" onclick={() => window.print()}><Icon name="print" size={17} />Printen</button>
      </div>
    </details>
  </header>
  {#if status}<div class="message error no-print" role="alert">{status}{#if conflict} <button class="text-link" onclick={() => refreshAll()}>Opnieuw laden</button>{/if}</div>{/if}
  <article class="song-paper">
    <div class="print-meta">{#if currentKey}Toonsoort {currentKey}{/if}{#if song.capo} · Capo {song.capo}{/if}</div>
    <Sheet body={song.body} {transpose} musicalKey={song.key} {fontSize} />
  </article>
  {#if /^https?:\/\//.test(song.sourceUrl)}<a class="source no-print" href={song.sourceUrl} target="_blank" rel="noopener noreferrer"><Icon name="external" size={13} />Bron</a>{/if}
</div>
<style>
  .reader-page { max-width: 1080px; padding: 8px 28px 40px; }
  .reader-heading { display: flex; align-items: center; gap: 8px; min-height: 44px; margin-bottom: 8px; }
  .song-title { display: flex; align-items: baseline; gap: 10px; flex: 1; min-width: 0; white-space: nowrap; }
  h1 { font-size: 21px; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; letter-spacing: -.02em; }
  .artist { font-size: 13px; color: var(--color-muted); overflow: hidden; text-overflow: ellipsis; }
  .reader-heading .btn { min-height: 36px; padding: 6px 9px; font-size: 13px; }
  .reader-heading .btn.icon { min-width: 36px; }
  .back, .reader-options > summary { border-color: transparent; }
  .transpose-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .transpose-controls .btn { background: var(--color-soft); border-color: transparent; }
  .offset { display: grid; place-items: center; font-size: 14px; width: 88px; height: 36px; font-weight: 600; }
  .save-preference, .reset-transpose { width: 36px; flex-shrink: 0; }
  .save-preference:enabled { background: var(--color-accent); }
  .reader-options { position: relative; flex-shrink: 0; }
  summary { list-style: none; cursor: pointer; }
  summary::-webkit-details-marker { display: none; }
  summary span { font-size: 22px; line-height: 1; font-weight: 700; }
  .options-menu { position: absolute; right: 0; top: calc(100% + 6px); z-index: 30; width: 230px; max-width: calc(100vw - 24px); padding: 8px; display: grid; gap: 4px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 6px 24px #00000018; }
  .options-menu .btn { justify-content: flex-start; border-color: transparent; min-height: 40px; }
  .font-controls { display: flex; align-items: center; gap: 4px; padding-left: 9px; font-size: 13px; }
  .font-controls > span { flex: 1; }
  .capo { font-size: 13px; color: var(--color-muted); padding: 8px 9px; }
  .song-paper { padding: 16px 24px 20px; border: 1px solid var(--color-border); background: var(--color-surface); border-radius: 4px; }
  .source { display: inline-flex; gap: 6px; align-items: center; color: var(--color-muted); margin-top: 16px; font-size: 11px; }
  .print-meta { display: none; }
  @media (max-width: 700px) {
    .reader-page { padding: 4px 10px 24px; }
    .reader-heading { gap: 4px; margin-bottom: 4px; }
    .song-title { gap: 6px; }
    h1 { font-size: 18px; }
    .artist { display: none; }
    .song-paper { padding: 14px 12px; }
  }
  @media (max-width: 600px) {
    .reader-heading { display: grid; grid-template-columns: 36px minmax(0, 1fr) 36px 36px; gap: 8px 6px; margin-bottom: 12px; }
    .back { grid-row: 1; grid-column: 1; }
    .song-title { grid-row: 1; grid-column: 2 / -1; }
    .save-preference { grid-row: 2; grid-column: 1; }
    .transpose-controls { grid-row: 2; grid-column: 2; justify-self: end; }
    .reset-transpose { grid-row: 2; grid-column: 3; }
    .reader-options { grid-row: 2; grid-column: 4; }
  }
  @media print {
    .reader-heading { margin-bottom: 18px; }
    .song-title { display: block; white-space: normal; }
    h1 { font-size: 26pt; overflow: visible; }
    .artist { display: block; color: #555; font-size: 12pt; margin-top: 8px; overflow: visible; }
    .print-meta { display: block; font-size: 9pt; color: #555; margin-bottom: 24px; }
  }
</style>
