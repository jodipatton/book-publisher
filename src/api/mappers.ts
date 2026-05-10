// Convert API DTOs (snake_case, ISO timestamps, server UUIDs) to the
// local-state shapes (camelCase, ms timestamps). One direction only — the
// API is the source of truth when EXPO_PUBLIC_API_URL is set, so we don't
// generally need local→DTO mappers; ad-hoc payloads in client.ts cover
// the few write paths.

import type {
  ChildDTO,
  ParentDTO,
  PersonaDTO,
  SafetyEventDTO,
  StorybookDTO,
  TrustedCircleMemberDTO,
} from './client';
import type {
  ChildProfile,
  ParentProfile,
  PersonaId,
  SafetyAlert,
  Storybook,
  StorybookPage,
  TrustedCircleMember,
} from '../types';

const KNOWN_PERSONA_IDS: readonly PersonaId[] = ['dog', 'aunt', 'plant', 'owl'];

function asPersonaId(v: string): PersonaId {
  return (KNOWN_PERSONA_IDS as readonly string[]).includes(v) ? (v as PersonaId) : 'dog';
}

function isoToMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : Date.now();
}

export function parentFromDTO(d: ParentDTO): ParentProfile {
  return { id: d.id, displayName: d.display_name, email: d.email ?? undefined };
}

export function childFromDTO(d: ChildDTO): ChildProfile {
  return {
    id: d.id,
    displayName: d.display_name,
    ageYears: d.age_years,
    personaId: asPersonaId(d.persona_id),
    readingLevel: d.reading_level,
    sessionTimeLimitMinutes: d.session_time_limit_minutes ?? undefined,
    consecutiveAmberSessions: d.consecutive_amber_sessions,
  };
}

export function trustedMemberFromDTO(d: TrustedCircleMemberDTO): TrustedCircleMember {
  return {
    id: d.id,
    displayName: d.display_name,
    relationship: d.relationship_label,
    email: d.email,
    receivesSafetyAlerts: d.receives_safety_alerts,
  };
}

export function storybookFromDTO(d: StorybookDTO): Storybook {
  const pages: StorybookPage[] = d.pages
    .slice()
    .sort((a, b) => a.page_order - b.page_order)
    .map((p) => ({
      id: p.id,
      text: p.text,
      imagePrompt: p.image_prompt,
      illustrationEmoji: p.illustration_emoji,
      illustrationBg: p.illustration_bg,
    }));
  return {
    id: d.id,
    title: d.title,
    createdAt: isoToMs(d.created_at),
    personaId: asPersonaId(d.persona_id),
    mood: d.mood,
    pages,
    childAuthorName: d.child_author_name,
    sharedWith: d.shared_with,
    safetyOverride:
      d.safety_override_zone === 'red'
        ? { zone: 'red', reason: d.safety_override_reason ?? undefined }
        : undefined,
  };
}

export function safetyAlertFromEventDTO(d: SafetyEventDTO): SafetyAlert {
  return {
    id: d.id,
    storybookId: d.storybook_id ?? '',
    signal: { zone: d.zone, reason: d.reason },
    createdAt: isoToMs(d.created_at),
    conversationStarters: d.conversation_starters,
    acknowledgedAt: d.acknowledged_at ? isoToMs(d.acknowledged_at) : undefined,
  };
}

// Persona mapping: server is the canonical persona registry, but the
// curated-set rendering on PersonaPickScreen is fed by a local constant.
// Expose a converter so a future commit can hydrate that screen too.
export function personaIdFromDTO(d: PersonaDTO): PersonaId {
  return asPersonaId(d.id);
}
