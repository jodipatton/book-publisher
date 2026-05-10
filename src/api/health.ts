// Lightweight health probe so the splash screen can show whether the API
// flag is set AND the server is reachable. Cheap (single GET) and cached.

import { isApiEnabled } from './client';

export type BackendStatus =
  | { kind: 'disabled' }
  | { kind: 'connecting' }
  | { kind: 'ok'; url: string }
  | { kind: 'unreachable'; url: string; error: string };

export async function probeBackend(): Promise<BackendStatus> {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!isApiEnabled() || !url) return { kind: 'disabled' };
  try {
    const res = await fetch(`${url.replace(/\/$/, '')}/healthz`, { method: 'GET' });
    if (!res.ok) return { kind: 'unreachable', url, error: `HTTP ${res.status}` };
    return { kind: 'ok', url };
  } catch (e) {
    return { kind: 'unreachable', url, error: e instanceof Error ? e.message : String(e) };
  }
}
