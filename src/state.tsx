import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { loadState, saveState } from './storage';
import type {
  AppState,
  ChildProfile,
  ParentProfile,
  SafetyAlert,
  Storybook,
  TrustedCircleMember,
} from './types';

type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'setParent'; parent: ParentProfile | null }
  | { type: 'setChild'; child: ChildProfile | null }
  | { type: 'setTrustedCircle'; members: TrustedCircleMember[] }
  | { type: 'setStorybooks'; storybooks: Storybook[] }
  | { type: 'addStorybook'; storybook: Storybook }
  | { type: 'updateStorybook'; storybook: Storybook }
  | { type: 'setSafetyAlerts'; alerts: SafetyAlert[] }
  | { type: 'addSafetyAlert'; alert: SafetyAlert }
  | { type: 'acknowledgeSafetyAlert'; id: string }
  | { type: 'reset' };

const INITIAL: AppState = {
  parent: null,
  child: null,
  trustedCircle: [],
  storybooks: [],
  pendingSafetyAlerts: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'setParent':
      return { ...state, parent: action.parent };
    case 'setChild':
      return { ...state, child: action.child };
    case 'setTrustedCircle':
      return { ...state, trustedCircle: action.members };
    case 'setStorybooks':
      return { ...state, storybooks: action.storybooks };
    case 'addStorybook':
      // De-dupe on id so a hydrate-then-add or two-add races don't duplicate.
      return {
        ...state,
        storybooks: [
          action.storybook,
          ...state.storybooks.filter((b) => b.id !== action.storybook.id),
        ],
      };
    case 'updateStorybook':
      return {
        ...state,
        storybooks: state.storybooks.map((b) => (b.id === action.storybook.id ? action.storybook : b)),
      };
    case 'setSafetyAlerts':
      return { ...state, pendingSafetyAlerts: action.alerts };
    case 'addSafetyAlert':
      return {
        ...state,
        pendingSafetyAlerts: [
          action.alert,
          ...state.pendingSafetyAlerts.filter((a) => a.id !== action.alert.id),
        ],
      };
    case 'acknowledgeSafetyAlert':
      return {
        ...state,
        pendingSafetyAlerts: state.pendingSafetyAlerts.map((a) =>
          a.id === action.id ? { ...a, acknowledgedAt: Date.now() } : a,
        ),
      };
    case 'reset':
      return INITIAL;
  }
}

interface StoreContextValue {
  state: AppState;
  ready: boolean;
  dispatch: React.Dispatch<Action>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    let mounted = true;
    loadState().then((s) => {
      if (!mounted) return;
      dispatch({ type: 'hydrate', state: s });
      setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveState(state);
  }, [state, ready]);

  const value = useMemo(() => ({ state, ready, dispatch }), [state, ready]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

// Convenience helpers.
export function useResetApp(): () => void {
  const { dispatch } = useStore();
  return useCallback(() => dispatch({ type: 'reset' }), [dispatch]);
}
