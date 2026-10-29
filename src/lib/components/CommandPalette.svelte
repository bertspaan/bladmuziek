<script lang="ts">
  import { goto, afterNavigate } from '$app/navigation';
  import { api } from '#lib/client.ts';
  import type { Song } from '#lib/types.ts';
  import { searchLibrary } from '#lib/library-search.ts';
  import Icon from './Icon.svelte';
  import * as Command from './ui/command/index.ts';
  import * as Dialog from './ui/dialog/index.ts';

  let { open = $bindable(false) }: { open?: boolean } = $props();
  let query = $state('');
  let selected = $state('');
  let songs = $state<Song[]>([]);
  let loading = $state(false);
  let error = $state('');
  let warnings = $state<string[]>([]);
  let attempt = $state(0);
  let navigating = $state(false);
  let input = $state<HTMLInputElement | null>(null);
  let matches = $derived(searchLibrary(songs, query));
  let text = $derived(query.trim());
  let isUrl = $derived(/^https?:\/\/\S+$/i.test(text));

  $effect(() => { selected = matches[0] ? `song:${matches[0].id}` : error ? 'retry' : isUrl ? 'import' : 'new'; });
  $effect(() => { if (!open) query = ''; });

  $effect(() => {
    if (!open) return;
    attempt;
    let cancelled = false;
    loading = true;
    error = '';
    warnings = [];
    songs = [];
    api<{ songs: Song[]; warnings: string[] }>('/api/songs')
      .then(data => { if (!cancelled) { songs = data.songs; warnings = data.warnings; } })
      .catch(cause => { if (!cancelled) error = (cause as Error).message; })
      .finally(() => { if (!cancelled) loading = false; });
    return () => { cancelled = true; };
  });

  afterNavigate(() => { open = false; });

  function shortcut(event: KeyboardEvent) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.altKey && !event.isComposing) {
      event.preventDefault();
      if (event.repeat) return;
      open = !open;
    }
  }

  async function navigate(href: string) {
    navigating = true;
    open = false;
    try { await goto(href); }
    catch { /* The editor can cancel navigation to protect unsaved changes. */ }
    finally { navigating = false; }
  }
</script>

<svelte:window onkeydown={shortcut} />

<Dialog.Root bind:open onOpenChange={(value) => { if (value) query = ''; }}>
  <Dialog.Content
    class="no-print top-[12dvh] max-h-[80dvh] translate-y-0 gap-0 overflow-hidden p-0 shadow-xl sm:max-w-xl"
    showCloseButton={false}
    onOpenAutoFocus={(event) => { event.preventDefault(); input?.focus(); }}
    onCloseAutoFocus={(event) => { if (navigating) event.preventDefault(); }}
  >
    <Dialog.Header class="sr-only">
      <Dialog.Title>Zoeken en toevoegen</Dialog.Title>
      <Dialog.Description>Zoek in je bibliotheek of voeg muziek toe. Gebruik de pijltjestoetsen en Enter om te kiezen.</Dialog.Description>
    </Dialog.Header>
    <Command.Root bind:value={selected} shouldFilter={false} loop class="palette">
      <div class="flex items-center gap-2 border-b border-border p-2">
        <div class="min-w-0 flex-1"><Command.Input bind:ref={input} bind:value={query} aria-label="Zoeken in muziek en acties" placeholder="Zoek een nummer, artiest of plak een link…" maxlength={150} /></div>
        <Dialog.Close class="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-soft" aria-label="Zoeken sluiten"><Icon name="close" size={17} /></Dialog.Close>
      </div>
      <Command.List class="max-h-[min(52dvh,420px)] p-2" aria-label="Nummers en acties">
        {#if loading}
          <p class="px-3 py-5 text-sm text-muted-foreground" role="status">Bibliotheek laden…</p>
        {:else if error}
          <p class="px-3 py-3 text-sm text-muted-foreground" role="alert">{error}</p>
          <Command.Item value="retry" onSelect={() => attempt++}>Opnieuw proberen</Command.Item>
        {:else if matches.length}
          <Command.Group heading={`Bibliotheek · ${matches.length}`}>
            {#each matches.slice(0, 30) as song (song.id)}
              <Command.Item value={`song:${song.id}`} onSelect={() => navigate(`/muziek/${song.slug}`)} class="min-h-14 gap-3 px-3">
                <Icon name="music" size={19} />
                <span class="min-w-0 flex-1"><span class="block truncate font-medium">{song.title}</span><span class="block truncate text-xs text-muted-foreground">{song.artist || 'Onbekende artiest'}{song.folder ? ` · ${song.folder}` : ''}</span></span>
              </Command.Item>
            {/each}
            {#if matches.length > 30}<p class="px-3 py-2 text-xs text-muted-foreground">Typ verder om de overige nummers te vinden.</p>{/if}
          </Command.Group>
        {:else}
          <p class="px-3 py-5 text-sm text-muted-foreground" role="status">{text ? 'Geen nummers gevonden in je bibliotheek.' : 'Je bibliotheek is nog leeg.'}</p>
        {/if}
        {#if warnings.length}<p class="px-3 py-2 text-xs text-muted-foreground" role="status">Sommige bestanden konden niet worden gelezen. Bekijk de meldingen in de bibliotheek.</p>{/if}
        <Command.Separator />
        <Command.Group heading="Muziek toevoegen">
          {#if !isUrl}
            <Command.Item value="new" onSelect={() => navigate(`/toevoegen?mode=text${text ? `&title=${encodeURIComponent(text)}` : ''}`)} class="min-h-11 gap-3 px-3">
              <Icon name="plus" size={18} /><span class="truncate">{text ? `Nieuw nummer: “${text}”` : 'Nieuw nummer aanmaken'}</span>
            </Command.Item>
          {/if}
          <Command.Item value="import" onSelect={() => navigate(`/toevoegen${isUrl ? `?url=${encodeURIComponent(text)}` : ''}`)} class="min-h-11 gap-3 px-3">
            <Icon name="link" size={18} /><span>{isUrl ? 'Deze link importeren' : 'Importeren via een link'}</span>
          </Command.Item>
          {#if !isUrl}
            <Command.Item value="discover" onSelect={() => navigate(`/ontdekken${text ? `?q=${encodeURIComponent(text)}` : ''}`)} class="min-h-11 gap-3 px-3">
              <Icon name="search" size={18} /><span class="truncate">{text ? `Online zoeken naar “${text}”` : 'Online muziek zoeken'}</span>
            </Command.Item>
          {/if}
        </Command.Group>
      </Command.List>
      <div class="flex gap-4 border-t border-border px-4 py-3 text-xs text-muted-foreground" aria-hidden="true"><span>↑ ↓ navigeren</span><span>↵ openen</span><span class="ml-auto">esc sluiten</span></div>
    </Command.Root>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.palette [data-slot='command-item'][data-selected]) { background: var(--color-soft); }
  :global(.palette [data-slot='command-input-wrapper']) { padding: 0; }
  :global(.palette [data-slot='input-group']) { height: 44px !important; background: transparent; border-color: transparent; }
  :global(.palette [data-slot='input-group-control']) { font-size: 16px; }
</style>
