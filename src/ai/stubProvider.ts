import type { Storybook, StorybookPage, Turn } from '../types';
import { moodToTone } from '../personas';
import type { AIProvider, CompanionReplyInput, StorybookInput } from './provider';

// Deterministic, offline stub. Pretends to "think" briefly so the UI can show
// a loading state, but never makes a network call. Output is shaped to be
// believable enough to test the flow end-to-end.

function pick<T>(arr: T[], seed: number): T {
  const i = Math.abs(seed) % arr.length;
  return arr[i];
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const LIGHT_REPLIES = [
  'Oh wow! Tell me more about that. What happened next?',
  'That sounds wonderful. What was your favorite part?',
  'Hehe, I love that. Were you laughing the whole time?',
];

const MIXED_REPLIES = [
  'Mmm. That sounds like a lot of feelings all at once. Which one was the biggest?',
  'I am listening. What did your body feel like when that happened?',
  'Sometimes good and tricky things live right next to each other. Was that today?',
];

const HEAVY_REPLIES = [
  'I am right here. You can take your time. What was the hardest part?',
  'That sounds heavy. Did anyone notice you were having a hard time?',
  'I am sorry it was like that. Would it help to make a story about it together?',
];

export class StubAIProvider implements AIProvider {
  name = 'stub';

  async companionReply(input: CompanionReplyInput): Promise<string> {
    await delay(450);
    const tone = moodToTone(input.mood);
    const seed = hashString(input.latestChildText + input.history.length);
    const opener =
      input.history.filter((t) => t.speaker === 'companion').length === 0
        ? `${input.persona.emoji} Hi ${input.child.displayName}. I am so glad you are here. `
        : '';
    const body =
      tone === 'light'
        ? pick(LIGHT_REPLIES, seed)
        : tone === 'heavy'
          ? pick(HEAVY_REPLIES, seed)
          : pick(MIXED_REPLIES, seed);
    return opener + body;
  }

  async generateStorybook(input: StorybookInput): Promise<Pick<Storybook, 'title' | 'pages'>> {
    await delay(900);
    const childTurns: Turn[] = input.turns.filter((t) => t.speaker === 'child');
    const tone = moodToTone(input.mood);

    const title = buildTitle(input.child.displayName, input.persona.displayName, tone);

    const beats: { kind: 'open' | 'middle' | 'close'; idx: number }[] = [
      { kind: 'open', idx: 0 },
      ...childTurns.slice(0, 3).map((_, i) => ({ kind: 'middle' as const, idx: i })),
      { kind: 'close', idx: 0 },
    ];

    const pages: StorybookPage[] = beats.map((beat, i) => {
      const emoji = pageEmoji(tone, i);
      const bg = pageBg(tone, i);
      let text = '';
      if (beat.kind === 'open') {
        text = `Once there was a child named ${input.child.displayName}, and a friend named ${input.persona.displayName}. Together, they liked to wonder about the world.`;
      } else if (beat.kind === 'close') {
        text =
          tone === 'heavy'
            ? `${input.persona.displayName} sat close. "Some days are heavy," ${input.persona.displayName} said softly. "And we can carry them together." ${input.child.displayName} nodded, and the night was a little less loud.`
            : tone === 'light'
              ? `${input.child.displayName} smiled, and ${input.persona.displayName} smiled back. The day was full of small bright things, and that was enough.`
              : `${input.persona.displayName} took ${input.child.displayName}'s hand. "Lots of feelings is okay," ${input.persona.displayName} said. "We can make space for all of them."`;
      } else {
        const turn = childTurns[beat.idx];
        const childWords = turn ? softenChildText(turn.text) : 'something quiet';
        text = `${input.child.displayName} told ${input.persona.displayName} about ${childWords}. ${input.persona.displayName} listened with their whole heart.`;
      }
      return {
        id: `p_${i}`,
        text,
        imagePrompt: `${input.persona.displayName} and ${input.child.displayName} — page ${i + 1}, ${tone} mood`,
        illustrationEmoji: emoji,
        illustrationBg: bg,
      };
    });

    return { title, pages };
  }
}

function buildTitle(childName: string, personaName: string, tone: 'light' | 'mixed' | 'heavy'): string {
  if (tone === 'heavy') return `${childName} and ${personaName} on a Heavy Night`;
  if (tone === 'light') return `${childName} and ${personaName}'s Bright Day`;
  return `${childName} and ${personaName} and All the Feelings`;
}

function softenChildText(t: string): string {
  // Keep it short for an illustrated page. Keep child voice but trim.
  const cleaned = t.trim().replace(/\s+/g, ' ');
  if (cleaned.length <= 80) return `"${cleaned}"`;
  return `"${cleaned.slice(0, 78)}…"`;
}

function pageEmoji(tone: 'light' | 'mixed' | 'heavy', i: number): string {
  const light = ['🌞', '🌻', '🦋', '🌈', '🍓'];
  const mixed = ['🌤️', '🌱', '🪁', '🎈', '🌙'];
  const heavy = ['🌧️', '🫂', '🕯️', '🌌', '🌙'];
  const arr = tone === 'light' ? light : tone === 'heavy' ? heavy : mixed;
  return arr[i % arr.length];
}

function pageBg(tone: 'light' | 'mixed' | 'heavy', i: number): string {
  const light = ['#FFF6CF', '#FFE0B5', '#FFD9E4', '#E8F4D6', '#FCEBC1'];
  const mixed = ['#E5E8FA', '#F2E6FA', '#E8F1F8', '#F8EBE0', '#EAF3EC'];
  const heavy = ['#D9E2EC', '#CDD7E0', '#C4D0DC', '#DCE2EC', '#E2E7EE'];
  const arr = tone === 'light' ? light : tone === 'heavy' ? heavy : mixed;
  return arr[i % arr.length];
}
