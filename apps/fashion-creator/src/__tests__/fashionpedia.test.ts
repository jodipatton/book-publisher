import { describe, expect, it } from 'vitest';

import { parseDescriptionToFashionpedia } from '@/lib/fashionpedia';

describe('Fashionpedia interpreter', () => {
  it('parses a natural description into structured parameters', () => {
    const params = parseDescriptionToFashionpedia(
      'a soft pink dress with flowing layers draped over one shoulder',
    );
    expect(params.category).toBe('dress');
    expect(params.color).toBe('#e6b3b8');
    expect(params.fabricBehavior).toBe('flowing');
    expect(params.neckline).toBe('one-shoulder');
    expect(params.layerCount).toBeGreaterThanOrEqual(2);
  });

  it('falls back to safe defaults when description is sparse', () => {
    const params = parseDescriptionToFashionpedia('something nice');
    expect(params.category).toBe('dress');
    expect(params.silhouette).toBe('fitted');
    expect(params.fabricBehavior).toBe('drapey');
    expect(params.fabricWeight).toBe('medium');
  });

  it('prefers longest phrase match for nested vocabulary', () => {
    const params = parseDescriptionToFashionpedia(
      'a structured top with off-the-shoulder neckline',
    );
    expect(params.neckline).toBe('off-shoulder');
    expect(params.fabricBehavior).toBe('structured');
    expect(params.category).toBe('top');
  });

  it('uses taste profile to override the default color mapping', () => {
    const params = parseDescriptionToFashionpedia('a soft pink dress', {
      userId: 'u',
      correctionCycles: 1,
      entries: [
        {
          phrase: 'soft pink',
          parameter: 'color',
          value: '#d49aa1',
          weight: 3,
          updatedAt: Date.now(),
        },
      ],
    });
    expect(params.color).toBe('#d49aa1');
  });
});
