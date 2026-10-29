<script lang="ts">
  import Reader from '#lib/components/Reader.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>
<svelte:head><title>{data.song.title} · Bladmuziek</title></svelte:head>
{#key data.song.id}<Reader song={data.song} />{/key}
