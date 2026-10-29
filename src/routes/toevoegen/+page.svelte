<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '#lib/client.ts';
  import { emptyDraft, type ImportPreview } from '#lib/types.ts';
  import Editor from '#lib/components/Editor.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  let mode = $state('url'); let url = $state(''); let loading = $state(false); let error = $state('');
  let preview = $state<ImportPreview | null>(null);
  let importRequest = 0;
  afterNavigate(() => {
    const source = page.url.searchParams.get('url');
    const title = page.url.searchParams.get('title') || '';
    importRequest++; loading = false;
    preview = null; error = ''; url = source || ''; mode = 'url';
    if (source) void importUrl();
    else if (page.url.searchParams.get('mode') === 'text') {
      mode = 'text';
      preview = { draft: { ...emptyDraft(), title }, warnings: [] };
    }
  });
  async function importUrl(event?: SubmitEvent) {
    const request = ++importRequest;
    event?.preventDefault(); loading = true; error = '';
    try { const result = await api<ImportPreview>('/api/import', 'POST', { url }); if (request === importRequest) preview = result; }
    catch (e) { if (request === importRequest) error = (e as Error).message; }
    finally { if (request === importRequest) loading = false; }
  }
  function pasted() { mode = 'text'; error = ''; preview = { draft: { ...emptyDraft(), sourceUrl: /^https?:\/\//.test(url) ? url : '' }, warnings: [] }; }
</script>
<svelte:head><title>Toevoegen · Bladmuziek</title></svelte:head>
<div class="page">
  <a class="back-link" href="/"><Icon name="back" size={16} />Bibliotheek</a>
  <div class="page-heading"><h1>Toevoegen</h1></div>
  {#if !preview}
    <div class="tabs" aria-label="Manier van toevoegen"><button class:active={mode === 'url'} onclick={() => mode = 'url'}><Icon name="link" size={17} />Link</button><button class:active={mode === 'text'} onclick={pasted}><Icon name="text" size={17} />Tekst</button></div>
    <form class="url-form" onsubmit={importUrl}><label class="sr-only" for="source-url">Link naar het nummer</label><div class="url-row"><input id="source-url" class="input" type="url" required bind:value={url} placeholder="https://tabs.ultimate-guitar.com/…" /><button class="btn primary" disabled={loading}>{#if loading}<span class="spinner"></span>{:else}<Icon name="arrow" size={18} />{/if}{loading ? 'Ophalen…' : 'Ophalen'}</button></div></form>
    {#if error}<div class="message error" role="alert">{error}<div class="flex flex-wrap gap-4 mt-3">{#if /^https?:\/\//.test(url)}<a href={url} target="_blank" rel="noopener noreferrer">Bron openen</a>{/if}<button class="text-link" onclick={pasted}>Tekst plakken</button></div></div>{/if}
  {:else}
    {#key preview}<Editor folders={data.folders} tagSuggestions={data.tags} initial={preview.draft} initialWarnings={preview.warnings} initialExisting={preview.existing} />{/key}
  {/if}
</div>
<style>
  .tabs { display: flex; gap: 6px; border-bottom: 1px solid var(--color-border); margin-bottom: 30px; }
  .tabs button { display: flex; gap: 8px; align-items: center; padding: 13px 15px; background: transparent; color: var(--color-muted); font-size: 13px; border-bottom: 2px solid transparent; margin-bottom: -1px; }
  .tabs button.active { color: var(--color-ink); border-bottom-color: var(--color-accent); }
  .url-form { max-width: 760px; margin-bottom: 26px; } .url-row { display: flex; gap: 10px; margin-top: 10px; } .url-row input { min-width: 0; }
  @media (max-width: 600px) { .tabs button { font-size: 12px; padding-inline: 8px; } }
</style>
