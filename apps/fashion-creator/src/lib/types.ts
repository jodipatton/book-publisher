// Core domain types for VoiceAtelier.

export type RenderMode = 'photorealistic' | 'sketch';

export type GarmentCategory =
  | 'dress'
  | 'top'
  | 'skirt'
  | 'pants'
  | 'coat'
  | 'jumpsuit';

export type FabricBehavior = 'flowing' | 'structured' | 'drapey' | 'crisp';
export type FabricWeight = 'light' | 'medium' | 'heavy';
export type Silhouette = 'fitted' | 'a-line' | 'oversized' | 'column' | 'tiered';
export type Neckline =
  | 'crew'
  | 'v-neck'
  | 'scoop'
  | 'off-shoulder'
  | 'one-shoulder'
  | 'square'
  | 'halter';
export type SleeveType = 'sleeveless' | 'cap' | 'short' | 'long' | 'puff' | 'bell';

// Body dimensions extracted from a single full-body photo.
// All measurements are inches unless otherwise noted.
export interface BodyDimensions {
  heightInches: number;
  shoulderWidth: number;
  torsoLength: number;
  armLength: number;
  hipWidth: number;
  inseam: number;
  waistToHipRatio: number;
  // True if proportions fall outside US-standard sizing assumptions.
  // We use this to disable any size-snapping logic that would otherwise
  // round a 5'1.5" frame to a standard sample size.
  isPetite: boolean;
}

// Structured garment parameters mapped from the Fashionpedia ontology
// (294 attributes, 27 categories, 19 garment parts).
export interface GarmentParams {
  category: GarmentCategory;
  silhouette: Silhouette;
  neckline?: Neckline;
  sleeve?: SleeveType;
  fabricBehavior: FabricBehavior;
  fabricWeight: FabricWeight;
  // CSS hex color, derived from natural-language color phrases
  // ("soft pink" -> desaturated rose).
  color: string;
  // Number of layers in the design (1 = single garment, >1 = layered).
  layerCount: number;
  // Free-form notes carried through from the user's voice description
  // that don't fit a structured field.
  notes: string[];
}

// Reference image used by the IP-Adapter style extractor.
export interface InspirationStyle {
  // Average / dominant colors pulled from the reference image.
  dominantColors: string[];
  // Mood label inferred from color + texture cues.
  mood: 'soft' | 'bold' | 'romantic' | 'industrial' | 'natural';
  // Strength of texture in the reference, 0..1.
  textureIntensity: number;
  // Aggregate descriptor string for debugging / display.
  summary: string;
}

export interface DesignVariant {
  id: string;
  params: GarmentParams;
  // Weight assigned to the inspiration image vs. the voice description
  // when this variant was generated.
  inspirationWeight: number;
  // Seed used for deterministic regeneration of the same variant.
  seed: number;
}

export interface DesignSet {
  variants: [DesignVariant, DesignVariant];
  bodyDimensions: BodyDimensions;
  renderMode: RenderMode;
}

// Entry in the per-user taste profile. Records how a user's natural
// language phrase mapped onto structured parameters they kept.
export interface TasteEntry {
  phrase: string;
  parameter: keyof GarmentParams | 'color';
  value: string;
  // Number of times the user has confirmed this mapping.
  weight: number;
  updatedAt: number;
}

export interface TasteProfile {
  userId: string;
  entries: TasteEntry[];
  // Number of completed correction cycles. Used to demonstrate the
  // "fewer corrections over time" success metric.
  correctionCycles: number;
}

export interface RefinementInstruction {
  // Source of the correction: voice utterance or a touch gesture.
  source: 'voice' | 'touch';
  // For voice: the transcribed text. For touch: a synthetic phrase
  // describing the gesture (e.g. "raise hemline by 8%").
  phrase: string;
  // Optional structured override the refinement should apply.
  patch?: Partial<GarmentParams>;
}
