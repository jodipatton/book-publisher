'use client';

import { useRef } from 'react';
import type { BodyDimensions } from '@/lib/types';
import { extractBodyDimensions } from '@/lib/bodyGeometry';

interface Props {
  body: BodyDimensions;
  onCaptured: (body: BodyDimensions, photoDataUrl: string | null) => void;
}

export function BodyCapture({ body, onCaptured }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    const result = await extractBodyDimensions(file);
    const reader = new FileReader();
    reader.onload = () => {
      const url = typeof reader.result === 'string' ? reader.result : null;
      onCaptured(result.dimensions, url);
    };
    reader.onerror = () => onCaptured(result.dimensions, null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>1 · Body geometry</h2>
        <span className={`tag ${body.isPetite ? 'tag-accent' : ''}`}>
          {body.isPetite ? 'petite proportions' : 'standard proportions'}
        </span>
      </div>
      <p className="muted small">
        Upload a single full-body photo. We extract shoulder width, torso
        length, arm length, hip width, inseam, and waist-to-hip ratio.
      </p>
      <div className="row">
        <button
          className="btn"
          type="button"
          onClick={() => fileRef.current?.click()}
        >
          Upload full-body photo
        </button>
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
      </div>
      <dl className="dim-grid">
        <Dim label="Height" value={`${body.heightInches}"`} />
        <Dim label="Shoulder" value={`${body.shoulderWidth}"`} />
        <Dim label="Torso" value={`${body.torsoLength}"`} />
        <Dim label="Arm" value={`${body.armLength}"`} />
        <Dim label="Hip" value={`${body.hipWidth}"`} />
        <Dim label="Inseam" value={`${body.inseam}"`} />
        <Dim label="Waist : hip" value={body.waistToHipRatio.toFixed(2)} />
      </dl>
    </div>
  );
}

function Dim({ label, value }: { label: string; value: string }) {
  return (
    <div className="dim">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
