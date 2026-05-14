'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { BodyCapture } from '@/components/BodyCapture';
import { VoiceInput } from '@/components/VoiceInput';
import { InspirationInput } from '@/components/InspirationInput';
import { type GarmentRegion, type TouchGesture } from '@/components/DesignSvg';
import { DesignImage } from '@/components/DesignImage';
import { TasteProfilePanel } from '@/components/TasteProfilePanel';

import { defaultPetiteBody } from '@/lib/bodyGeometry';
import {
  applyRefinement,
  detectConflict,
  generateDesignSet,
} from '@/lib/designGenerator';
import { parseDescriptionToFashionpedia } from '@/lib/fashionpedia';
import {
  loadTasteProfile,
  recordCorrection,
  resetTasteProfile,
  saveTasteProfile,
} from '@/lib/tasteProfile';
import type {
  BodyDimensions,
  DesignSet,
  DesignVariant,
  GarmentParams,
  InspirationStyle,
  RefinementInstruction,
  RenderMode,
  TasteProfile,
} from '@/lib/types';

const USER_ID = 'demo-user';

export default function VoiceAtelierPage() {
  const [body, setBody] = useState<BodyDimensions>(() => defaultPetiteBody());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('a soft pink dress with flowing layers draped over one shoulder');
  const [refinement, setRefinement] = useState('');
  const [inspiration, setInspiration] = useState<InspirationStyle | null>(null);
  const [inspirationPreview, setInspirationPreview] = useState<string | null>(null);
  const [blend, setBlend] = useState(0.5);
  const [renderMode, setRenderMode] = useState<RenderMode>('photorealistic');
  const [designSet, setDesignSet] = useState<DesignSet | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<0 | 1 | null>(null);
  const [profile, setProfile] = useState<TasteProfile>(() => ({ userId: USER_ID, entries: [], correctionCycles: 0 }));

  // Load the persisted taste profile after mount — localStorage isn't
  // available during SSR so we hydrate on the client.
  useEffect(() => {
    setProfile(loadTasteProfile(USER_ID));
  }, []);

  const conflictDetected = useMemo(() => {
    if (!designSet) return false;
    return detectConflict(designSet.variants[0].params, inspiration);
  }, [designSet, inspiration]);

  const handleGenerate = useCallback(
    (text: string) => {
      const baseParams = applyParamsFromProfile(text, profile);
      const set = generateDesignSet({
        body,
        description: text,
        baseParams,
        inspiration,
        blendDial: blend,
        renderMode,
      });
      setDesignSet(set);
      setSelectedIdx(null);
    },
    [body, inspiration, blend, renderMode, profile],
  );

  const handleRefineVoice = useCallback(
    (text: string) => {
      if (!designSet) return;
      const idx = selectedIdx ?? 0;
      const target = designSet.variants[idx];
      const instruction: RefinementInstruction = { source: 'voice', phrase: text };
      const updated = applyRefinement(target, instruction);
      const next = recordEdits(profile, target.params, updated.params, text);
      setProfile(next);
      saveTasteProfile(next);
      const variants: DesignSet['variants'] = idx === 0
        ? [updated, designSet.variants[1]]
        : [designSet.variants[0], updated];
      setDesignSet({ ...designSet, variants });
      setSelectedIdx(idx as 0 | 1);
      setRefinement('');
    },
    [designSet, selectedIdx, profile],
  );

  const handleTouch = useCallback(
    (variantIdx: 0 | 1, region: GarmentRegion, gesture: TouchGesture) => {
      if (!designSet) return;
      const target = designSet.variants[variantIdx];
      const patch = patchForGesture(region, gesture, target.params);
      if (!patch) return;
      const phrase = describeGesture(region, gesture);
      const instruction: RefinementInstruction = { source: 'touch', phrase, patch };
      const updated = applyRefinement(target, instruction);
      const next = recordEdits(profile, target.params, updated.params, phrase);
      setProfile(next);
      saveTasteProfile(next);
      const variants: DesignSet['variants'] = variantIdx === 0
        ? [updated, designSet.variants[1]]
        : [designSet.variants[0], updated];
      setDesignSet({ ...designSet, variants });
      setSelectedIdx(variantIdx);
    },
    [designSet, profile],
  );

  function handleBodyCaptured(next: BodyDimensions, url: string | null) {
    setBody(next);
    setPhotoUrl(url);
    if (designSet) {
      setDesignSet({ ...designSet, bodyDimensions: next });
    }
  }

  function handleInspirationChange(style: InspirationStyle | null, previewUrl: string | null) {
    setInspiration(style);
    setInspirationPreview(previewUrl);
  }

  function handleSelect(idx: 0 | 1) {
    if (!designSet) return;
    setSelectedIdx(idx);
    // Selecting a variant counts as confirming its parameter set —
    // record the phrase → params mapping so the taste profile learns.
    const next = recordSelectionAsTaste(profile, description, designSet.variants[idx].params);
    setProfile(next);
    saveTasteProfile(next);
  }

  function handleResetProfile() {
    const fresh = resetTasteProfile(USER_ID);
    setProfile(fresh);
  }

  return (
    <main className="page">
      <header className="hero">
        <div>
          <h1>VoiceAtelier</h1>
          <p className="muted">
            Your proportions are the canvas. Your voice is the design tool.
          </p>
        </div>
        <div className="render-toggle" role="tablist" aria-label="render mode">
          <button
            role="tab"
            aria-selected={renderMode === 'photorealistic'}
            className={renderMode === 'photorealistic' ? 'active' : ''}
            onClick={() => setRenderMode('photorealistic')}
          >
            Photoreal
          </button>
          <button
            role="tab"
            aria-selected={renderMode === 'sketch'}
            className={renderMode === 'sketch' ? 'active' : ''}
            onClick={() => setRenderMode('sketch')}
          >
            Sketch
          </button>
        </div>
      </header>

      <div className="layout">
        <section className="column-inputs">
          <BodyCapture body={body} onCaptured={handleBodyCaptured} />
          <VoiceInput
            label="3 · Describe the outfit"
            placeholder="A soft pink dress with flowing layers draped over one shoulder"
            value={description}
            onChange={setDescription}
            onSubmit={handleGenerate}
            submitLabel="Generate two designs"
          />
          <InspirationInput
            style={inspiration}
            blend={blend}
            onStyleChange={handleInspirationChange}
            onBlendChange={setBlend}
          />
        </section>

        <section className="column-canvas">
          {designSet ? (
            <>
              {conflictDetected && (
                <div className="banner banner-conflict">
                  Conflict detected: your words and your reference pull in
                  different directions. Both versions below resolve it
                  differently — pick one, or merge.
                </div>
              )}
              <div className="variants">
                {designSet.variants.map((variant, idx) => (
                  <article
                    key={variant.id}
                    className={`variant ${selectedIdx === idx ? 'variant-selected' : ''}`}
                  >
                    <header>
                      <h3>Version {idx === 0 ? 'A' : 'B'}</h3>
                      <button
                        type="button"
                        className="btn btn-small"
                        onClick={() => handleSelect(idx as 0 | 1)}
                      >
                        {selectedIdx === idx ? 'Selected' : 'Choose'}
                      </button>
                    </header>
                    <DesignImage
                      variant={variant}
                      body={body}
                      renderMode={renderMode}
                      highlight={selectedIdx === idx}
                      onTouchGarment={(region, gesture) => handleTouch(idx as 0 | 1, region, gesture)}
                    />
                    <VariantSummary variant={variant} />
                  </article>
                ))}
              </div>

              <div className="refinement">
                <VoiceInput
                  label="Refine by voice"
                  placeholder='e.g. "bring the hemline up two inches, make the waist more structured"'
                  value={refinement}
                  onChange={setRefinement}
                  onSubmit={handleRefineVoice}
                  submitLabel={`Apply to version ${selectedIdx === 1 ? 'B' : 'A'}`}
                />
                <p className="muted small">
                  Or tap a region directly — neckline, sleeves, hem — to
                  adjust by gesture. Each correction feeds your taste
                  profile.
                </p>
              </div>
            </>
          ) : (
            <div className="placeholder">
              <p>Describe an outfit above to generate two designs on your body model.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleGenerate(description)}
                disabled={!description.trim()}
              >
                Generate two designs
              </button>
            </div>
          )}
          {photoUrl && (
            <div className="photo-thumb" aria-label="uploaded body photo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="" />
            </div>
          )}
          {inspirationPreview && (
            <div className="photo-thumb photo-thumb-secondary" aria-label="inspiration reference">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={inspirationPreview} alt="" />
            </div>
          )}
        </section>

        <aside className="column-aside">
          <TasteProfilePanel profile={profile} onReset={handleResetProfile} />
        </aside>
      </div>
    </main>
  );
}

