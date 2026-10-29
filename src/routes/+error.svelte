<script lang="ts">import { page } from '$app/state';</script>
<svelte:head><title>Niet gevonden · Bladmuziek</title></svelte:head>
<div class="page"><h1>{page.status === 404 ? 'Niet gevonden' : 'Er ging iets mis'}</h1><p class="mt-5 mb-8 muted">{page.error?.message}</p><a class="btn primary" href="/">Naar de bibliotheek</a></div>
