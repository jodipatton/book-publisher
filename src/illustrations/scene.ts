// Composed-scene illustrations.
//
// We don't have a real image-gen model wired in. Instead we compose each
// page's illustration deterministically from (tone, pageIndex, persona,
// imagePrompt keywords) into a layered scene that React Native primitives
// can render: a gradient sky, midground silhouettes, foreground props
// and the persona character, plus decorative drift (butterflies, fireflies,
// petals) for storybook feel.
//
// When a real image model later replaces this, it slots in behind the same
// `composeScene(input) → SceneDescriptor` shape. Existing
// `StorybookPage.image_prompt` (built server-side) is the textual prompt
// that model would consume; the local composer treats it as keyword hints.

import type { Mood, PersonaId } from '../types';

export type Tone = 'light' | 'mixed' | 'heavy';

export interface SceneDescriptor {
  tone: Tone;
  // Sky gradient stops (top → bottom).
  sky: [string, string, string];
  // Midground accent (rolling hills, silhouettes).
  ground: string;
  // Decorative drift overlay — small floaty elements (no functional role).
  drift: { emoji: string; left: string; top: string; size: number; opacity: number }[];
  // Celestial body in the sky (sun, moon, or none).
  celestial: { emoji: string; size: number; left: string; top: string } | null;
  // Persona character in the scene foreground.
  persona: { emoji: string; size: number };
  // Scene-specific props in the foreground (a frog, a swing, a book, etc.)
  // chosen by image-prompt keyword matching.
  props: { emoji: string; size: number; offsetX: number }[];
  // Horizon / ground baseline (% from top).
  horizon: number;
}

export interface ComposeInput {
  tone: Tone;
  pageIndex: number; // 0..N-1 within the storybook
  pageCount: number;
  personaId: PersonaId;
  personaEmoji: string;
  imagePrompt: string;
}

// ---------- palette ---------------------------------------------------------

const SKY_BY_TONE: Record<Tone, [string, string, string][]> = {
  light: [
    ['#FFE9B5', '#FFD68F', '#FFC07A'], // sunrise
    ['#BEE3F8', '#FBE4B6', '#FFD68F'], // bright day
    ['#FFE0B5', '#FBC78D', '#F4A86A'], // golden hour
  ],
  mixed: [
    ['#E5D9FA', '#F2D7E8', '#FCE4D6'], // soft pastel
    ['#D9E0F5', '#E5DEF5', '#F2E0DC'], // dusk warm
    ['#E8E5F8', '#F4D9EB', '#F8E2D0'], // dreamy
  ],
  heavy: [
    ['#3D4866', '#5C6E94', '#9CB1C9'], // twilight
    ['#2E3A55', '#475673', '#7E92AE'], // night with hope
    ['#465A75', '#6F88A8', '#A9BBCF'], // overcast soft
  ],
};

const GROUND_BY_TONE: Record<Tone, string[]> = {
  light: ['#88C56E', '#A8D88A', '#9DCB7C'],
  mixed: ['#9FB07C', '#A6B58E', '#8FAA94'],
  heavy: ['#3F5060', '#4D6072', '#3A4A5A'],
};

const DRIFT_BY_TONE: Record<Tone, string[]> = {
  light: ['🦋', '🌸', '🍃', '🌼'],
  mixed: ['🍃', '🪶', '✨', '🌿'],
  heavy: ['✨', '🪶', '⭐', '🌙'],
};

// Page-position semantics: open / middle / close. Different scene logic.
type Beat = 'open' | 'middle' | 'close';
function beatFor(pageIndex: number, pageCount: number): Beat {
  if (pageIndex === 0) return 'open';
  if (pageIndex === pageCount - 1) return 'close';
  return 'middle';
}

// ---------- prop selection from prompt keywords -----------------------------

interface PropRule {
  // Substring keys (lowercased) that select this prop set.
  keys: string[];
  // 1–2 emojis that fit the scene.
  emojis: string[];
}

const PROP_RULES: PropRule[] = [
  { keys: ['frog', 'pond', 'lake', 'water', 'puddle'], emojis: ['🐸', '💧'] },
  { keys: ['swing', 'playground', 'park', 'slide'], emojis: ['🎠'] },
  { keys: ['school', 'classroom', 'teacher'], emojis: ['🏫', '✏️'] },
  { keys: ['friend', 'play', 'laugh', 'game'], emojis: ['🎈'] },
  { keys: ['bedtime', 'sleep', 'tired', 'night', 'moon'], emojis: ['🛏️', '⭐'] },
  { keys: ['cry', 'sad', 'lonely', 'hard'], emojis: ['💧'] },
  { keys: ['mom', 'dad', 'parent', 'family'], emojis: ['🫂'] },
  { keys: ['book', 'story', 'read'], emojis: ['📖'] },
  { keys: ['lake', 'beach', 'sand', 'shore'], emojis: ['🏖️'] },
  { keys: ['dog', 'puppy', 'pet'], emojis: ['🦴'] },
  { keys: ['bird', 'fly', 'tree', 'forest'], emojis: ['🌳'] },
  { keys: ['flower', 'garden', 'spring'], emojis: ['🌷'] },
  { keys: ['rain', 'storm', 'cloud'], emojis: ['🌧️'] },
];

