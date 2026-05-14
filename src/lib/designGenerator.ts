// Design generation.
//
// Production sends the structured GarmentParams + the body model + (when
// present) the IP-Adapter style embedding through a Stable Diffusion or
// Flux pipeline, with ControlNet conditioning on the body silhouette so
// the garment respects the user's actual proportions. The output is two
// candidate renders so the user can pick or merge per FR-14 and FR-18.
//
// This scaffold doesn't ship a diffusion model. Instead it emits two
// DesignVariants with adjusted parameters and lets the renderer (an SVG
// component) draw the variants on the body silhouette. That's enough to
// demonstrate the full voice-refine-regenerate loop end to end and to
// satisfy the Done Criteria for "visibly different regenerated image".

import type {
  BodyDimensions,
  DesignSet,
  DesignVariant,
  FabricBehavior,
  GarmentParams,
  InspirationStyle,
  RefinementInstruction,
  RenderMode,
  Silhouette,
} from './types';
import { parseDescriptionToFashionpedia } from './fashionpedia';

export interface GenerateOptions {
  body: BodyDimensions;
  description: string;
  inspiration?: InspirationStyle | null;
  // 0..1 — how much weight to give the inspiration image vs the voice
  // description in the conflict-resolution two-version branch.
  blendDial?: number;
  renderMode?: RenderMode;
  baseParams?: GarmentParams;
  seed?: number;
}

// Detect whether the voice description and the inspiration image are
// pulling in different directions. Mood vs. fabric-behavior is the
// usual mismatch — "heavy structured tweed" pointed at by an image but
// the words "make it flowy" said out loud. When this fires we generate
// two distinctly different variants (one per direction) per FR-18.
export function detectConflict(
  params: GarmentParams,
  inspiration: InspirationStyle | null | undefined,
): boolean {
  if (!inspiration) return false;
  if (inspiration.mood === 'soft' && params.fabricBehavior === 'structured') return true;
  if (inspiration.mood === 'industrial' && params.fabricBehavior === 'flowing') return true;
  if (inspiration.mood === 'bold' && params.fabricBehavior === 'drapey') return true;
  return false;
}

// Produce two design variants from the structured parameters. Variant A
// is the closer-to-voice interpretation; variant B is the closer-to-
// reference or just-different interpretation, depending on whether
// inspiration is present. Both share the same body model.
export function generateDesignSet(opts: GenerateOptions): DesignSet {
  const params =
    opts.baseParams ??
    parseDescriptionToFashionpedia(opts.description);
  const seed = opts.seed ?? hashStringToInt(opts.description) | 0;
  const blend = clamp(opts.blendDial ?? 0.5, 0, 1);
  const inspiration = opts.inspiration ?? null;
  const conflict = detectConflict(params, inspiration);

  const variantA: DesignVariant = {
    id: `va-${seed}`,
    params: applyInspiration(params, inspiration, conflict ? 0 : Math.max(0, blend - 0.2)),
    inspirationWeight: conflict ? 0 : Math.max(0, blend - 0.2),
    seed,
  };
  const variantB: DesignVariant = {
    id: `vb-${seed}`,
    params: divergeVariant(
      applyInspiration(params, inspiration, conflict ? 1 : Math.min(1, blend + 0.2)),
      seed,
    ),
    inspirationWeight: conflict ? 1 : Math.min(1, blend + 0.2),
    seed: seed + 1,
  };

  return {
    variants: [variantA, variantB],
    bodyDimensions: opts.body,
    renderMode: opts.renderMode ?? 'photorealistic',
  };
}

// Blend inspiration into the params. Higher weight = palette and texture
// pulled further toward the reference image.
function applyInspiration(
  params: GarmentParams,
  inspiration: InspirationStyle | null,
  weight: number,
): GarmentParams {
  if (!inspiration || weight <= 0) return params;
  const next = { ...params };
  if (inspiration.dominantColors[0]) {
    next.color = blendHex(params.color, inspiration.dominantColors[0], weight);
  }
  if (inspiration.mood === 'soft' && weight > 0.5) {
    next.fabricBehavior = 'flowing' as FabricBehavior;
  } else if (inspiration.mood === 'industrial' && weight > 0.5) {
    next.fabricBehavior = 'structured' as FabricBehavior;
  } else if (inspiration.mood === 'bold' && weight > 0.5) {
    next.fabricWeight = 'heavy';
  }
  return next;
}

