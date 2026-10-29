<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { refreshAll } from '$app/navigation';
  import { api, ApiError } from '#lib/client.ts';
  import type { Song } from '#lib/types.ts';
  import { libraryRows, type LibraryRow } from '#lib/library-tree.ts';
  import { searchLibrary } from '#lib/library-search.ts';
  import Icon from '#lib/components/Icon.svelte';
  import { Input } from '#lib/components/ui/input/index.ts';
  import { Button } from '#lib/components/ui/button/index.ts';
  import * as Select from '#lib/components/ui/select/index.ts';
  let { songs: librarySongs, folders }: { songs: Song[]; folders: string[] } = $props();
  let query = $state('');
  let searchInput = $state<HTMLInputElement | null>(null);
  let folder = $state(''); let tag = $state('');
  let searching = $derived(!!query.trim());
  let tags = $derived([...new Set(librarySongs.flatMap(song => song.tags))].sort((a,b) => a.localeCompare(b, 'nl')));
  let songs = $derived(searchLibrary(librarySongs, query).filter(song => !tag || song.tags.includes(tag)));
  const storageKey = 'bladmuziek:collapsed-folders';
  let collapsed = $state<string[]>([]);
  let storageReady = $state(false);
  onMount(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
      if (Array.isArray(saved) && saved.every(path => typeof path === 'string')) collapsed = saved;
    } catch {}
    storageReady = true;
  });
  $effect(() => {
    if (!storageReady) return;
    try { localStorage.setItem(storageKey, JSON.stringify(collapsed)); } catch {}
  });
  function toggleFolder(path: string) {
    collapsed = collapsed.includes(path) ? collapsed.filter(value => value !== path) : [...collapsed, path];
  }
  let flatView = $derived(searching || !!tag || folder === '*');
  let rows = $derived<LibraryRow[]>(flatView ? songs.map(song => ({ type: 'song', song, depth: 0 })) : libraryRows(folders, songs, collapsed, folder));
  let breadcrumbs = $derived(folder === '*' || !folder ? [] : folder.split('/').map((name, index, parts) => ({ name, path: parts.slice(0, index + 1).join('/') })));
  let creating = $state(false), saving = $state(false), name = $state(''), parent = $state(''), createError = $state('');
  let nameInput = $state<HTMLInputElement>();
  async function newFolder() { parent = folder === '*' ? '' : folder; name = ''; createError = ''; creating = true; await tick(); nameInput?.focus(); }
  async function create(event: SubmitEvent) {
    event.preventDefault(); createError = ''; saving = true;
    try {
      const result = await api<{ folder: string }>('/api/folders', 'POST', { folder: [parent, name.trim()].filter(Boolean).join('/') });
      await refreshAll(); navigate(result.folder); creating = false;
    } catch (error) { createError = (error as Error).message; }
    finally { saving = false; }
  }
  function navigate(path: string) { folder = path; query = ''; }
  function over(event: DragEvent, path: string) {
    if (!dragged || busy) return;
    event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'; hovered = path;
  }
  function drop(event: DragEvent, path: string) {
    if (!dragged || busy) return;
    event.preventDefault(); hovered = null; void move(dragged, path);
  }

  let dragged = $state<Song | null>(null), moveSong = $state<Song | null>(null);
  let destination = $state(''), busy = $state(false), message = $state(''), moveError = $state(''), conflict = $state(false);
  let pointer = $state<{ id: number; x: number; y: number; song: Song } | null>(null);
  let pointerPosition = $state({ x: 0, y: 0 }), hovered = $state<string | null>(null), skipClick = false;
  function pointerStart(event: PointerEvent, song: Song) {
    if (busy || event.button !== 0) return;
    skipClick = false;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, song };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function dropAt(x: number, y: number): string | null {
    return document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-music-folder]')?.dataset.musicFolder ?? null;
  }
  function pointerMove(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (!dragged && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 6) return;
    dragged = pointer.song; skipClick = true;
    pointerPosition = { x: event.clientX, y: event.clientY };
    hovered = dropAt(event.clientX, event.clientY);
  }
  function pointerEnd(event: PointerEvent) {
    if (!pointer || event.pointerId !== pointer.id) return;
    const song = pointer.song;
    const target = dragged ? dropAt(event.clientX, event.clientY) : null;
    pointer = null; dragged = null; hovered = null;
    if (target !== null) void move(song, target);
  }
  function dragStart(event: DragEvent, song: Song) {
    if (pointer) { event.preventDefault(); return; }
    if (busy) { event.preventDefault(); return; }
    dragged = song; message = ''; moveError = '';
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-bladmuziek-song', song.id); }
  }
  async function move(song: Song, target: string) {
    if (busy || song.folder === target) return;
    busy = true; moveError = ''; message = ''; conflict = false;
    try {
      await api(`/api/songs/${song.id}/move`, 'POST', { folder: target, revision: song.revision });
      await refreshAll(); moveSong = null;
      message = `${song.title} → ${target || 'Bladmuziek'}`;
    } catch (e) { moveError = (e as Error).message; conflict = e instanceof ApiError && e.status === 409; }
    finally { busy = false; dragged = null; }
  }
