<script lang="ts">
  import Editor from '#lib/components/Editor.svelte';
  import Icon from '#lib/components/Icon.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>
<svelte:head><title>{data.song.title} bewerken · Bladmuziek</title></svelte:head>
<div class="page"><a class="back-link" href={`/muziek/${data.song.slug}`}><Icon name="back" size={16} />{data.song.title}</a><div class="page-heading"><h1>Bewerken</h1></div>{#key data.song.id + data.song.revision}<Editor folders={data.folders} tagSuggestions={data.tags} initial={data.song} song={data.song} />{/key}</div>