// Push variant B away from variant A so the two render visibly
// differently. The seed parity controls which fields shift, which makes
// the divergence deterministic.
function divergeVariant(params: GarmentParams, seed: number): GarmentParams {
  const next = { ...params };
  const dial = Math.abs(seed) % 5;
  switch (dial) {
    case 0: next.silhouette = swapSilhouette(next.silhouette); break;
    case 1: next.layerCount = Math.min(3, next.layerCount + 1); break;
    case 2: next.fabricBehavior = swapBehavior(next.fabricBehavior); break;
    case 3: next.color = shiftHue(next.color, 18); break;
    case 4: next.fabricWeight = next.fabricWeight === 'heavy' ? 'medium' : 'heavy'; break;
  }
  return next;
}

function swapSilhouette(s: Silhouette): Silhouette {
  const pairs: Record<Silhouette, Silhouette> = {
    fitted: 'a-line',
    'a-line': 'fitted',
    oversized: 'column',
    column: 'oversized',
    tiered: 'a-line',
  };
  return pairs[s];
}

function swapBehavior(b: FabricBehavior): FabricBehavior {
  const pairs: Record<FabricBehavior, FabricBehavior> = {
    flowing: 'drapey',
    drapey: 'flowing',
    structured: 'crisp',
    crisp: 'structured',
  };
  return pairs[b];
}

// Apply a refinement (voice or touch) to a variant and return a new
// variant. Voice refinements parse like a fresh description applied as
// a patch; touch refinements arrive pre-patched.
export function applyRefinement(
  variant: DesignVariant,
  instruction: RefinementInstruction,
): DesignVariant {
  let patched: GarmentParams = { ...variant.params };
  if (instruction.patch) {
    patched = { ...patched, ...instruction.patch };
  } else {
    // Parse the voice phrase as a delta on the existing params. We
    // intentionally don't replace fields the user didn't mention.
    const reparsed = parseDescriptionToFashionpedia(instruction.phrase);
    const mentions = mentionedFields(instruction.phrase);
    for (const key of mentions) {
      (patched as unknown as Record<string, unknown>)[key] = (reparsed as unknown as Record<string, unknown>)[key];
    }
  }

  // Hemline correction: handled inline since it doesn't have its own
  // Fashionpedia attribute on this scaffold's reduced ontology.
  const lower = instruction.phrase.toLowerCase();
  if (/hem(line)?|shorter|longer|up two inches|raise|lower/.test(lower)) {
    const note = `hem-correction:${lower}`;
    patched = { ...patched, notes: [...patched.notes, note] };
  }

  return {
    ...variant,
    params: patched,
    seed: variant.seed + 17,
  };
}

// Which Fashionpedia fields did the user actually reference in this
// phrase? We only overwrite fields they mentioned so iterative
// refinement (FR-21) doesn't undo earlier corrections.
function mentionedFields(phrase: string): Array<keyof GarmentParams> {
  const lower = phrase.toLowerCase();
  const fields: Array<keyof GarmentParams> = [];
  if (/dress|gown|top|blouse|skirt|pants|coat|jacket|jumpsuit/.test(lower)) fields.push('category');
  if (/fitted|a-line|oversized|column|tiered|loose|bodycon/.test(lower)) fields.push('silhouette');
  if (/flowy|flowing|structured|drapey|crisp|stiff|sharp/.test(lower)) fields.push('fabricBehavior');
  if (/light|heavy|medium|tweed|silk|chiffon|wool/.test(lower)) fields.push('fabricWeight');
  if (/pink|rose|cream|navy|sage|green|blue|red|black|white|burgundy|mustard|charcoal|lavender|olive|camel|rust/.test(lower)) {
    fields.push('color');
  }
  if (/sleeveless|sleeve|halter|crew|v-neck|scoop|off|square/.test(lower)) {
    fields.push('neckline');
    fields.push('sleeve');
  }
  return fields;
}

// Light deterministic hash for seeding without crypto.
function hashStringToInt(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function blendHex(a: string, b: string, weight: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const w = clamp(weight, 0, 1);
  return rgbToHex(r1 * (1 - w) + r2 * w, g1 * (1 - w) + g2 * w, b1 * (1 - w) + b2 * w);
}

function shiftHue(hex: string, degrees: number): string {
  // Cheap hue shift via RGB rotation. Not colorimetrically correct but
  // it produces visibly distinct variants which is what the demo needs.
  const [r, g, b] = hexToRgb(hex);
  const d = degrees / 360;
  return rgbToHex(
    r + d * 60,
    g + d * 30,
    b - d * 40,
  );
}
