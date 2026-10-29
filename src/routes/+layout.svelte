<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import Icon from '#lib/components/Icon.svelte';
  import CommandPalette from '#lib/components/CommandPalette.svelte';
  import { onMount } from 'svelte';
  let paletteOpen = $state(false);
  let shortcut = $state('Ctrl K');
  onMount(() => { if (/Mac|iPhone|iPad/.test(navigator.platform)) shortcut = '⌘ K'; });
  let { children } = $props();
  let reading = $derived(/^\/muziek\/[^/]+\/?$/.test(page.url.pathname));
  let discover = $derived(page.url.pathname === '/ontdekken');
</script>
<svelte:head><meta name="description" content="Je eigen bibliotheek voor lyrics en akkoorden." /></svelte:head>
<div class="app-shell" class:reading>
  <aside class="app-sidebar">
    <a class="brand" href="/"><span class="brand-mark"><Icon name="music" size={21} /></span>bladmuziek<span class="brand-dot">.</span></a>
    <nav aria-label="Hoofdnavigatie">
      <a href="/" class:active={!discover} aria-current={!discover ? 'page' : undefined}><Icon name="library" />Bibliotheek</a>
      <a href="/ontdekken" class:active={discover} aria-current={discover ? 'page' : undefined}><Icon name="search" />Toevoegen</a>
    </nav>
    <button class="palette-trigger" onclick={() => paletteOpen = true} aria-label="Zoeken en toevoegen" aria-keyshortcuts="Meta+k Control+k"><Icon name="search" size={18} /><span>Zoeken</span><kbd>{shortcut}</kbd></button>
  </aside>
  <header class="app-mobile">
    <a class="brand" href="/"><span class="brand-mark"><Icon name="music" size={18} /></span>bladmuziek<span class="brand-dot">.</span></a>
    <nav aria-label="Hoofdnavigatie"><a href="/" class:active={!discover} aria-label="Bibliotheek"><Icon name="library" /></a><button class="mobile-search" onclick={() => paletteOpen = true} aria-label="Zoeken en toevoegen"><Icon name="search" /></button><a href="/ontdekken" class:active={discover} aria-label="Toevoegen"><Icon name="external" /></a></nav>
  </header>
  <main class="app-main" id="main">{@render children()}</main>
</div>
<CommandPalette bind:open={paletteOpen} />
<style>
  .palette-trigger { display: flex; align-items: center; gap: 10px; margin-top: 22px; padding: 11px 12px; border: 1px solid var(--color-border); border-radius: 8px; background: var(--color-surface); font-size: 13px; color: var(--color-muted); }
  .palette-trigger:hover { border-color: var(--color-border-strong); color: var(--color-ink); }
  .palette-trigger kbd { margin-left: auto; border: 1px solid var(--color-border); border-radius: 4px; padding: 2px 4px; font: 10px var(--font-sans); white-space: nowrap; }
  .mobile-search { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 6px; background: var(--color-surface); color: var(--color-ink); }
  .app-sidebar { position: fixed; inset: 0 auto 0 0; width: 238px; background: var(--color-soft); border-right: 1px solid var(--color-border); padding: 36px 22px 24px; display: flex; flex-direction: column; z-index: 20; }
  .brand { display: flex; align-items: center; font-family: var(--font-serif); font-size: 27px; letter-spacing: -1.2px; font-weight: 600; }
  .brand-mark { width: 32px; height: 35px; display: grid; place-items: center; margin-right: 8px; color: var(--color-ink); }
  .brand-dot { color: var(--color-accent); }
  .app-sidebar nav { display: grid; gap: 7px; margin-top: 52px; }
  .app-sidebar nav a { display: flex; align-items: center; gap: 12px; padding: 13px 15px; font-size: 14px; border-radius: 7px; color: var(--color-muted); }
  .app-sidebar nav a.active { background: var(--color-accent); color: var(--color-ink); font-weight: 600; }
  .app-sidebar nav a:not(.active):hover { background: var(--color-soft); }
  .app-main { margin-left: 238px; min-height: 100vh; }
  .app-mobile { display: none; }
  @media (max-width: 900px) { .app-sidebar { width: 204px; padding-inline: 15px; } .app-main { margin-left: 204px; } .brand { font-size: 25px; } }
  @media (max-width: 700px) { .reading .app-mobile { display: none; } .reading .app-main { min-height: 100vh; } .app-sidebar { display: none; } .app-main { margin-left: 0; min-height: calc(100vh - 69px); } .app-mobile { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--color-border); background: var(--color-soft); } .app-mobile nav { display: flex; gap: 5px; } .app-mobile nav a { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 6px; color: var(--color-muted); } .app-mobile nav a.active { background: var(--color-accent); color: var(--color-ink); } }
</style>
