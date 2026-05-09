// Core domain types for Storytime Sanctuary.
// Kept deliberately small for the MVP scaffold — extend as the product grows.

export type PersonaId = 'dog' | 'aunt' | 'plant' | 'owl';

export interface Persona {
  id: PersonaId;
  displayName: string;
  shortDescription: string;
  emoji: string;
  paletteHex: string;
  voiceTraits: string[];
}

export type Mood = 'sunshine' | 'rainbow' | 'cloud' | 'storm' | 'heart' | 'spark';

export interface MoodOption {
  id: Mood;
  emoji: string;
  label: string;
  tone: 'light' | 'mixed' | 'heavy';
}

export type Speaker = 'child' | 'companion' | 'system';

export interface Turn {
  id: string;
  speaker: Speaker;
  text: string;
  createdAt: number;
}

export type SafetyLevel = 'ok' | 'watch' | 'urgent';

export interface SafetySignal {
  level: SafetyLevel;
  reason?: string;
  matchedTerms?: string[];
}

export interface StorybookPage {
  id: string;
  text: string;
  imagePrompt: string;
  // For the scaffold we don't actually call an image model — we store an
  // emoji + palette so the page can render deterministically offline.
  illustrationEmoji: string;
  illustrationBg: string;
}

export interface Storybook {
  id: string;
  title: string;
  createdAt: number;
  personaId: PersonaId;
  mood: Mood;
  pages: StorybookPage[];
  childAuthorName: string;
  // child-controlled. If empty, the book lives in the private library.
  sharedWith: string[]; // TrustedCircleMember.id[]
  // If a safety threshold fired, this is set and the book/notification is
  // surfaced to the parent regardless of the child's sharing choice.
  safetyOverride?: SafetySignal;
}

export interface Session {
  id: string;
  startedAt: number;
  personaId: PersonaId;
  mood: Mood;
  turns: Turn[];
  collaborators: string[]; // TrustedCircleMember.id[] currently in the session
  storybookId?: string;
  highestSafetyLevel: SafetyLevel;
}

export interface TrustedCircleMember {
  id: string;
  displayName: string;
  relationship: string; // "Mom", "Dad", "Aunt Jody", ...
  receivesSafetyAlerts: boolean;
}

export interface ChildProfile {
  id: string;
  displayName: string;
  ageYears: number; // 5..10
  personaId: PersonaId;
  // Demonstrated reading level — adapts upward over time. 0..1 within band.
  readingLevel: number;
}

export interface ParentProfile {
  id: string;
  displayName: string;
  email?: string;
}

export interface AppState {
  parent: ParentProfile | null;
  child: ChildProfile | null;
  trustedCircle: TrustedCircleMember[];
  storybooks: Storybook[];
  pendingSafetyAlerts: SafetyAlert[];
}

export interface SafetyAlert {
  id: string;
  storybookId: string;
  signal: SafetySignal;
  createdAt: number;
  conversationStarters: string[];
  acknowledgedAt?: number;
}
