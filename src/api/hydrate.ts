// Boot-time hydration from the API.
//
// When `EXPO_PUBLIC_API_URL` is set AND the device has a stored parent_id
// (from a previous ParentSetup save), pull every collection from the API
// and replace local state with the server-truth view.
//
// Local-only mode is preserved: if the API flag is unset, this hook is a
// no-op and the app reads/writes AsyncStorage as before.

import { useEffect, useState } from 'react';

import { api, getParentId, isApiEnabled } from './client';
import {
  childFromDTO,
  parentFromDTO,
  safetyAlertFromEventDTO,
  storybookFromDTO,
  trustedMemberFromDTO,
} from './mappers';
import { useStore } from '../state';

export function useApiHydrate(): { hydrating: boolean; hydrated: boolean; error: string | null } {
  const { dispatch, state, ready } = useStore();
  const [status, setStatus] = useState<{
    hydrating: boolean;
    hydrated: boolean;
    error: string | null;
  }>({ hydrating: false, hydrated: false, error: null });

  useEffect(() => {
    if (!ready) return;
    if (!isApiEnabled()) return;
    if (status.hydrating || status.hydrated) return;

    let mounted = true;

    (async () => {
      const pid = await getParentId();
      if (!pid) {
        // No saved parent yet — nothing to hydrate. ParentSetup will create
        // a parent on first save and that flow already updates local state.
        if (mounted) setStatus({ hydrating: false, hydrated: true, error: null });
        return;
      }

      if (mounted) setStatus({ hydrating: true, hydrated: false, error: null });
      try {
        const [parent, children, circle, books, events] = await Promise.all([
          api.me(),
          api.listChildren(),
          api.listTrustedCircle(),
          api.listStorybooks(),
          api.listSafetyEvents(),
        ]);

        if (!mounted) return;

        dispatch({ type: 'setParent', parent: parentFromDTO(parent) });
        // PRD allows multiple children per parent (Family tier); the
        // scaffold UI shows one. Pick the first one for the active child
        // slot. Multi-child UX is a follow-up.
        const child = children.length > 0 ? childFromDTO(children[0]) : null;
        dispatch({ type: 'setChild', child });
        dispatch({ type: 'setTrustedCircle', members: circle.map(trustedMemberFromDTO) });
        dispatch({ type: 'setStorybooks', storybooks: books.map(storybookFromDTO) });
        dispatch({ type: 'setSafetyAlerts', alerts: events.map(safetyAlertFromEventDTO) });

        setStatus({ hydrating: false, hydrated: true, error: null });
      } catch (e) {
        if (!mounted) return;
        setStatus({
          hydrating: false,
          hydrated: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    })();

    return () => {
      mounted = false;
    };
    // We intentionally only re-run when `ready` flips. Hydration is a
    // one-shot at boot. Subsequent updates flow through the per-screen
    // API calls below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Touch state so React's Strict-Mode equality checks don't skip re-render.
  void state;
  return status;
}
