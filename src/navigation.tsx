import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type Route =
  | { name: 'splash' }
  | { name: 'parentSetup' }
  | { name: 'personaPick' }
  | { name: 'home' }
  | { name: 'conversation'; mood: string }
  | { name: 'storybook'; storybookId: string; justCreated?: boolean }
  | { name: 'share'; storybookId: string }
  | { name: 'library' }
  | { name: 'parentDashboard' };

interface NavContextValue {
  route: Route;
  navigate: (r: Route) => void;
  back: () => void;
  canGoBack: boolean;
}

const NavContext = createContext<NavContextValue | null>(null);

export function NavProvider({ initial = { name: 'splash' as const }, children }: { initial?: Route; children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>([initial]);

  const navigate = useCallback((r: Route) => {
    setStack((s) => [...s, r]);
  }, []);

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  }, []);

  const value = useMemo<NavContextValue>(
    () => ({
      route: stack[stack.length - 1],
      navigate,
      back,
      canGoBack: stack.length > 1,
    }),
    [stack, navigate, back],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside NavProvider');
  return ctx;
}
