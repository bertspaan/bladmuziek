<script lang="ts">
  import { untrack } from 'svelte';
  import { beforeNavigate, goto } from '$app/navigation';
  import { api, ApiError } from '#lib/client.ts';
  import { emptyDraft, type SongDraft, type Song } from '#lib/types.ts';
  import { cleanMusic, keyOptions } from '#lib/music.ts';
  import { parseTags } from '#lib/organization.ts';
  import FolderPicker from './FolderPicker.svelte';
  import Sheet from './Sheet.svelte';
  import Icon from './Icon.svelte';
  import * as Select from './ui/select/index.ts';
  const formId = $props.id();
  let { initial = emptyDraft(), song, initialWarnings = [], initialExisting, folders = [], tagSuggestions = [] }: { folders?: string[]; tagSuggestions?: string[]; initial?: SongDraft; song?: Song; initialWarnings?: string[]; initialExisting?: { id: string; slug: string; title: string } } = $props();
  let draft = $state<SongDraft>(untrack(() => ({ ...initial })));
  let musicalKeys = $derived([...new Set([draft.key, ...keyOptions])].filter(Boolean));
  let tagsInput = $state(untrack(() => initial.tags.join(', ')));
  const baseline = untrack(() => JSON.stringify(initial));
  let warnings = $state<string[]>(untrack(() => initialWarnings));
  let existing = $state(untrack(() => initialExisting));
  let allowDuplicate = $state(false); let saving = $state(false); let saved = $state(false); let error = $state(''); let conflict = $state(false);
  let dirty = $derived(!saved && JSON.stringify(draft) !== baseline);
  beforeNavigate(({ cancel }) => { if (dirty && !window.confirm('Je wijzigingen zijn nog niet opgeslagen. Toch weggaan?')) cancel(); });
  function beforeUnload(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = ''; } }
  function clean() { const result = cleanMusic(draft.body); draft.body = result.body; warnings = result.warnings; }
  async function save(event: SubmitEvent) {
    event.preventDefault(); saving = true; error = ''; conflict = false;
    try {
      const result = await api<Song>(song ? `/api/songs/${song.id}` : '/api/songs', song ? 'PUT' : 'POST', { draft: { ...draft, capo: draft.capo === undefined ? null : draft.capo }, revision: song?.revision, allowDuplicate });
      saved = true; await goto(`/muziek/${result.slug}`, { refreshAll: true });
    } catch (e) { error = (e as Error).message; if (e instanceof ApiError) { existing = e.details?.existing || existing; conflict = e.status === 409 && !e.details?.existing; } }
    finally { saving = false; }
  }