function VariantSummary({ variant }: { variant: DesignVariant }) {
  const p = variant.params;
  return (
    <dl className="variant-summary">
      <span><dt>category</dt><dd>{p.category}</dd></span>
      <span><dt>silhouette</dt><dd>{p.silhouette}</dd></span>
      <span><dt>fabric</dt><dd>{p.fabricBehavior} · {p.fabricWeight}</dd></span>
      {p.neckline && <span><dt>neckline</dt><dd>{p.neckline}</dd></span>}
      {p.sleeve && <span><dt>sleeve</dt><dd>{p.sleeve}</dd></span>}
      <span><dt>layers</dt><dd>{p.layerCount}</dd></span>
      <span>
        <dt>color</dt>
        <dd>
          <span className="swatch swatch-inline" style={{ background: p.color }} />
          {p.color}
        </dd>
      </span>
    </dl>
  );
}

function applyParamsFromProfile(text: string, profile: TasteProfile): GarmentParams {
  return parseDescriptionToFashionpedia(text, profile);
}

function recordEdits(
  profile: TasteProfile,
  before: GarmentParams,
  after: GarmentParams,
  phrase: string,
): TasteProfile {
  let next = profile;
  const keys: Array<keyof GarmentParams> = ['category', 'silhouette', 'fabricBehavior', 'fabricWeight', 'neckline', 'sleeve', 'color'];
  for (const key of keys) {
    const a = (before as unknown as Record<string, unknown>)[key];
    const b = (after as unknown as Record<string, unknown>)[key];
    if (a !== b && typeof b === 'string') {
      next = recordCorrection(next, phrase, key as 'color' | keyof GarmentParams, b);
    }
  }
  return next;
}

