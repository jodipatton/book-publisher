'use client';

import { useEffect, useRef, useState } from 'react';
import { DesignSvg, type GarmentRegion, type TouchGesture } from './DesignSvg';
import type { BodyDimensions, DesignVariant, RenderMode } from '@/lib/types';

interface Props {
  variant: DesignVariant;
  body: BodyDimensions;
  renderMode: RenderMode;
  width?: number;
  height?: number;
  highlight?: boolean;
  onTouchGarment?: (region: GarmentRegion, gesture: TouchGesture) => void;
}

type RenderState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; url: string }
  | { kind: 'error'; message: string };

// Composes the instant SVG croquis with an async AI-rendered fashion photo.
// The SVG appears immediately as a placeholder; once Flux returns we fade
// the photo in over it. Cancels in-flight requests when the variant
// changes (e.g. the user regenerates).
export function DesignImage(props: Props) {
  const { variant, body, renderMode, width = 240, height = 420, highlight, onTouchGarment } = props;
  const [render, setRender] = useState<RenderState>({ kind: 'idle' });
  const aborter = useRef<AbortController | null>(null);
  const cacheKey = useRef<string>('');

  useEffect(() => {
    // Key on params + seed so identical re-renders don't refetch but
    // refinements do.
    const key = JSON.stringify({ p: variant.params, s: variant.seed });
    if (key === cacheKey.current) return;
    cacheKey.current = key;

    aborter.current?.abort();
    const ctrl = new AbortController();
    aborter.current = ctrl;

    setRender({ kind: 'loading' });

    fetch('/api/render', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ params: variant.params, seed: variant.seed }),
      signal: ctrl.signal,
    })
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          throw new Error(t || `status ${r.status}`);
        }
        return r.json() as Promise<{ url: string }>;
      })
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setRender({ kind: 'ready', url: data.url });
      })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'render failed';
        setRender({ kind: 'error', message });
      });

    return () => ctrl.abort();
  }, [variant.params, variant.seed]);

  return (
    <div
      style={{
        position: 'relative',
        width,
        height,
        borderRadius: 18,
        overflow: 'hidden',
        boxShadow: highlight
          ? '0 0 0 3px #c97b8c, 0 6px 22px rgba(60,40,30,0.18)'
          : '0 6px 22px rgba(60,40,30,0.12)',
        transition: 'box-shadow 180ms ease',
      }}
    >
      {/* Placeholder SVG — always present underneath */}
      <DesignSvg
        variant={variant}
        body={body}
        renderMode={renderMode}
        width={width}
        height={height}
        onTouchGarment={onTouchGarment}
      />

      {/* AI render fades in on top when ready */}
      {render.kind === 'ready' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={render.url}
          alt={`Rendered design ${variant.id}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            animation: 'design-image-fade 420ms ease-out forwards',
          }}
          onClick={onTouchGarment ? () => onTouchGarment('body', 'drag-up') : undefined}
        />
      )}

      {/* Loading shimmer */}
      {render.kind === 'loading' && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
            backgroundSize: '200% 100%',
            animation: 'design-image-shimmer 1400ms linear infinite',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Error chip — non-blocking, SVG remains visible */}
      {render.kind === 'error' && (
        <div
          role="status"
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            right: 10,
            padding: '6px 10px',
            background: 'rgba(60,30,30,0.78)',
            color: '#fff',
            fontSize: 11,
            borderRadius: 8,
            lineHeight: 1.3,
          }}
        >
          AI render unavailable — showing sketch.
        </div>
      )}

      <style>{`
        @keyframes design-image-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes design-image-shimmer {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
