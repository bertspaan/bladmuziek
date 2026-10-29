import { expect, it, vi } from 'vitest';
vi.mock('../src/lib/server/providers/fetch', async importOriginal => ({ ...await importOriginal<object>(), fetchHtml: vi.fn() }));
import { fetchHtml } from '../src/lib/server/providers/fetch';
import { searchMusic } from '../src/lib/server/providers';
it('toont Chordie-resultaten wanneer Ultimate Guitar uitvalt', async () => {
  vi.mocked(fetchHtml).mockImplementation(async url => {
    if (url.includes('ultimate-guitar')) throw new Error('Niet beschikbaar');
    return '<title>Search Results</title><a href="/chord.pere/example/song.html"><span>Eigen lied</span><span>Artiest</span></a>';
  });
  const result = await searchMusic('Eigen lied');
  expect(result.results).toHaveLength(1); expect(result.results[0].source).toBe('Chordie');
  expect(result.warnings[0]).toContain('Ultimate Guitar');
});
