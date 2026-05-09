// Core domain types for Bedtime Storybook Companion (working title).
// Kept deliberately small for the MVP scaffold — extend as the product grows.
//
// Mapping to PRD v1.0 §Data Model entities:
//   ParentProfile        → ParentAccount
//   ChildProfile         → ChildProfile
//   Persona              → Persona
//   Session              → Session (turns + mood + collaborators)
//   Storybook            → Storybook
//   StorybookPage        → Page
//   TrustedCircleMember  → TrustedCircleMember
//   SafetyAlert          → SafetyEvent
//   (Mood is captured on Session; a standalone MoodEntry record is not
//    yet broken out — see README gap "MoodEntry as separate record")

export type PersonaId = 'dog' | 'aunt' | 'plant' | 'owl';

export interface Persona {
  id: PersonaId;
  displayName: string;
  shortDescription: string;
  emoji: string;
  paletteHex: string;
  voiceTraits: string[];
}

// Per F-3: heart, sunshine, cloud, storm.
export type Mood = 'heart' | 'sunshine' | 'cloud' | 'storm';

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

// Safety zones, per PRD §F-9..F-11:
//   green — no concern detected
//   amber — patterns to track over time; does NOT break privacy. Persisting
//           5+ sessions of amber elevates the child to a clinical-advisory
//           review queue (F-11).
//   red   — severe-danger threshold; breaks privacy, surfaces to parent
//           within 60s with conversation starters and a 988 link (F-10).
export type SafetyZone = 'green' | 'amber' | 'red';

export interface SafetySignal {
  zone: SafetyZone;
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
  highestSafetyZone: SafetyZone;
}

export interface TrustedCircleMember {
  id: string;
  displayName: string;
  relationship: string; // "Mom", "Dad", "Aunt Jody", ...
  email: string; // F-14, F-15: lightweight account is provisioned via this email
  receivesSafetyAlerts: boolean;
}

export interface ChildProfile {
  id: string;
  displayName: string;
  ageYears: number; // 5..10
  personaId: PersonaId;
  // Demonstrated reading level — adapts upward over time. 0..1 within band.
  readingLevel: number;
  // F-18: optional parent-set per-session time limit, in minutes.
  sessionTimeLimitMinutes?: number;
  // F-11 support: count of consecutive sessions whose highest zone was amber.
  // Resets when a green-only session completes. >=5 elevates to clinical
  // advisory review queue (not yet implemented end-to-end).
  consecutiveAmberSessions?: number;
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
