import { describe, expect, it } from 'vitest';

import { defaultPetiteBody } from '@/lib/bodyGeometry';
import {
  applyRefinement,
  detectConflict,
  generateDesignSet,
} from '@/lib/designGenerator';
import { styleFromPalette } from '@/lib/inspirationStyle';

describe('design generator', () => {
  it('produces two visually distinct variants from the same description', () => {
    const set = generateDesignSet({
      body: defaultPetiteBody(),
      description: 'a flowing dress with cap sleeves',
    });
    const [a, b] = set.variants;
    // At least one structured field should differ between the two
    // versions — the divergeVariant step guarantees it.
    const diff =
      a.params.silhouette !== b.params.silhouette ||
      a.params.layerCount !== b.params.layerCount ||
      a.params.fabricBehavior !== b.params.fabricBehavior ||
      a.params.fabricWeight !== b.params.fabricWeight ||
      a.params.color !== b.params.color;
    expect(diff).toBe(true);
  });

  it('applies a voice refinement and produces a different params set', () => {
    const set = generateDesignSet({
      body: defaultPetiteBody(),
      description: 'a fitted dress with long sleeves',
    });
    const refined = applyRefinement(set.variants[0], {
      source: 'voice',
      phrase: 'make it flowy and a-line',
    });
    expect(refined.params.fabricBehavior).toBe('flowing');
    expect(refined.params.silhouette).toBe('a-line');
    expect(refined.seed).not.toBe(set.variants[0].seed);
  });

  it('records a hem correction note when the phrase mentions hemline', () => {
    const set = generateDesignSet({
      body: defaultPetiteBody(),
      description: 'a column dress',
    });
    const refined = applyRefinement(set.variants[0], {
      source: 'voice',
      phrase: 'bring the hemline up two inches',
    });
    expect(refined.params.notes.some((n) => n.startsWith('hem-correction:'))).toBe(true);
  });

  it('detects a voice / inspiration conflict', () => {
    const set = generateDesignSet({
      body: defaultPetiteBody(),
      description: 'a structured tweed coat',
    });
    // Soft / romantic mood vs. structured fabric — conflict.
    const softStyle = styleFromPalette(['#f5e1e3', '#ffd6dc']);
    expect(detectConflict(set.variants[0].params, softStyle)).toBe(true);
    // No inspiration = no conflict.
    expect(detectConflict(set.variants[0].params, null)).toBe(false);
  });

  it('applies touch refinement via patch without re-parsing the phrase', () => {
    const set = generateDesignSet({
      body: defaultPetiteBody(),
      description: 'a fitted dress',
    });
    const refined = applyRefinement(set.variants[0], {
      source: 'touch',
      phrase: 'touch drag-up on hem',
      patch: { silhouette: 'fitted' },
    });
    expect(refined.params.silhouette).toBe('fitted');
  });
});

describe('body geometry', () => {
  it('default petite body flags isPetite true', () => {
    const body = defaultPetiteBody();
    expect(body.isPetite).toBe(true);
    expect(body.heightInches).toBeLessThan(64);
  });
});
