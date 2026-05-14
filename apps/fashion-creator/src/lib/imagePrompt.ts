import type { GarmentParams } from './types';

// Builds a natural-language prompt for a text-to-image model from the
// structured Fashionpedia params. Designed for Flux-family models: short,
// concrete, hierarchical (subject → garment → fabric → details → style).
export function buildImagePrompt(p: GarmentParams): string {
  const parts: string[] = [];

  parts.push('editorial fashion photograph');
  parts.push('full-body shot of a model standing, neutral pose, looking at camera');

  const color = describeColor(p.color);
  const silhouette = describeSilhouette(p);
  parts.push(`wearing a ${color} ${silhouette}`);

  const fabric = describeFabric(p);
  if (fabric) parts.push(fabric);

  if (p.neckline) {
    parts.push(`${formatNeckline(p.neckline)} neckline`);
  }

  if (p.sleeve && p.sleeve !== 'sleeveless') {
    parts.push(`${p.sleeve} sleeves`);
  } else if (p.sleeve === 'sleeveless') {
    parts.push('sleeveless');
  }

  if (p.layerCount > 1) {
    parts.push(`${p.layerCount} tiered layers with visible fabric drape`);
  }

  const freeNotes = p.notes
    .filter((n) => !n.startsWith('hem-correction:'))
    .map((n) => n.trim())
    .filter(Boolean);
  if (freeNotes.length) parts.push(freeNotes.join(', '));

  parts.push(
    'soft cream studio backdrop, diffused natural lighting, hyper-detailed fabric texture, high fashion magazine aesthetic, shot on medium format, 35mm, color graded, photorealistic',
  );

  return parts.join(', ');
}

function describeSilhouette(p: GarmentParams): string {
  const cat = p.category;
  switch (p.silhouette) {
    case 'fitted':
      return `body-skimming fitted ${cat}`;
    case 'a-line':
      return `A-line ${cat} that flares gently from the waist`;
    case 'oversized':
      return `oversized relaxed ${cat}`;
    case 'column':
      return `slim column ${cat} with a clean vertical line`;
    case 'tiered':
      return `tiered ${cat} with sweeping layered hem`;
    default:
      return cat;
  }
}

function describeFabric(p: GarmentParams): string {
  const weight: Record<GarmentParams['fabricWeight'], string> = {
    light: 'lightweight',
    medium: 'mid-weight',
    heavy: 'substantial heavy-weight',
  };
  const behavior: Record<GarmentParams['fabricBehavior'], string> = {
    flowing: 'flowing fluid silk-like',
    structured: 'structured crisp tailored',
    drapey: 'softly draping liquid-fall',
    crisp: 'crisp poplin-like',
  };
  return `in ${weight[p.fabricWeight]} ${behavior[p.fabricBehavior]} fabric`;
}

function formatNeckline(n: NonNullable<GarmentParams['neckline']>): string {
  switch (n) {
    case 'v-neck':
      return 'plunging V';
    case 'off-shoulder':
      return 'off-the-shoulder';
    case 'one-shoulder':
      return 'asymmetric one-shoulder';
    case 'scoop':
      return 'wide scoop';
    case 'square':
      return 'square';
    case 'halter':
      return 'halter';
    case 'crew':
      return 'high crew';
    default:
      return n;
  }
}

// Map a hex color to a short human descriptor — Flux follows color names
// far better than raw hex. Falls back to the hex for unusual colors.
export function describeColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb;
  const [h, s, l] = rgbToHsl(r, g, b);

  if (s < 0.1) {
    if (l > 0.92) return 'ivory';
    if (l > 0.75) return 'soft cream';
    if (l > 0.55) return 'warm grey';
    if (l > 0.3) return 'charcoal';
    return 'soft black';
  }

  const lightness =
    l > 0.82 ? 'pale ' : l > 0.62 ? 'soft ' : l < 0.25 ? 'deep ' : l < 0.4 ? 'rich ' : '';

  let hue: string;
  if (h < 12 || h >= 345) hue = 'rose-red';
  else if (h < 28) hue = 'terracotta';
  else if (h < 45) hue = 'amber';
  else if (h < 65) hue = 'mustard';
  else if (h < 95) hue = 'olive';
  else if (h < 155) hue = 'sage green';
  else if (h < 195) hue = 'teal';
  else if (h < 235) hue = 'cobalt blue';
  else if (h < 270) hue = 'violet';
  else if (h < 310) hue = 'plum';
  else hue = 'pink';

  if (hue === 'rose-red' && l > 0.6 && s < 0.55) hue = 'blush pink';
  if (hue === 'pink' && l > 0.75 && s < 0.4) hue = 'powder pink';

  return `${lightness}${hue}`.trim();
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
        break;
      case gn:
        h = ((bn - rn) / d + 2) * 60;
        break;
      default:
        h = ((rn - gn) / d + 4) * 60;
    }
  }
  return [h, s, l];
}
