<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import { api } from '#lib/client.ts';
  import type { SearchResult } from '#lib/types.ts';
  import Icon from '#lib/components/Icon.svelte';
  let query = $state(''); let searched = $state(''); let loading = $state(false); let error = $state('');
  let results = $state<SearchResult[]>([]); let warnings = $state<string[]>([]); let source = $state('Alle bronnen');
  let shown = $derived(source === 'Alle bronnen' ? results : results.filter(r => r.source === source));
  afterNavigate(() => { const value = page.url.searchParams.get('q'); if (value !== null) query = value.slice(0, 150); });
  async function search(event: SubmitEvent) {
    event.preventDefault(); if (loading) return; loading = true; error = ''; results = []; warnings = []; source = 'Alle bronnen'; searched = query.trim();
    try { const data = await api<{ results: SearchResult[]; warnings: string[] }>(`/api/search?q=${encodeURIComponent(searched)}`); results = data.results; warnings = data.warnings; }
    catch (e) { error = (e as Error).message; }
    finally { loading = false; }
  }
</script>
<svelte:head><title>Toevoegen · Bladmuziek</title></svelte:head>
<div class="page">
  <div class="page-heading"><h1>Toevoegen</h1></div>
  <form class="search-form" onsubmit={search}><label class="search-input"><Icon name="search" size={20} /><input aria-label="Zoek op titel of artiest" placeholder="Titel of artiest" bind:value={query} required minlength="2" maxlength="150" /></label><button class="btn primary" disabled={loading}>{#if loading}<span class="spinner"></span>{/if}Zoeken</button></form>
  {#if error}<p class="message error" role="alert">{error}</p>{/if}
  {#each warnings as warning}<p class="message" role="status">{warning}</p>{/each}
  {#if searched}
    <div class="result-tools"><span aria-live="polite">{loading ? 'Zoeken…' : `${shown.length} resultaten`}</span><select aria-label="Bron filteren" bind:value={source}><option>Alle bronnen</option><option>Ultimate Guitar</option><option>Chordie</option></select></div>
    {#if !loading && shown.length === 0}<div class="empty"><Icon name="search" size={28} /><h2>Geen resultaten</h2></div>{/if}
    <div class="result-list">{#each shown as result}<div class="result"><div class="result-text"><a href={`/toevoegen?url=${encodeURIComponent(result.url)}`}><h2>{result.title}</h2><p>{result.artist}</p></a><div class="result-meta"><span class="pill">{result.source}</span>{#if result.detail}<span>{result.detail}</span>{/if}</div></div><a class="btn icon" href={`/toevoegen?url=${encodeURIComponent(result.url)}`} aria-label={`${result.title} importeren`} title="Importeren"><Icon name="plus" size={19} /></a></div>{/each}</div>
  {/if}
  <div class="external-search"><a href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${encodeURIComponent(searched || query)}`} target="_blank" rel="noopener noreferrer">Ultimate Guitar<Icon name="external" size={12} /></a><a href={`https://www.chordie.com/result.php?q=${encodeURIComponent(searched || query)}`} target="_blank" rel="noopener noreferrer">Chordie<Icon name="external" size={12} /></a><a href="https://www.e-chords.com/en/chords" target="_blank" rel="noopener noreferrer">E-Chords<Icon name="external" size={12} /></a></div>
</div>
<style>
  .search-form { display: flex; gap: 12px; margin-bottom: 28px; }
  .search-input { flex: 1; display: flex; align-items: center; gap: 13px; padding: 0 15px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-muted); min-width: 0; }
  .search-input input { border: 0; outline: 0; background: transparent; height: 50px; flex: 1; min-width: 0; width: 100%; color: var(--color-ink); font-size: 14px; }
  .search-input:focus-within { outline: 2px solid var(--color-ink-focus); outline-offset: -2px; }
  .result-tools { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-bottom: 14px; border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-muted); }
  select { background: transparent; border: 0; color: var(--color-muted); padding: 8px; }
  .result { display: flex; justify-content: space-between; align-items: center; gap: 18px; border-bottom: 1px solid var(--color-border); padding: 24px 2px; }
  .result-text { min-width: 0; } .result h2 { font-size: 23px; overflow-wrap: anywhere; } .result p { color: var(--color-muted); font-size: 13px; margin-top: 5px; }
  .result-meta { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 11px; font-size: 11px; color: var(--color-muted); }
  .external-search { display: flex; flex-wrap: wrap; gap: 15px; align-items: center; font-size: 11px; color: var(--color-muted); margin-top: 30px; }
  .external-search a { display: flex; gap: 5px; align-items: center; } .external-search a:hover { color: var(--color-ink); }
</style>