</script>
<svelte:window onpointermove={pointerMove} onpointerup={pointerEnd} onpointercancel={() => { if (pointer) { pointer = null; dragged = null; hovered = null; } }} />
{#if pointer && dragged}<div class="drag-label" style:left={`${pointerPosition.x + 16}px`} style:top={`${pointerPosition.y + 16}px`}>{dragged.title}</div>{/if}
<section class="library-browser" aria-label="Muziekbibliotheek" aria-busy={busy || saving}>
  <div class="library-tools">
    <div class="relative min-w-0 flex-1">
      <span class="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-muted-foreground"><Icon name="search" size={18} /></span>
      <Input bind:ref={searchInput} aria-label="Zoeken in bibliotheek" placeholder="Zoek in je muziek" bind:value={query} class="h-11 bg-background pr-12 pl-10 shadow-xs" />
      {#if query}
        <Button variant="ghost" size="icon" class="absolute top-1 right-1 size-9 text-muted-foreground hover:bg-soft" aria-label="Zoekopdracht wissen" onclick={() => { query = ''; searchInput?.focus(); }}><Icon name="close" size={16} /></Button>
      {/if}
    </div>
  </div>
      <div class="organization-filters">
        <nav class="breadcrumbs" aria-label="Mappad">
          <button type="button" data-music-folder="" class:drop-target={!!dragged && hovered === ''} aria-current={!folder && !searching ? 'location' : undefined} onclick={() => navigate('')} ondragover={event => over(event, '')} ondragleave={() => hovered = null} ondrop={event => drop(event, '')}><Icon name="folder" size={17} />Bladmuziek</button>
          {#if searching || tag}<span aria-hidden="true">/</span><span aria-current="location">{searching ? 'Zoekresultaten in alle mappen' : 'Tagfilter in alle mappen'}</span>
          {:else if folder === '*'}<span aria-hidden="true">/</span><span aria-current="location">Alle nummers</span>
          {:else}
            {#each breadcrumbs as crumb (crumb.path)}
              <span aria-hidden="true">/</span><button type="button" data-music-folder={crumb.path} class:drop-target={!!dragged && hovered === crumb.path} aria-current={folder === crumb.path ? 'location' : undefined} onclick={() => navigate(crumb.path)} ondragover={event => over(event, crumb.path)} ondragleave={() => hovered = null} ondrop={event => drop(event, crumb.path)}>{crumb.name}</button>
            {/each}
          {/if}
        </nav>
        <Button variant="ghost" size="sm" class="text-muted-foreground" aria-pressed={folder === '*' && !searching} onclick={() => navigate('*')}><Icon name="library" size={16} />Alle nummers</Button>
        <Button variant="ghost" size="sm" onclick={newFolder}><Icon name="plus" size={16} />Nieuwe map</Button>
        <Select.Root type="single" value={tag ? `tag:${tag}` : 'all'} onValueChange={(value) => tag = value === 'all' ? '' : value.slice(4)}>
          <Select.Trigger aria-label="Filter op tag" class="min-w-36 max-w-full gap-3 bg-background px-3 text-sm font-normal shadow-xs data-[size=default]:h-9">
            <span class="min-w-0 truncate" class:text-muted-foreground={!tag}>{tag ? `#${tag}` : 'Alle tags'}</span>
          </Select.Trigger>
          <Select.Content align="end" sideOffset={6} class="max-h-[min(18rem,var(--bits-select-content-available-height))] max-w-[calc(100vw-2rem)] p-1">
            <Select.Item value="all" label="Alle tags" class="min-h-9 pl-3">Alle tags</Select.Item>
            {#if tags.length}<Select.Separator />{/if}
            {#each tags as name (name)}
              <Select.Item value={`tag:${name}`} label={`#${name}`} class="min-h-9 pl-3"><span class="truncate">#{name}</span></Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
        {#if tag}<Button variant="ghost" size="sm" class="text-xs font-normal text-muted-foreground hover:bg-soft" onclick={() => tag = ''}>Wis filter</Button>{/if}
      </div>
      {#if creating}
        <form onsubmit={create} class="move-form">
          <label for="new-folder-name">Nieuwe map in {parent || 'Bladmuziek'}</label>
          <input id="new-folder-name" class="input folder-name" bind:this={nameInput} bind:value={name} placeholder="Mapnaam" required maxlength="240" disabled={saving} />
          <button class="btn primary" disabled={saving}>{saving ? 'Aanmaken…' : 'Aanmaken'}</button>
          <button type="button" class="btn quiet" disabled={saving} onclick={() => creating = false}>Annuleren</button>
          {#if createError}<p class="message error" role="alert">{createError}</p>{/if}
        </form>
      {/if}
      {#if message}<p class="move-status" role="status">{message}</p>{/if}
      {#if moveError}<p class="message error" role="alert">{moveError}{#if conflict} <button class="text-link" onclick={() => { void refreshAll(); moveSong = null; moveError = ''; }}>Opnieuw laden</button>{/if}</p>{/if}
      {#if moveSong}
        <form class="move-form" onsubmit={event => { event.preventDefault(); if (moveSong) void move(moveSong, destination); }}>
          <label for="move-destination">Verplaats {moveSong.title}</label>
          <select id="move-destination" class="input" bind:value={destination}><option value="">Bladmuziek</option>{#each folders as path}<option value={path}>{path}</option>{/each}</select>
          <button class="btn primary" disabled={busy || destination === moveSong.folder}>Verplaatsen</button>
          <button class="btn quiet" type="button" disabled={busy} onclick={() => moveSong = null}>Annuleren</button>
        </form>
      {/if}
  {#if rows.length}
    <div class="song-list">
      <div class="list-head"><span>Naam</span><span class="tags-heading">Tags</span><span class="key-heading">Toon</span><span></span></div>
      {#each rows as row (row.type === 'folder' ? `folder:${row.path}` : `song:${row.song.id}`)}
        {#if row.type === 'folder'}
          <div class="folder-row" style:--depth={row.depth}>
            <button type="button" class="folder-toggle" class:drop-target={!!dragged && hovered === row.path} data-music-folder={row.path} aria-label={`Map ${row.path}`} aria-expanded={!collapsed.includes(row.path)} onclick={() => toggleFolder(row.path)} ondragover={event => over(event, row.path)} ondragleave={() => hovered = null} ondrop={event => drop(event, row.path)}>
              <span class="disclosure" class:expanded={!collapsed.includes(row.path)}><Icon name="chevron" size={15} /></span><span class="folder-cover"><Icon name="folder" size={23} /></span><span class="folder-name-label">{row.name}</span>
            </button>
            <button type="button" class="open-folder" aria-label={`Open map ${row.path}`} title="Open map" onclick={() => navigate(row.path)}><Icon name="arrow" size={17} /></button>
          </div>
        {:else}
        {@const song = row.song}
        <div class="song-row" style:--depth={row.depth} class:tree-row={!flatView} role="group" aria-label={song.title} draggable={!busy} ondragstart={event => dragStart(event, song)} ondragend={() => dragged = null} class:dragging={dragged?.id === song.id}>
          <a class="song-info" href={`/muziek/${song.slug}`} draggable={!busy}>
            <span class="song-cover"><Icon name="music" size={23} /></span>
            <div class="min-w-0"><h2>{song.title}</h2>{#if song.artist}<p>{song.artist}</p>{/if}{#if flatView && song.folder}<span class="song-folder">{song.folder}</span>{/if}</div>
          </a>
          <div class="song-tags" aria-label="Tags">{#each song.tags as songTag}<button type="button" class:active={tag === songTag} onclick={() => tag = tag === songTag ? '' : songTag}>#{songTag}</button>{/each}</div>
          <span class="song-key">{song.key || '—'}</span>
          <button class="move-button" draggable="false" onpointerdown={event => pointerStart(event, song)} ondragstart={event => { event.preventDefault(); event.stopPropagation(); }} aria-label={`Verplaats ${song.title}`} title="Versleep of verplaats" disabled={busy} onclick={() => { if (skipClick) { skipClick = false; return; } moveSong = song; destination = song.folder; moveError = ''; }}><Icon name="grip" size={19} /></button>
        </div>
        {/if}
      {/each}
    </div>
  {:else if searching || tag}
    <div class="empty"><Icon name="search" size={30} /><h2>Geen nummers gevonden</h2><button class="btn" onclick={() => { query = ''; tag = ''; }}>Wis filters</button></div>
  {:else if folder !== '*' && librarySongs.length}
    <div class="empty"><Icon name="folder" size={30} /><h2>Deze map is leeg</h2><button class="btn" onclick={() => navigate('*')}>Alle nummers bekijken</button></div>
  {:else}
    <div class="empty"><span class="empty-mark"><Icon name="music" size={34} /></span><h2>Nog geen muziek</h2><div class="flex flex-wrap justify-center gap-3"><a href="/ontdekken" class="btn">Muziek zoeken<Icon name="arrow" size={17} /></a></div></div>
  {/if}
</section>
<style>
  .library-browser { min-width: 0; }
  .library-tools { display: flex; margin-bottom: 20px; }
  .organization-filters { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
  .breadcrumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-right: auto; font-size: 13px; color: var(--color-muted); min-width: 0; }
  .breadcrumbs button { display: inline-flex; align-items: center; gap: 7px; padding: 8px; border-radius: 5px; background: transparent; text-align: left; overflow-wrap: anywhere; min-width: 0; }
  .breadcrumbs button:hover { background: var(--color-soft); }
  .breadcrumbs [aria-current] { color: var(--color-ink); }
  .folder-row { display: flex; align-items: center; width: 100%; padding-left: min(calc(var(--depth) * 24px), 30%); border-bottom: 1px solid var(--color-border); border-radius: 3px; }
  .folder-row:hover { background: var(--color-soft); }
  .folder-toggle { display: flex; align-items: center; flex: 1; min-width: 0; gap: 10px; padding: 12px 8px; background: transparent; text-align: left; }
  .disclosure { display: grid; place-items: center; flex-shrink: 0; }
  .disclosure.expanded { transform: rotate(90deg); }
  .open-folder { display: grid; place-items: center; width: 40px; min-height: 44px; flex-shrink: 0; background: transparent; color: var(--color-muted); }
  .open-folder:hover { color: var(--color-ink); }
  .folder-cover { display: grid; place-items: center; width: 42px; height: 42px; flex-shrink: 0; color: var(--color-muted); }
  .folder-name-label { flex: 1; min-width: 0; overflow-wrap: anywhere; font-size: 15px; font-weight: 550; }
  .folder-row :global(svg), .breadcrumbs :global(svg) { flex-shrink: 0; }
  .drop-target { background: var(--color-accent) !important; outline: 2px solid var(--color-ink); outline-offset: -2px; }
  .list-head, .song-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(90px, .55fr) 38px 32px; align-items: center; gap: 12px; }
  .list-head { padding: 0 8px 13px; font-size: 10px; letter-spacing: 1.4px; text-transform: uppercase; color: var(--color-muted); border-bottom: 1px solid var(--color-border); }
  .tags-heading { text-align: right; }
  .song-row { padding: 18px 8px; border-bottom: 1px solid var(--color-border); border-radius: 3px; cursor: grab; }
  .song-row:active { cursor: grabbing; }
  .song-row.dragging { opacity: .4; }
  .song-row:hover { background: var(--color-soft); }
  .song-info { display: flex; gap: 14px; align-items: center; min-width: 0; }
  .tree-row .song-info { padding-left: min(calc(var(--depth) * 24px + 25px), 45%); }
  .song-cover { background: var(--color-soft); border: 1px solid var(--color-border); color: var(--color-ink); border-radius: 6px; width: 42px; height: 50px; flex-shrink: 0; display: grid; place-items: center; }
  .song-info h2 { font-size: 21px; overflow-wrap: anywhere; }
  .song-info p { font-size: 12px; color: var(--color-muted); margin-top: 4px; }
  .song-folder { display: block; margin-top: 6px; color: var(--color-muted); font-size: 10px; overflow-wrap: anywhere; }
  .song-tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
  .song-tags button { background: var(--color-soft); color: var(--color-muted); padding: 4px 7px; font-size: 11px; border-radius: 4px; max-width: 100%; overflow-wrap: anywhere; text-align: right; }
  .song-tags button.active { background: var(--color-accent); color: var(--color-ink); }
  .song-key { font-size: 12px; color: var(--color-muted); text-align: center; }
  .drag-label { position: fixed; z-index: 100; pointer-events: none; background: var(--color-ink); color: var(--color-surface); padding: 8px 12px; border-radius: 6px; font-size: 12px; max-width: 220px; }
  .move-button { touch-action: none; user-select: none; display: grid; place-items: center; min-height: 40px; color: var(--color-muted); background: transparent; cursor: grab; }
  .move-button:hover { color: var(--color-ink); }
  .move-form { display: flex; flex-wrap: wrap; gap: 8px; padding: 14px; margin-bottom: 16px; border: 1px solid var(--color-border); border-radius: 8px; }
  .move-form label { width: 100%; font-size: 13px; overflow-wrap: anywhere; }
  .move-form select, .folder-name { flex: 1; min-width: 130px; }
  .move-form button { font-size: 12px; padding: 8px 10px; }
  .move-status { font-size: 12px; padding: 8px 0; color: var(--color-muted); }
  @media (max-width: 600px) { .breadcrumbs { flex-basis: 100%; } .list-head, .song-row { grid-template-columns: minmax(0, 1fr) minmax(75px, .6fr) 28px; gap: 10px; padding-inline: 0; } .song-key, .key-heading, .song-cover { display: none; } .song-info h2 { font-size: 21px; } .folder-row { padding-left: min(calc(var(--depth) * 16px), 25%); } .tree-row .song-info { padding-left: min(calc(var(--depth) * 16px + 8px), 35%); } }
</style>
