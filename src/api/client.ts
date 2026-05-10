// Thin fetch wrapper for the Bedtime Storybook Companion API.
//
// Toggled by `EXPO_PUBLIC_API_URL`. When unset, the client falls back to
// the AsyncStorage-only flow in src/state.tsx — useful for offline review.
//
// Auth is the dev-only stub: the X-Parent-Id header is sent on every
// request once a parent is created. Production replaces this with Sign in
// with Apple (NFR-2) + the F-1 verifiable parental consent flow.

import AsyncStorage from '@react-native-async-storage/async-storage';

const PARENT_ID_KEY = 'bsc:parent-id';

function apiBase(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  return url && url.length > 0 ? url.replace(/\/$/, '') : null;
}

export function isApiEnabled(): boolean {
  return apiBase() !== null;
}

let cachedParentId: string | null = null;

export async function getParentId(): Promise<string | null> {
  if (cachedParentId) return cachedParentId;
  const v = await AsyncStorage.getItem(PARENT_ID_KEY);
  cachedParentId = v;
  return v;
}

export async function setParentId(id: string): Promise<void> {
  cachedParentId = id;
  await AsyncStorage.setItem(PARENT_ID_KEY, id);
}

export async function clearParentId(): Promise<void> {
  cachedParentId = null;
  await AsyncStorage.removeItem(PARENT_ID_KEY);
}

interface RequestOpts {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  authed?: boolean; // default true
}