function pickProps(prompt: string, beat: Beat, tone: Tone): string[] {
  const lower = prompt.toLowerCase();
  const matched: string[] = [];
  for (const rule of PROP_RULES) {
    if (rule.keys.some((k) => lower.includes(k))) {
      matched.push(...rule.emojis);
    }
    if (matched.length >= 2) break;
  }
  if (matched.length > 0) return matched.slice(0, 2);

  // Fallbacks if no keyword match.
  if (beat === 'close') {
    return tone === 'heavy' ? ['🌙'] : tone === 'light' ? ['🌙', '⭐'] : ['🌙'];
  }
  if (beat === 'open') {
    return tone === 'light' ? ['🌳'] : tone === 'heavy' ? ['🕯️'] : ['🌿'];
  }
  return tone === 'light' ? ['🌼', '🌳'] : tone === 'heavy' ? ['🕯️'] : ['🌿', '🦋'];
}

// ---------- celestial selection --------------------------------------------

function celestialFor(tone: Tone, beat: Beat): SceneDescriptor['celestial'] {
  if (beat === 'close') {
    if (tone === 'light') return { emoji: '🌙', size: 44, left: '78%', top: '12%' };
    if (tone === 'heavy') return { emoji: '🌙', size: 56, left: '20%', top: '10%' };
    return { emoji: '🌙', size: 48, left: '76%', top: '12%' };
  }
  if (tone === 'light') return { emoji: '☀️', size: 60, left: '74%', top: '10%' };
  if (tone === 'heavy') return null; // skies stay quiet
  return { emoji: '☁️', size: 56, left: '72%', top: '14%' };
}

// ---------- drift -----------------------------------------------------------

function driftFor(tone: Tone, beat: Beat, seed: number): SceneDescriptor['drift'] {
  const set = DRIFT_BY_TONE[tone];
  // Three drift sprites, jittered by seed for variety across pages.
  const positions: { left: string; top: string }[] = [
    { left: `${10 + (seed % 12)}%`, top: `${20 + ((seed >> 2) % 14)}%` },
    { left: `${55 + ((seed >> 3) % 18)}%`, top: `${36 + ((seed >> 4) % 16)}%` },
    { left: `${28 + ((seed >> 5) % 22)}%`, top: `${48 + ((seed >> 6) % 12)}%` },
  ];
  return positions.map((p, i) => ({
    emoji: set[(seed + i) % set.length],
    left: p.left,
    top: p.top,
    size: 22 + ((seed >> (i + 1)) % 10),
    opacity: beat === 'close' && tone !== 'light' ? 0.85 : 0.95,
  }));
}

// ---------- main composer --------------------------------------------------

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function composeScene(input: ComposeInput): SceneDescriptor {
  const beat = beatFor(input.pageIndex, input.pageCount);
  const seed = hash(`${input.personaId}|${input.pageIndex}|${input.imagePrompt}`);
  const skyVariants = SKY_BY_TONE[input.tone];
  const sky = skyVariants[seed % skyVariants.length];
  const grounds = GROUND_BY_TONE[input.tone];
  const ground = grounds[(seed >> 1) % grounds.length];

  const props = pickProps(input.imagePrompt, beat, input.tone).map((emoji, i) => ({
    emoji,
    size: 44 - i * 4,
    offsetX: i === 0 ? -64 : 64,
  }));

  return {
    tone: input.tone,
    sky,
    ground,
    drift: driftFor(input.tone, beat, seed),
    celestial: celestialFor(input.tone, beat),
    persona: { emoji: input.personaEmoji, size: 80 },
    props,
    horizon: input.tone === 'heavy' ? 64 : 60, // %
  };
}

// Convenience: derive Tone from Mood — kept here so screens don't need to
// duplicate the mood-tone map that lives in src/personas.ts.
export function toneFromMood(mood: Mood): Tone {
  if (mood === 'sunshine') return 'light';
  if (mood === 'cloud' || mood === 'storm') return 'heavy';
  return 'mixed';
}
