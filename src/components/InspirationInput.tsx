'use client';

import { useRef, useState } from 'react';
import type { InspirationStyle } from '@/lib/types';
import { extractStyleEssence, styleFromPalette } from '@/lib/inspirationStyle';

interface Props {
  style: InspirationStyle | null;
  blend: number;
  onStyleChange: (style: InspirationStyle | null, previewUrl: string | null) => void;
  onBlendChange: (blend: number) => void;
}

export function InspirationInput({ style, blend, onStyleChange, onBlendChange }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      setPreview(url);
      onStyleChange(null, url);
      // Kick off the extraction in parallel — if it fails (e.g., no
      // OffscreenCanvas in test env) we fall back to a palette guess.
      extractStyleEssence(file)
        .then((extracted) => onStyleChange(extracted, url))
        .catch(() => onStyleChange(styleFromPalette(['#cccccc']), url));
    };
    reader.readAsDataURL(file);
  }

  function clear() {
    setPreview(null);
    onStyleChange(null, null);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>2 · Inspiration (optional)</h2>
        {style && <span className="tag tag-accent">mood: {style.mood}</span>}
      </div>
      <p className="muted small">
        Photograph fabric, a flower, a building — anything. We extract
        texture, color, and mood via IP-Adapter and blend it into the
        generated design.
      </p>
      <div className="inspiration-row">
        <div className="inspiration-preview" aria-label="inspiration preview">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" />
          ) : (
            <span className="muted">no reference</span>
          )}
        </div>
        <div className="inspiration-controls">
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
            Upload reference
          </button>
          {preview && (
            <button type="button" className="btn btn-ghost" onClick={clear}>
              Clear
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <label className="blend-label">
            Blend dial — voice ←→ reference ({blend.toFixed(2)})
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={blend}
              onChange={(e) => onBlendChange(Number(e.target.value))}
            />
          </label>
          {style && (
            <div className="palette-strip">
              {style.dominantColors.slice(0, 5).map((c, i) => (
                <span key={`${c}-${i}`} className="swatch" style={{ background: c }} aria-label={c} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
