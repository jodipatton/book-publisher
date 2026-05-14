'use client';

import { useMemo } from 'react';
import type {
  BodyDimensions,
  DesignVariant,
  RenderMode,
} from '@/lib/types';

// Renders a body silhouette derived from real measurements with a
// garment overlay built from the structured Fashionpedia params. The
// sketch mode uses stroke-only paths; the photorealistic mode adds
// gradient fills and soft shading. Production swaps this whole component
// for the diffusion model output — the contract is "given a variant and
// a body, draw something visibly distinct".

interface Props {
  variant: DesignVariant;
  body: BodyDimensions;
  renderMode: RenderMode;
  width?: number;
  height?: number;
  highlight?: boolean;
  onTouchGarment?: (region: GarmentRegion, gesture: TouchGesture) => void;
}

export type GarmentRegion = 'neckline' | 'sleeves' | 'waist' | 'hem' | 'body';
export type TouchGesture = 'pinch-in' | 'pinch-out' | 'drag-up' | 'drag-down';

export function DesignSvg(props: Props) {
  const { variant, body, renderMode, width = 240, height = 420, highlight, onTouchGarment } = props;
  const layout = useMemo(() => computeLayout(body, height, width), [body, height, width]);
  const palette = useMemo(() => derivePalette(variant.params.color, renderMode), [variant.params.color, renderMode]);
  const garment = useMemo(() => computeGarment(variant, layout), [variant, layout]);

  // Detect hem corrections recorded in params.notes — they shift the hem
  // up or down without a dedicated structured field on this scaffold's
  // reduced ontology.
  const hemDelta = useMemo(() => hemDeltaFromNotes(variant.params.notes), [variant.params.notes]);

  const isSketch = renderMode === 'sketch';
  const bodyStroke = isSketch ? '#bfb6a8' : '#7d6e5c';
  const bodyFill = isSketch ? '#f4ecdb' : '#e9d4c1';
  const garmentStroke = isSketch ? '#1a1a1a' : '#3a2e2a';
  // Opaque fill in sketch mode too — otherwise the body underneath shows
  // through the garment outline.
  const garmentFill = isSketch ? '#fbfaf6' : palette.fill;
  const garmentShadow = isSketch ? 'rgba(0,0,0,0.04)' : palette.shadow;
  const strokeWidth = isSketch ? 1.4 : 0.8;
  const tierFill = isSketch ? '#fbfaf6' : palette.tier;

  // Build the hem at the variant-specific drop length, then push it
  // up or down by the cumulative hem-correction delta.
  const hemY = layout.hipY + garment.skirtDrop - hemDelta;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Design variant ${variant.id} on body model`}
      style={{
        borderRadius: 18,
        background: isSketch
          ? '#fbfaf6'
          : 'linear-gradient(180deg, #fdf6ee 0%, #f6ead8 100%)',
        boxShadow: highlight
          ? '0 0 0 3px #c97b8c, 0 6px 22px rgba(60,40,30,0.18)'
          : '0 6px 22px rgba(60,40,30,0.12)',
        transition: 'box-shadow 180ms ease',
      }}
    >
      {/* Body silhouette */}
      <g aria-label="body-silhouette">
        <ellipse
          cx={layout.cx}
          cy={layout.headY}
          rx={layout.headR}
          ry={layout.headR * 1.15}
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={strokeWidth}
        />
        {/* Neck */}
        <rect
          x={layout.cx - layout.neckW / 2}
          y={layout.headY + layout.headR}
          width={layout.neckW}
          height={layout.neckH}
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={strokeWidth}
        />
        {/* Torso */}
        <path
          d={torsoPath(layout)}
          fill={bodyFill}
          stroke={bodyStroke}
          strokeWidth={strokeWidth}
        />
        {/* Arms */}
        <path d={armPath(layout, 'L')} fill={bodyFill} stroke={bodyStroke} strokeWidth={strokeWidth} />
        <path d={armPath(layout, 'R')} fill={bodyFill} stroke={bodyStroke} strokeWidth={strokeWidth} />
        {/* Legs */}
        <path d={legPath(layout, 'L')} fill={bodyFill} stroke={bodyStroke} strokeWidth={strokeWidth} />
        <path d={legPath(layout, 'R')} fill={bodyFill} stroke={bodyStroke} strokeWidth={strokeWidth} />
      </g>

      {/* Garment overlay */}
      <g
        aria-label="garment"
        onClick={onTouchGarment ? () => onTouchGarment('body', 'drag-up') : undefined}
        style={{ cursor: onTouchGarment ? 'pointer' : 'default' }}
      >
        {/* Photorealistic shadow under garment */}
        {!isSketch && (
          <path
            d={garmentBodyPath(layout, garment, hemY, 0.4)}
            fill={garmentShadow}
            opacity={0.55}
          />
        )}
        <path
          d={garmentBodyPath(layout, garment, hemY, 0)}
          fill={garmentFill}
          stroke={garmentStroke}
          strokeWidth={strokeWidth + 0.4}
        />
        {/* Sleeves */}
        {garment.sleeveLength > 0 && (
          <>
            <path
              d={sleevePath(layout, garment, 'L')}
              fill={garmentFill}
              stroke={garmentStroke}
              strokeWidth={strokeWidth}
              onClick={onTouchGarment ? (e) => { e.stopPropagation(); onTouchGarment('sleeves', 'pinch-in'); } : undefined}
            />
            <path
              d={sleevePath(layout, garment, 'R')}
              fill={garmentFill}
              stroke={garmentStroke}
              strokeWidth={strokeWidth}
              onClick={onTouchGarment ? (e) => { e.stopPropagation(); onTouchGarment('sleeves', 'pinch-in'); } : undefined}
            />
          </>
        )}
        {/* Tiered layers */}
        {variant.params.layerCount > 1 &&
          Array.from({ length: variant.params.layerCount - 1 }).map((_, i) => (
            <path
              key={`tier-${i}`}
              d={tierPath(layout, garment, hemY, i + 1, variant.params.layerCount)}
              fill={tierFill}
              stroke={garmentStroke}
              strokeWidth={strokeWidth}
              opacity={isSketch ? 1 : 0.85}
            />
          ))}
        {/* Neckline accent */}
        <path
          d={necklinePath(layout, garment)}
          fill="transparent"
          stroke={garmentStroke}
          strokeWidth={strokeWidth + 0.2}
          onClick={onTouchGarment ? (e) => { e.stopPropagation(); onTouchGarment('neckline', 'drag-down'); } : undefined}
        />
        {/* Hem grab handle in sketch mode for clarity */}
        {isSketch && (
          <line
            x1={layout.cx - garment.hemW / 2}
            x2={layout.cx + garment.hemW / 2}
            y1={hemY}
            y2={hemY}
            stroke={garmentStroke}
            strokeWidth={strokeWidth + 0.6}
            onClick={onTouchGarment ? (e) => { e.stopPropagation(); onTouchGarment('hem', 'drag-up'); } : undefined}
          />
        )}
      </g>
    </svg>
  );
}

interface Layout {
  cx: number;
  headY: number;
  headR: number;
  neckW: number;
  neckH: number;
  shoulderY: number;
  shoulderW: number;
  waistY: number;
  waistW: number;
  hipY: number;
  hipW: number;
  inseamY: number;
  legW: number;
  armY: number;
  armLength: number;
}

function computeLayout(body: BodyDimensions, height: number, width: number): Layout {
  const pad = 20;
  const drawH = height - pad * 2;
  // Scale from real inches to canvas pixels using the user's height.
  const inchToPx = drawH / body.heightInches;
  const cx = width / 2;
  const headR = Math.max(14, body.heightInches * inchToPx * 0.065);
  const headY = pad + headR;
  const neckW = headR * 0.65;
  const neckH = headR * 0.7;
  const shoulderY = headY + headR + neckH;
  const shoulderW = body.shoulderWidth * inchToPx;
  const waistY = shoulderY + body.torsoLength * inchToPx * 0.7;
  // Waist width derived from waist-to-hip ratio.
  const hipW = body.hipWidth * inchToPx * 2;
  const waistW = hipW * body.waistToHipRatio;
  const hipY = shoulderY + body.torsoLength * inchToPx;
  const inseamY = hipY + body.inseam * inchToPx;
  const legW = hipW * 0.4;
  const armY = shoulderY;
  const armLength = body.armLength * inchToPx;
  return {
    cx,
    headY,
    headR,
    neckW,
    neckH,
    shoulderY,
    shoulderW,
    waistY,
    waistW,
    hipY,
    hipW,
    inseamY,
    legW,
    armY,
    armLength,
  };
}

interface GarmentLayout {
  shoulderW: number;
  waistW: number;
  hipW: number;
  hemW: number;
  skirtDrop: number;
  sleeveLength: number;
  necklineDepth: number;
}

function computeGarment(variant: DesignVariant, layout: Layout): GarmentLayout {
  const p = variant.params;
  // Silhouette controls hem flare and waist cinch.
  let hemMultiplier = 1.0;
  let waistMultiplier = 1.0;
  switch (p.silhouette) {
    case 'fitted':
      hemMultiplier = 1.05;
      waistMultiplier = 0.9;
      break;
    case 'a-line':
      hemMultiplier = 1.65;
      waistMultiplier = 0.95;
      break;
    case 'oversized':
      hemMultiplier = 1.3;
      waistMultiplier = 1.2;
      break;
    case 'column':
      hemMultiplier = 1.0;
      waistMultiplier = 1.0;
      break;
    case 'tiered':
      hemMultiplier = 1.8;
      waistMultiplier = 1.0;
      break;
  }
  // Category controls skirt drop. Tops stop at waist; pants split into
  // legs (handled by body underneath).
  // Default: full-length dress reaches the floor (just past the inseam)
  // so the body's legs are covered. Tiered/a-line dresses get extra drop
  // for a sweep silhouette.
  const legLen = layout.inseamY - layout.hipY;
  let skirtDrop = legLen + 8;
  if (p.silhouette === 'tiered' || p.silhouette === 'a-line') skirtDrop = legLen + 14;
  if (p.category === 'top') skirtDrop = 30;
  if (p.category === 'coat') skirtDrop = legLen * 0.65;
  if (p.category === 'skirt') skirtDrop = legLen * 0.6;
  if (p.category === 'pants' || p.category === 'jumpsuit') skirtDrop = legLen - 6;

  let sleeveLength = 0;
  switch (p.sleeve) {
    case 'sleeveless': sleeveLength = 0; break;
    case 'cap': sleeveLength = layout.armLength * 0.15; break;
    case 'short': sleeveLength = layout.armLength * 0.35; break;
    case 'puff': sleeveLength = layout.armLength * 0.4; break;
    case 'bell': sleeveLength = layout.armLength * 0.85; break;
    case 'long': sleeveLength = layout.armLength * 0.95; break;
    default:
      sleeveLength = p.category === 'coat' ? layout.armLength * 0.95 : layout.armLength * 0.25;
  }

  let necklineDepth = 6;
  switch (p.neckline) {
    case 'v-neck': necklineDepth = 22; break;
    case 'scoop': necklineDepth = 16; break;
    case 'off-shoulder': necklineDepth = 14; break;
    case 'one-shoulder': necklineDepth = 24; break;
    case 'square': necklineDepth = 14; break;
    case 'halter': necklineDepth = 18; break;
    case 'crew': necklineDepth = 6; break;
  }

  return {
    shoulderW: layout.shoulderW * (p.category === 'coat' ? 1.15 : 1.02),
    waistW: layout.waistW * waistMultiplier,
    hipW: layout.hipW * 1.05,
    hemW: layout.hipW * hemMultiplier,
    skirtDrop,
    sleeveLength,
    necklineDepth,
  };
}

function torsoPath(layout: Layout): string {
  const { cx, shoulderY, shoulderW, waistY, waistW, hipY, hipW } = layout;
  return [
    `M ${cx - shoulderW / 2} ${shoulderY}`,
    `Q ${cx - waistW / 2 - 6} ${(shoulderY + waistY) / 2} ${cx - waistW / 2} ${waistY}`,
    `Q ${cx - hipW / 2 - 4} ${(waistY + hipY) / 2} ${cx - hipW / 2} ${hipY}`,
    `L ${cx + hipW / 2} ${hipY}`,
    `Q ${cx + waistW / 2 + 4} ${(waistY + hipY) / 2} ${cx + waistW / 2} ${waistY}`,
    `Q ${cx + shoulderW / 2 + 6} ${(shoulderY + waistY) / 2} ${cx + shoulderW / 2} ${shoulderY}`,
    'Z',
  ].join(' ');
}

function armPath(layout: Layout, side: 'L' | 'R'): string {
  const sign = side === 'L' ? -1 : 1;
  const { cx, shoulderW, armY, armLength } = layout;
  const top = cx + (sign * shoulderW) / 2;
  const bottom = cx + sign * (shoulderW / 2 + 8);
  return [
    `M ${top - sign * 2} ${armY}`,
    `Q ${top + sign * 6} ${armY + armLength * 0.6} ${bottom} ${armY + armLength}`,
    `L ${bottom + sign * 6} ${armY + armLength}`,
    `Q ${top + sign * 12} ${armY + armLength * 0.55} ${top + sign * 6} ${armY}`,
    'Z',
  ].join(' ');
}

function legPath(layout: Layout, side: 'L' | 'R'): string {
  const sign = side === 'L' ? -1 : 1;
  const { cx, hipY, hipW, inseamY, legW } = layout;
  const top = cx + (sign * hipW) / 4;
  return [
    `M ${top - legW / 2} ${hipY}`,
    `L ${top + legW / 2} ${hipY}`,
    `L ${top + legW / 2 - 2} ${inseamY}`,
    `L ${top - legW / 2 + 2} ${inseamY}`,
    'Z',
  ].join(' ');
}

function garmentBodyPath(layout: Layout, g: GarmentLayout, hemY: number, dropShadow: number): string {
  const { cx, shoulderY, waistY, hipY } = layout;
  const sy = shoulderY + g.necklineDepth * 0.2;
  return [
    `M ${cx - g.shoulderW / 2} ${sy + dropShadow}`,
    `Q ${cx} ${sy - g.necklineDepth + 6} ${cx + g.shoulderW / 2} ${sy + dropShadow}`,
    `Q ${cx + g.waistW / 2 + 4} ${waistY} ${cx + g.waistW / 2} ${waistY}`,
    `Q ${cx + g.hipW / 2 + 2} ${hipY} ${cx + g.hemW / 2} ${hemY}`,
    `L ${cx - g.hemW / 2} ${hemY}`,
    `Q ${cx - g.hipW / 2 - 2} ${hipY} ${cx - g.waistW / 2} ${waistY}`,
    `Q ${cx - g.waistW / 2 - 4} ${waistY} ${cx - g.shoulderW / 2} ${sy + dropShadow}`,
    'Z',
  ].join(' ');
}

function sleevePath(layout: Layout, g: GarmentLayout, side: 'L' | 'R'): string {
  const sign = side === 'L' ? -1 : 1;
  const { cx, shoulderY, armY } = layout;
  const top = cx + (sign * g.shoulderW) / 2;
  const length = g.sleeveLength;
  const flare = length > 60 ? 14 : 6;
  return [
    `M ${top} ${shoulderY}`,
    `Q ${top + sign * flare} ${armY + length * 0.5} ${top + sign * flare} ${armY + length}`,
    `L ${top + sign * (flare - 8)} ${armY + length}`,
    `Q ${top + sign * 2} ${armY + length * 0.4} ${top - sign * 4} ${shoulderY}`,
    'Z',
  ].join(' ');
}

function necklinePath(layout: Layout, g: GarmentLayout): string {
  const { cx, shoulderY } = layout;
  return [
    `M ${cx - g.shoulderW / 2 + 2} ${shoulderY}`,
    `Q ${cx} ${shoulderY + g.necklineDepth} ${cx + g.shoulderW / 2 - 2} ${shoulderY}`,
  ].join(' ');
}

function tierPath(layout: Layout, g: GarmentLayout, hemY: number, idx: number, total: number): string {
  const { cx, hipY } = layout;
  const t = idx / total;
  const y = hipY + (hemY - hipY) * t;
  const w = g.hipW + (g.hemW - g.hipW) * t;
  const sweep = 12;
  return [
    `M ${cx - w / 2} ${y}`,
    `L ${cx + w / 2} ${y}`,
    `Q ${cx + w / 2 + 4} ${y + sweep} ${cx + w / 2 + 6} ${y + sweep + 2}`,
    `L ${cx - w / 2 - 6} ${y + sweep + 2}`,
    `Q ${cx - w / 2 - 4} ${y + sweep} ${cx - w / 2} ${y}`,
    'Z',
  ].join(' ');
}

interface Palette {
  fill: string;
  shadow: string;
  tier: string;
}

function derivePalette(baseHex: string, mode: RenderMode): Palette {
  if (mode === 'sketch') {
    return { fill: 'transparent', shadow: 'transparent', tier: 'transparent' };
  }
  return {
    fill: baseHex,
    shadow: darken(baseHex, 0.22),
    tier: lighten(baseHex, 0.12),
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function hemDeltaFromNotes(notes: string[]): number {
  let delta = 0;
  for (const n of notes) {
    if (!n.startsWith('hem-correction:')) continue;
    if (/shorter|raise|up\b|up two|up 2/.test(n)) delta += 22;
    if (/longer|lower|down\b/.test(n)) delta -= 22;
  }
  return delta;
}
