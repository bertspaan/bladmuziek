<script lang="ts">
  import LibraryBrowser from '#lib/components/LibraryBrowser.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Bibliotheek · Bladmuziek</title></svelte:head>
<div class="page">
  <div class="page-heading"><h1>Bibliotheek<span class="count">{data.songs.length}</span></h1><a href="/toevoegen" class="btn primary"><Icon name="plus" size={18} />Toevoegen</a></div>
  {#each data.warnings as warning}<p class="message" role="status">{warning}</p>{/each}
  <LibraryBrowser songs={data.songs} folders={data.folders} />
</div>

<style>
  h1 { display: flex; align-items: center; gap: 15px; }
  .count { font: 12px var(--font-sans); background: var(--color-accent); color: var(--color-muted); min-width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center; letter-spacing: 0; }
  @media (max-width: 600px) { .count { display: none; } }
</style>
