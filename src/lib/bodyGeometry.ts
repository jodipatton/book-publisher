// Body geometry extraction from a single full-body photo.
//
// Production integrates with one of the body-measurement vendors named in
// the PRD (Outfii / PixRibe / VEXA — final selection pending). Each
// vendor returns the same set of measurements; we normalize to inches.
//
// This scaffold returns a deterministic stub keyed off the file's byte
// length so the demo flow has a consistent body model to render against.
// The petite-proportion flag is set whenever the inferred height is
// under 5'4" — that's the threshold the PRD uses to disable
// standard-sizing assumptions.

import type { BodyDimensions } from './types';

export interface BodyExtractionResult {
  dimensions: BodyDimensions;
  // Confidence 0..1 reported by the underlying vendor.
  confidence: number;
  // Latency in ms; we report it back so the UI can show it against the
  // 5-second NFR target.
  latencyMs: number;
}

const DEFAULT_PETITE_HEIGHT = 61.5; // 5'1.5"

// Stub that produces a stable body model from a file's size. This lets
// the UI flow render against a real-looking mannequin without depending
// on a vendor API key being present.
export async function extractBodyDimensions(
  file: Blob | null,
  hint?: Partial<BodyDimensions>,
): Promise<BodyExtractionResult> {
  const start = Date.now();
  const size = file?.size ?? 0;
  // Map the file size to a height range 60–72 inches. Petite users
  // (<64") get the petite flag flipped on. Manual override (hint)
  // takes precedence so FR-4 "user-knows-their-measurements" works.
  const baseHeight = 60 + (size % 1200) / 100;
  const heightInches = hint?.heightInches ?? round1(baseHeight);

  // Anthropometric ratios anchored to mean adult proportions. These
  // aren't a substitute for a real vendor extraction but keep the body
  // model plausible at any height.
  const shoulderWidth = hint?.shoulderWidth ?? round1(heightInches * 0.245);
  const torsoLength = hint?.torsoLength ?? round1(heightInches * 0.28);
  const armLength = hint?.armLength ?? round1(heightInches * 0.44);
  const hipWidth = hint?.hipWidth ?? round1(heightInches * 0.19);
  const inseam = hint?.inseam ?? round1(heightInches * 0.45);
  const waistToHipRatio = hint?.waistToHipRatio ?? 0.74;
  const isPetite = heightInches < 64;

  return {
    dimensions: {
      heightInches,
      shoulderWidth,
      torsoLength,
      armLength,
      hipWidth,
      inseam,
      waistToHipRatio,
      isPetite,
    },
    confidence: file ? 0.88 : 0.5,
    latencyMs: Date.now() - start,
  };
}

// Default body for first-load UX before any photo has been uploaded.
export function defaultPetiteBody(): BodyDimensions {
  return {
    heightInches: DEFAULT_PETITE_HEIGHT,
    shoulderWidth: 15.1,
    torsoLength: 17.2,
    armLength: 27.1,
    hipWidth: 11.7,
    inseam: 27.7,
    waistToHipRatio: 0.72,
    isPetite: true,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
