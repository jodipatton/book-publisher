// Per-user taste profile.
//
// Production persists to Firestore behind Firebase Auth. The scaffold
// persists to localStorage so the cross-session improvement loop works
// without standing up a backend. The shape on disk is identical, so the
// Firestore migration is `JSON.stringify` → upload.

import type { GarmentParams, TasteEntry, TasteProfile } from './types';

const STORAGE_KEY_PREFIX = 'voiceatelier.tasteProfile.';

export function emptyProfile(userId: string): TasteProfile {
  return { userId, entries: [], correctionCycles: 0 };
}

export function loadTasteProfile(userId: string): TasteProfile {
  if (typeof localStorage === 'undefined') return emptyProfile(userId);
  const raw = localStorage.getItem(STORAGE_KEY_PREFIX + userId);
  if (!raw) return emptyProfile(userId);
  try {
    const parsed = JSON.parse(raw) as TasteProfile;
    if (!parsed.entries) return emptyProfile(userId);
    return parsed;
  } catch {
    return emptyProfile(userId);
  }
}

export function saveTasteProfile(profile: TasteProfile): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY_PREFIX + profile.userId, JSON.stringify(profile));
}

export function resetTasteProfile(userId: string): TasteProfile {
  const fresh = emptyProfile(userId);
  saveTasteProfile(fresh);
  return fresh;
}

// Record a correction: the user said `phrase` and we ultimately ended up
// with `value` for `parameter`. If the same (phrase, parameter, value)
// triple already exists we increment its weight rather than appending a
// duplicate. That weight is what the design interpreter uses to bias
// future first-generation results toward this user's idiolect.
export function recordCorrection(
  profile: TasteProfile,
  phrase: string,
  parameter: TasteEntry['parameter'],
  value: string,
): TasteProfile {
  const cleaned = phrase.trim().toLowerCase();
  if (!cleaned || !value) return profile;

  const existing = profile.entries.findIndex(
    (e) =>
      e.phrase.toLowerCase() === cleaned &&
      e.parameter === parameter &&
      e.value === value,
  );

  const now = Date.now();
  const entries = [...profile.entries];
  if (existing >= 0) {
    entries[existing] = {
      ...entries[existing],
      weight: entries[existing].weight + 1,
      updatedAt: now,
    };
  } else {
    entries.push({
      phrase: cleaned,
      parameter,
      value,
      weight: 1,
      updatedAt: now,
    });
  }
  return { ...profile, entries, correctionCycles: profile.correctionCycles + 1 };
}

// Apply the taste profile to a freshly-generated GarmentParams. We only
// override fields the interpreter would have guessed at — never fields
// the user explicitly named in this utterance.
export function applyTasteProfile(
  params: GarmentParams,
  utterance: string,
  profile: TasteProfile,
): GarmentParams {
  if (profile.entries.length === 0) return params;
  const lower = utterance.toLowerCase();
  let next = { ...params };

  for (const entry of profile.entries) {
    if (!lower.includes(entry.phrase)) continue;
    if (entry.parameter === 'color') {
      // Color overrides are always safe — the user has told us this
      // phrase means this hex.
      next.color = entry.value;
    } else if (entry.parameter in next) {
      // Cast through unknown since the union of parameter keys covers
      // multiple value types; the recorded value is always a string and
      // we trust the recording site to have normalized it.
      (next as unknown as Record<string, unknown>)[entry.parameter] = entry.value;
    }
  }
  return next;
}
