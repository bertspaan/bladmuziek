import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';

export type Instrument = 'piano' | 'guitar';
export const instrumentStorageKey = 'bladmuziek:instrument';
const contextKey = Symbol('instrument');
export const isInstrument = (value: unknown): value is Instrument => value === 'piano' || value === 'guitar';

export function provideInstrument() {
  const instrument = writable<Instrument>('piano');
  setContext(contextKey, instrument);
  return instrument;
}
export function useInstrument() { return getContext<Writable<Instrument>>(contextKey); }
