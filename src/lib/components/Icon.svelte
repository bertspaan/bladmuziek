<script lang="ts">
  let { name, size = 20 }: { name: string; size?: number } = $props();
  const paths: Record<string, string> = {
    music: 'M9 18V5l12-2v13M9 8l12-2M9 18c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Zm12-2c0 2-2 3-4 3s-3-1-3-2 2-3 4-3 3 1 3 2Z',
    library: 'M4 4v16M9 4v16M14 4v16M18 5l4 14',
    search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',
    plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', chevron: 'M9 5l7 7-7 7',
    arrow: 'M5 12h14m-6-6 6 6-6 6', back: 'M19 12H5m6-6-6 6 6 6',
    external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7',
    print: 'M6 9V3h12v6M6 18H3V9h18v9h-3M6 14h12v7H6zM17 12h1',
    edit: 'M16 3l5 5-12 12H4v-5L16 3ZM13 6l5 5',
    check: 'M4 12l5 5L20 6', close: 'M6 6l12 12M6 18 18 6',
    folder: 'M3 6h7l2 3h9v11H3V6Zm0 0V4h7l2 2',
    link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    text: 'M4 5h16M12 5v15M8 20h8',
    reset: 'M3 4v6h6M3 10a9 9 0 1 1 1 8',
    file: 'M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8M8 17h5',
    grip: 'M8 5h.01M16 5h.01M8 12h.01M16 12h.01M8 19h.01M16 19h.01',
    save: 'M4 3h14l3 3v15H3V3h1Zm3 0v6h10V3M7 21v-8h10v8'
  };
</script>
<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={paths[name] || paths.music} /></svg>
