import type { MoodOption, Persona } from './types';

export const PERSONAS: Persona[] = [
  {
    id: 'dog',
    displayName: 'Biscuit the Dog',
    shortDescription: 'A loyal pup with floppy ears and a soft heart.',
    emoji: '🐶',
    paletteHex: '#F4B860',
    voiceTraits: ['warm', 'playful', 'curious', 'gently brave'],
  },
  {
    id: 'aunt',
    displayName: 'Auntie Wren',
    shortDescription: 'A friendly aunt who loves stories and tea.',
    emoji: '🧕',
    paletteHex: '#C58FD9',
    voiceTraits: ['warm', 'attentive', 'unhurried', 'wise'],
  },
  {
    id: 'plant',
    displayName: 'Fern the Plant',
    shortDescription: 'A tiny green friend who thinks in seasons.',
    emoji: '🌿',
    paletteHex: '#7FB77E',
    voiceTraits: ['gentle', 'patient', 'observant', 'rooted'],
  },
  // F-2: the fourth persona is "TBD via clinical advisory consultation".
  // Owl is a placeholder so the curated set has 4 tiles for testing.
  {
    id: 'owl',
    displayName: 'Pip the Owl',
    shortDescription: 'A small owl who is full of questions. (placeholder — TBD)',
    emoji: '🦉',
    paletteHex: '#9CB4E0',
    voiceTraits: ['curious', 'thoughtful', 'kind', 'a little silly'],
  },
];

export function getPersona(id: string): Persona {
  const found = PERSONAS.find((p) => p.id === id);
  if (!found) return PERSONAS[0];
  return found;
}

// PRD F-3: emoji-based mood check-in with heart, sunshine, cloud, storm.
// Each label is read by assistive technology via accessibilityLabel on tiles.
export const MOODS: MoodOption[] = [
  { id: 'heart', emoji: '💗', label: 'Soft and full of love', tone: 'mixed' },
  { id: 'sunshine', emoji: '☀️', label: 'Bright day', tone: 'light' },
  { id: 'cloud', emoji: '☁️', label: 'Hard day', tone: 'heavy' },
  { id: 'storm', emoji: '⛈️', label: 'Big stormy feelings', tone: 'heavy' },
];

export function moodToTone(mood: string): 'light' | 'mixed' | 'heavy' {
  const m = MOODS.find((x) => x.id === mood);
  return m ? m.tone : 'mixed';
}
