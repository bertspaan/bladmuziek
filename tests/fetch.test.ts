import { describe, expect, it, vi } from 'vitest';
vi.mock('node:dns/promises', () => ({ lookup: vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]) }));
import { fetchHtml } from '../src/lib/server/providers/fetch';
import { lookup } from 'node:dns/promises';
const url = 'https://tabs.ultimate-guitar.com/tab/1';
describe('serververzoeken', () => {
  it.each([404, 410])('legt uit hoe een niet-werkende korte bronlink hersteld kan worden (%s)', async status => {
    await expect(fetchHtml(url, vi.fn(async () => new Response(null, { status })))).rejects.toThrow('volledige link met artiest en titel');
  });
  it('meldt een ontbrekende volledige bronpagina zonder een blokkade te suggereren', async () => {
    await expect(fetchHtml('https://tabs.ultimate-guitar.com/tab/test/eigen-lied-chords-1', vi.fn(async () => new Response(null, { status: 404 })))).rejects.toThrow('niet gevonden of verwijderd');
  });
  it('controleert redirects voordat het vervolgverzoek wordt gedaan', async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }));
    await expect(fetchHtml(url, fetcher as typeof fetch)).rejects.toMatchObject({ status: 400 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('begrensde streaming voorkomt een te grote download', async () => {
    const response = new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4_000_001)); controller.close(); } }));
    await expect(fetchHtml(url, vi.fn(async () => response) as typeof fetch)).rejects.toThrow('te groot');
  });
  it('weigert een interne DNS-uitkomst', async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: '127.0.0.1', family: 4 }] as never);
    const fetcher = vi.fn();
    await expect(fetchHtml(url, fetcher)).rejects.toThrow('publieke website');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('geeft een begrijpelijke fout bij een netwerkstoring', async () => {
    await expect(fetchHtml(url, vi.fn(async () => { throw new Error('ECONNRESET'); }))).rejects.toThrow('reageert niet');
  });
});
