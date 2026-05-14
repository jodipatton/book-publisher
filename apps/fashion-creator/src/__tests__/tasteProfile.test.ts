import { beforeEach, describe, expect, it } from 'vitest';

import {
  applyTasteProfile,
  emptyProfile,
  loadTasteProfile,
  recordCorrection,
  resetTasteProfile,
  saveTasteProfile,
} from '@/lib/tasteProfile';
import { parseDescriptionToFashionpedia } from '@/lib/fashionpedia';

// Minimal in-memory localStorage shim so the cross-session persistence
// test runs in a Node test environment.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() { return this.store.size; }
  clear() { this.store.clear(); }
  getItem(key: string) { return this.store.get(key) ?? null; }
  key(i: number) { return [...this.store.keys()][i] ?? null; }
  removeItem(key: string) { this.store.delete(key); }
  setItem(key: string, value: string) { this.store.set(key, value); }
}

describe('taste profile', () => {
  beforeEach(() => {
    (globalThis as { localStorage: Storage }).localStorage = new MemoryStorage();
  });

  it('starts empty for a new user', () => {
    const profile = emptyProfile('alice');
    expect(profile.entries).toHaveLength(0);
    expect(profile.correctionCycles).toBe(0);
  });

  it('records a correction and increments weight on repeat', () => {
    let profile = emptyProfile('alice');
    profile = recordCorrection(profile, 'soft pink', 'color', '#d49aa1');
    profile = recordCorrection(profile, 'soft pink', 'color', '#d49aa1');
    expect(profile.entries).toHaveLength(1);
    expect(profile.entries[0].weight).toBe(2);
    expect(profile.correctionCycles).toBe(2);
  });

  it('persists across simulated sessions', () => {
    let profile = emptyProfile('bob');
    profile = recordCorrection(profile, 'flowy', 'fabricBehavior', 'flowing');
    saveTasteProfile(profile);
    const reloaded = loadTasteProfile('bob');
    expect(reloaded.entries[0]).toMatchObject({
      phrase: 'flowy',
      parameter: 'fabricBehavior',
      value: 'flowing',
      weight: 1,
    });
  });

  it('improves first-generation alignment after recorded corrections', () => {
    let profile = emptyProfile('eve');
    // Without the profile, "muted pink" doesn't have a color mapping.
    const before = parseDescriptionToFashionpedia('a muted pink dress', profile);
    // Eve corrects the system: "muted pink" means #b58f95 for her.
    profile = recordCorrection(profile, 'muted pink', 'color', '#b58f95');
    const after = parseDescriptionToFashionpedia('a muted pink dress', profile);
    expect(after.color).toBe('#b58f95');
    expect(after.color).not.toBe(before.color);
  });

  it('applies a profile entry inside applyTasteProfile', () => {
    let profile = emptyProfile('cat');
    profile = recordCorrection(profile, 'sage', 'color', '#a4b89a');
    const params = parseDescriptionToFashionpedia('a sage dress');
    // Color in the synthetic params is the default lookup. Verify the
    // profile overlay still applies on top of an already-parsed object.
    const updated = applyTasteProfile(params, 'a sage dress', profile);
    expect(updated.color).toBe('#a4b89a');
  });

  it('reset clears the profile', () => {
    let profile = emptyProfile('dan');
    profile = recordCorrection(profile, 'crisp', 'fabricBehavior', 'crisp');
    saveTasteProfile(profile);
    const fresh = resetTasteProfile('dan');
    expect(fresh.entries).toHaveLength(0);
    expect(loadTasteProfile('dan').entries).toHaveLength(0);
  });
});
