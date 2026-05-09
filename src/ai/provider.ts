// AI provider interface.
//
// The scaffold ships with `StubAIProvider` so the app runs offline on
// localhost with zero API keys. Replacing it with a real provider (Claude,
// GPT, etc.) is a one-file change — implement the same interface and inject
// it via `getAIProvider()`.

import type {
  ChildProfile,
  Mood,
  Persona,
  Storybook,
  Turn,
} from '../types';

export interface CompanionReplyInput {
  persona: Persona;
  child: ChildProfile;
  mood: Mood;
  history: Turn[];
  latestChildText: string;
}

export interface StorybookInput {
  persona: Persona;
  child: ChildProfile;
  mood: Mood;
  turns: Turn[];
}

export interface AIProvider {
  name: string;
  companionReply(input: CompanionReplyInput): Promise<string>;
  generateStorybook(input: StorybookInput): Promise<Pick<Storybook, 'title' | 'pages'>>;
}

import { StubAIProvider } from './stubProvider';

let cached: AIProvider | null = null;
export function getAIProvider(): AIProvider {
  if (cached) return cached;
  cached = new StubAIProvider();
  return cached;
}