function recordSelectionAsTaste(
  profile: TasteProfile,
  phrase: string,
  params: GarmentParams,
): TasteProfile {
  // When the user picks a variant, the natural-language phrase they
  // spoke maps to the parameters of that variant — that's a high-value
  // confirmation signal. We record color + silhouette + fabricBehavior
  // since those are the fields most often ambiguous in natural language.
  let next = profile;
  next = recordCorrection(next, phrase, 'color', params.color);
  next = recordCorrection(next, phrase, 'silhouette', params.silhouette);
  next = recordCorrection(next, phrase, 'fabricBehavior', params.fabricBehavior);
  return next;
}

function patchForGesture(
  region: GarmentRegion,
  gesture: TouchGesture,
  current: GarmentParams,
): Partial<GarmentParams> | null {
  switch (region) {
    case 'hem':
      // Toggle silhouette compactness when the hem is dragged.
      if (gesture === 'drag-up') return { silhouette: 'fitted' };
      if (gesture === 'drag-down') return { silhouette: 'tiered' };
      return null;
    case 'sleeves':
      // Cycle through plausible sleeve lengths.
      return { sleeve: nextSleeve(current.sleeve) };
    case 'neckline':
      return { neckline: nextNeckline(current.neckline) };
    case 'body':
      return { fabricBehavior: current.fabricBehavior === 'structured' ? 'drapey' : 'structured' };
    default:
      return null;
  }
}

function nextSleeve(current: GarmentParams['sleeve']): GarmentParams['sleeve'] {
  const cycle: GarmentParams['sleeve'][] = ['sleeveless', 'cap', 'short', 'long', 'puff', 'bell'];
  const idx = cycle.indexOf(current ?? 'sleeveless');
  return cycle[(idx + 1) % cycle.length];
}

function nextNeckline(current: GarmentParams['neckline']): GarmentParams['neckline'] {
  const cycle: GarmentParams['neckline'][] = ['crew', 'v-neck', 'scoop', 'off-shoulder', 'one-shoulder', 'square', 'halter'];
  const idx = cycle.indexOf(current ?? 'crew');
  return cycle[(idx + 1) % cycle.length];
}

function describeGesture(region: GarmentRegion, gesture: TouchGesture): string {
  return `touch ${gesture} on ${region}`;
}