</script>
<svelte:window onbeforeunload={beforeUnload} />
<form onsubmit={save}>
  {#if existing && !song}<div class="message"><a href={`/muziek/${existing.slug}`}>Dit nummer staat al in je bibliotheek.</a><label class="duplicate"><input type="checkbox" bind:checked={allowDuplicate} /> Als aparte versie opslaan</label></div>{/if}
  {#each warnings as warning}<p class="message" role="status">{warning}</p>{/each}
  {#if error}<div class="message error" role="alert">{error}{#if conflict} <a class="text-link" href={song ? `/muziek/${song.slug}` : '/'}>Nieuwste versie openen</a>{/if}</div>{/if}
  <div class="metadata">
    <label class="field title-field">Titel<input class="input" bind:value={draft.title} required maxlength="200" autocomplete="off" /></label>
    <label class="field artist-field">Artiest<input class="input" bind:value={draft.artist} maxlength="200" autocomplete="off" /></label>
    <div class="key-field">
      <label for={`${formId}-key`}>Toonsoort</label>
      <Select.Root type="single" value={draft.key || 'unknown'} onValueChange={(value) => { draft.key = value === 'unknown' ? '' : value; }}>
        <Select.Trigger id={`${formId}-key`} class="w-full min-w-0 gap-3 bg-background px-3 text-sm font-normal shadow-xs data-[size=default]:h-[46px]">
          <span class:text-muted-foreground={!draft.key}>{draft.key || 'Onbekend'}</span>
        </Select.Trigger>
        <Select.Content align="start" sideOffset={6} class="max-h-[min(18rem,var(--bits-select-content-available-height))] p-1">
          <Select.Item value="unknown" label="Onbekend" class="min-h-9 px-3 pr-8 text-muted-foreground">Onbekend</Select.Item>
          <Select.Separator />
          {#each musicalKeys as key (key)}<Select.Item value={key} label={key} class="min-h-9 pl-3">{key}</Select.Item>{/each}
        </Select.Content>
      </Select.Root>
    </div>
  </div>
  <div class="organization-fields">
    <div class="key-field"><label for={`${formId}-folder`}>Map</label><FolderPicker id={`${formId}-folder`} {folders} bind:value={draft.folder} /></div>
    <label class="field">Tags<input class="input" bind:value={tagsInput} oninput={event => draft.tags = parseTags(event.currentTarget.value)} placeholder="folk, oefenen" autocomplete="off" /></label>
  </div>
  {#if tagSuggestions.some(tag => !draft.tags.includes(tag))}<div class="tag-suggestions">{#each tagSuggestions.filter(tag => !draft.tags.includes(tag)).slice(0, 12) as tag}<button type="button" onclick={() => { draft.tags = [...draft.tags, tag]; tagsInput = draft.tags.join(', '); }}>#{tag}</button>{/each}</div>{/if}
  <div class="editor-grid">
    <div class="editor-panel"><div class="panel-heading"><label for="music-body">Tekst & akkoorden</label><button class="clean-button" type="button" onclick={clean}>Opschonen</button></div><textarea id="music-body" spellcheck="false" required maxlength="200000" bind:value={draft.body} placeholder={'## Couplet\nEen [Am]regel met een [G]akkoord'}></textarea></div>
    <div class="preview-panel"><div class="panel-heading"><span>Voorbeeld</span></div><div class="preview-content"><Sheet body={draft.body} musicalKey={draft.key} /></div></div>
  </div>
  <details class="source-details"><summary>Bron</summary><label class="field"><span class="sr-only">Bron-URL</span><input class="input" type="url" bind:value={draft.sourceUrl} placeholder="https://…" /></label></details>
  <div class="save-bar"><a class="btn quiet" href={song ? `/muziek/${song.slug}` : '/'}>Annuleren</a><button class="btn primary" disabled={saving || (!!existing && !song && !allowDuplicate)}>{#if saving}<span class="spinner"></span>{:else}<Icon name="check" size={18} />{/if}{song ? 'Opslaan' : 'Toevoegen'}</button></div>
</form>
<style>
  .key-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .key-field > label { font-size: .82rem; font-weight: 550; }
  .organization-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .tag-suggestions { display: flex; flex-wrap: wrap; gap: 8px; margin: -8px 0 20px; } .tag-suggestions button { color: var(--color-ink); background: var(--color-soft); border-radius: 4px; padding: 5px 9px; font-size: 12px; }
  .metadata { display: grid; grid-template-columns: 1.5fr 1.3fr minmax(8rem, .8fr); gap: 16px; margin-bottom: 28px; }
  .editor-grid { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden; background: var(--color-surface); }
  .editor-panel, .preview-panel { min-width: 0; }
  .editor-panel { border-right: 1px solid var(--color-border); display: flex; flex-direction: column; }
  .panel-heading { min-height: 48px; border-bottom: 1px solid var(--color-border); padding: 12px 18px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--color-muted); }
  .clean-button { background: transparent; color: var(--color-ink); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; }
  textarea { width: 100%; min-height: 440px; flex: 1; padding: 20px; border: 0; background: var(--color-paper); font: 13px/1.9 ui-monospace, monospace; resize: vertical; }
  textarea::placeholder { color: var(--color-muted); }
  .preview-content { padding: 22px; max-height: 700px; overflow: auto; }
  .source-details { margin: 20px 0; color: var(--color-muted); font-size: 12px; } summary { cursor: pointer; margin-bottom: 10px; }
  .save-bar { display: flex; justify-content: flex-end; gap: 10px; margin-top: 25px; }
  .duplicate { display: flex; gap: 8px; align-items: center; margin-top: 8px; } .duplicate input { accent-color: var(--color-ink); }
  @media (max-width: 1000px) { .metadata { grid-template-columns: 1fr 1fr; } .title-field, .artist-field { grid-column: auto; } .key-field { grid-column: 1 / -1; } }
  @media (max-width: 600px) { .organization-fields { grid-template-columns: 1fr; } .metadata { gap: 14px; } .editor-grid { grid-template-columns: 1fr; } .editor-panel { border-right: 0; border-bottom: 1px solid var(--color-border); } textarea { min-height: 300px; } .preview-content { max-height: 420px; } .save-bar { gap: 5px; } .save-bar .btn { padding-inline: 11px; font-size: 12px; } }
</style>
