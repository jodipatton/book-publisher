import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppState } from './types';

// NFR-3: COPPA encryption at rest. AsyncStorage is NOT encrypted by default —
// on web it lives in localStorage; on iOS in unencrypted plist files in the
// app sandbox. Before any production launch this must move to encrypted
// storage (expo-secure-store or a server-side store with field-level
// encryption) for any field touching child data.

const KEY = 'storytime-sanctuary:v1';

const EMPTY: AppState = {
  parent: null,
  child: null,
  trustedCircle: [],
  storybooks: [],
  pendingSafetyAlerts: [],
};

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return { ...EMPTY, ...parsed };
  } catch {
    return EMPTY;
  }
}

export async function saveState(s: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Best-effort. The MVP scaffold tolerates storage failure.
  }
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