export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown) {
    super(typeof detail === 'string' ? detail : `API ${status}`);
    this.status = status;
    this.detail = detail;
  }
}

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const base = apiBase();
  if (!base) throw new Error('EXPO_PUBLIC_API_URL is not set');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (opts.authed !== false) {
    const pid = await getParentId();
    if (pid) headers['X-Parent-Id'] = pid;
  }

  const res = await fetch(`${base}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : null;
  if (!res.ok) throw new ApiError(res.status, parsed?.detail ?? parsed ?? text);
  return parsed as T;
}

// --- Domain calls ---------------------------------------------------------

export interface ParentDTO {
  id: string;
  display_name: string;
  email: string | null;
  created_at: string;
}

export interface ChildDTO {
  id: string;
  parent_id: string;
  display_name: string;
  age_years: number;
  persona_id: string;
  reading_level: number;
  session_time_limit_minutes: number | null;
  consecutive_amber_sessions: number;
  created_at: string;
}

export interface PersonaDTO {
  id: string;
  display_name: string;
  short_description: string;
  emoji: string;
  palette_hex: string;
  voice_traits: string[];
}

export interface TrustedCircleMemberDTO {
  id: string;
  parent_id: string;
  display_name: string;
  relationship_label: string;
  email: string;
  receives_safety_alerts: boolean;
}

export type Mood = 'heart' | 'sunshine' | 'cloud' | 'storm';
export type SafetyZone = 'green' | 'amber' | 'red';
export type Speaker = 'child' | 'companion' | 'system';

export interface TurnDTO {
  id: string;
  session_id: string;
  speaker: Speaker;
  text: string;
  safety_zone: SafetyZone;
  created_at: string;
}

export interface SessionDTO {
  id: string;
  child_id: string;
  persona_id: string;
  mood: Mood;
  collaborative: boolean;
  highest_safety_zone: SafetyZone;
  storybook_id: string | null;
  created_at: string;
  turns: TurnDTO[];
}

export interface CompanionReplyDTO {
  child_turn: TurnDTO;
  companion_turn: TurnDTO;
  safety_zone: SafetyZone;
  safety_reason: string | null;
}

export interface StorybookPageDTO {
  id: string;
  page_order: number;
  text: string;
  image_prompt: string;
  image_url: string | null;
  illustration_emoji: string;
  illustration_bg: string;
}

export interface StorybookDTO {
  id: string;
  child_id: string;
  title: string;
  persona_id: string;
  mood: Mood;
  child_author_name: string;
  shared_with: string[];
  safety_override_zone: SafetyZone | null;
  safety_override_reason: string | null;
  created_at: string;
  pages: StorybookPageDTO[];
}

export interface SafetyEventDTO {
  id: string;
  session_id: string;
  storybook_id: string | null;
  zone: SafetyZone;
  reason: string;
  triggering_text: string | null;
  conversation_starters: string[];
  parent_notified_at: string | null;
  child_disclosed_at: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

export const api = {
  async createParent(displayName: string, email?: string): Promise<ParentDTO> {
    const out = await request<ParentDTO>('/v1/parents', {
      method: 'POST',
      authed: false,
      body: { display_name: displayName, email },
    });
    await setParentId(out.id);
    return out;
  },
  me(): Promise<ParentDTO> {
    return request<ParentDTO>('/v1/parents/me');
  },
  listPersonas(): Promise<PersonaDTO[]> {
    return request<PersonaDTO[]>('/v1/personas', { authed: false });
  },
  listChildren(): Promise<ChildDTO[]> {
    return request<ChildDTO[]>('/v1/children');
  },
  createChild(payload: {
    display_name: string;
    age_years: number;
    persona_id?: string;
    session_time_limit_minutes?: number;
  }): Promise<ChildDTO> {
    return request<ChildDTO>('/v1/children', { method: 'POST', body: payload });
  },
  updateChild(
    id: string,
    payload: Partial<{
      display_name: string;
      age_years: number;
      persona_id: string;
      session_time_limit_minutes: number;
    }>,
  ): Promise<ChildDTO> {
    return request<ChildDTO>(`/v1/children/${id}`, { method: 'PATCH', body: payload });
  },
  listTrustedCircle(): Promise<TrustedCircleMemberDTO[]> {
    return request<TrustedCircleMemberDTO[]>('/v1/trusted-circle');
  },
  addTrustedMember(payload: {
    display_name: string;
    relationship_label: string;
    email: string;
    receives_safety_alerts: boolean;
  }): Promise<TrustedCircleMemberDTO> {
    return request<TrustedCircleMemberDTO>('/v1/trusted-circle', { method: 'POST', body: payload });
  },
  removeTrustedMember(id: string): Promise<void> {
    return request<void>(`/v1/trusted-circle/${id}`, { method: 'DELETE' });
  },
  createSession(payload: { child_id: string; persona_id: string; mood: Mood }): Promise<SessionDTO> {
    return request<SessionDTO>('/v1/sessions', { method: 'POST', body: payload });
  },
  appendTurn(sessionId: string, text: string): Promise<CompanionReplyDTO> {
    return request<CompanionReplyDTO>(`/v1/sessions/${sessionId}/turns`, {
      method: 'POST',
      body: { text },
    });
  },
  generateStorybook(sessionId: string): Promise<StorybookDTO> {
    return request<StorybookDTO>(`/v1/sessions/${sessionId}/storybook`, { method: 'POST' });
  },
  listStorybooks(): Promise<StorybookDTO[]> {
    return request<StorybookDTO[]>('/v1/storybooks');
  },
  getStorybook(id: string): Promise<StorybookDTO> {
    return request<StorybookDTO>(`/v1/storybooks/${id}`);
  },
  shareStorybook(id: string, sharedWith: string[]): Promise<StorybookDTO> {
    return request<StorybookDTO>(`/v1/storybooks/${id}/share`, {
      method: 'PATCH',
      body: { shared_with: sharedWith },
    });
  },
  listSafetyEvents(): Promise<SafetyEventDTO[]> {
    return request<SafetyEventDTO[]>('/v1/safety-events');
  },
  acknowledgeSafetyEvent(id: string): Promise<SafetyEventDTO> {
    return request<SafetyEventDTO>(`/v1/safety-events/${id}/acknowledge`, { method: 'POST' });
  },
};
