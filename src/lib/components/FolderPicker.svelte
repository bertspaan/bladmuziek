<script lang="ts">
  import { tick } from 'svelte';
  import { Popover } from 'bits-ui';
  import { refreshAll } from '$app/navigation';
  import { api } from '#lib/client.ts';
  import { folderTree } from '#lib/organization.ts';
  import Icon from './Icon.svelte';
  const uid = $props.id();
  let { id = `${uid}-trigger`, folders, value = $bindable(''), disabled = false, label = 'Map' }: {
    id?: string; folders: string[]; value?: string; disabled?: boolean; label?: string;
  } = $props();
  let open = $state(false), current = $state(''), added = $state<string[]>([]);
  let creating = $state(false), name = $state(''), saving = $state(false), error = $state('');
  let nameInput = $state<HTMLInputElement>();
  let tree = $derived(folderTree([...new Set([...folders, ...added, ...(value ? [value] : [])])]));
  let children = $derived.by(() => {
    let nodes = tree;
    for (const part of current ? current.split('/') : []) nodes = nodes.find(node => node.name === part)?.children ?? [];
    return nodes;
  });
  let crumbs = $derived(current ? current.split('/').map((name, index, parts) => ({ name, path: parts.slice(0, index + 1).join('/') })) : []);
  function openChanged(isOpen: boolean) { if (isOpen) { current = value; creating = false; error = ''; } }
  function browse(path: string) { current = path; creating = false; error = ''; }
  async function beginCreate() { creating = true; name = ''; error = ''; await tick(); nameInput?.focus(); }
  async function create() {
    if (saving || !name.trim()) return;
    saving = true; error = '';
    try {
      const result = await api<{ folder: string }>('/api/folders', 'POST', { folder: [current, name.trim()].filter(Boolean).join('/') });
      added = [...added, result.folder]; current = result.folder; creating = false;
      await refreshAll();
    } catch (e) { error = (e as Error).message; }
    finally { saving = false; }
  }
</script>
<Popover.Root bind:open onOpenChange={openChanged}>
  <Popover.Trigger {id} {disabled} aria-label={label} class="folder-picker-trigger flex h-[46px] w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-background px-3 text-left text-sm shadow-xs outline-none ring-inset focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
    <Icon name="folder" size={17} /><span class="min-w-0 flex-1 truncate">{value || 'Bladmuziek'}</span><span class="chevron" aria-hidden="true">⌄</span>
  </Popover.Trigger>
  <Popover.Portal>
    <Popover.Content align="start" sideOffset={6} aria-label="Map kiezen" class="folder-picker-panel z-50 rounded-lg border border-border bg-background p-2 text-foreground shadow-lg outline-none">
      <nav aria-label="Mappad" class="breadcrumbs">
        <button type="button" onclick={() => browse('')}>Bladmuziek</button>
        {#each crumbs as crumb}<span aria-hidden="true">/</span><button type="button" onclick={() => browse(crumb.path)} aria-current={current === crumb.path ? 'location' : undefined}>{crumb.name}</button>{/each}
      </nav>
      <div class="folder-options">
        {#if current}<button type="button" class="folder-option parent" onclick={() => browse(current.split('/').slice(0, -1).join('/'))}><Icon name="back" size={16} />Een map omhoog</button>{/if}
        {#each children as folder (folder.path)}
          <button type="button" class="folder-option" aria-label={`Open map ${folder.path}`} onclick={() => browse(folder.path)}><Icon name="folder" size={17} /><span>{folder.name}</span><Icon name="arrow" size={15} /></button>
        {/each}
        {#if !children.length}<p class="empty-folder">Geen submappen</p>{/if}
      </div>
      {#if creating}
        <div class="create-folder">
          <label for={`${uid}-name`} class="sr-only">Nieuwe mapnaam</label>
          <input id={`${uid}-name`} bind:this={nameInput} bind:value={name} class="input" placeholder="Mapnaam" maxlength="240" disabled={saving} onkeydown={event => { if (event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); void create(); } }} />
          <button type="button" class="btn primary" disabled={saving || !name.trim()} onclick={create}>{saving ? 'Aanmaken…' : 'Aanmaken'}</button>
          <button type="button" class="cancel-create" aria-label="Map aanmaken annuleren" disabled={saving} onclick={() => creating = false}><Icon name="close" size={16} /></button>
        </div>
      {/if}
      {#if error}<p class="message error" role="alert">{error}</p>{/if}
      <div class="folder-actions">
        <button type="button" class="new-folder" onclick={beginCreate} disabled={saving}><Icon name="plus" size={16} />Nieuwe map</button>
        <button type="button" class="btn primary" disabled={saving} onclick={() => { value = current; open = false; }}>Deze map kiezen</button>
      </div>
    </Popover.Content>
  </Popover.Portal>
</Popover.Root>
<style>
  :global(.folder-picker-panel) { width: max(300px, var(--bits-popover-anchor-width, 300px)); max-width: calc(100vw - 24px); max-height: var(--bits-popover-content-available-height, 75vh); overflow: auto; }
  .chevron { color: var(--color-muted); font-size: 19px; line-height: 1; }
  .breadcrumbs { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 6px 5px 12px; border-bottom: 1px solid var(--color-border); color: var(--color-muted); font-size: 12px; }
  .breadcrumbs button { background: transparent; color: inherit; padding: 4px; overflow-wrap: anywhere; }
  .breadcrumbs button:hover, .breadcrumbs button[aria-current] { color: var(--color-ink); }
  .folder-options { max-height: 240px; overflow: auto; padding-block: 5px; }
  .folder-option { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 42px; padding: 9px; border-radius: 5px; background: transparent; text-align: left; font-size: 13px; }
  .folder-option span { flex: 1; overflow-wrap: anywhere; min-width: 0; }
  .folder-option :global(svg) { flex-shrink: 0; }
  .folder-option:hover, .folder-option:focus-visible { background: var(--color-soft); }
  .parent { color: var(--color-muted); font-size: 12px; }
  .empty-folder { padding: 16px 9px; font-size: 12px; color: var(--color-muted); }
  .folder-actions { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; padding: 10px 3px 3px; border-top: 1px solid var(--color-border); }
  .new-folder { display: flex; align-items: center; gap: 5px; padding: 8px 3px; background: transparent; font-size: 12px; }
  .folder-actions .btn, .create-folder .btn { padding: 8px 10px; min-height: 38px; font-size: 12px; }
  .create-folder { display: flex; gap: 6px; align-items: center; margin: 5px 0 10px; }
  .create-folder input { min-width: 0; flex: 1; }
  .cancel-create { background: transparent; padding: 8px; }
</style>
