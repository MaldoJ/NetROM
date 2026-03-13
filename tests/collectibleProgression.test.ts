import { describe, expect, it } from 'vitest';
import { collectiblePrestigeScore, collectiblePrestigeTier, setForgeProgress } from '../src/application/collectibleProgression.js';

describe('collectible progression', () => {
  it('computes set forge progress from category totals', () => {
    const progress = setForgeProgress(3, 2, 2, 2);

    expect(progress).toEqual({
      nextSetTarget: 3,
      fragments: 1,
      missingPieces: 2,
    });
  });

  it('maps completed sets to prestige tiers', () => {
    expect(collectiblePrestigeTier(0)).toBe('UNSEEDED');
    expect(collectiblePrestigeTier(1)).toBe('INITIATE FORGE');
    expect(collectiblePrestigeTier(3)).toBe('ELITE FORGE');
    expect(collectiblePrestigeTier(6)).toBe('LEGEND FORGE');
    expect(collectiblePrestigeTier(10)).toBe('MYTHIC FORGE');
  });

  it('computes weighted prestige score from rarity spread', () => {
    const score = collectiblePrestigeScore({
      COMMON: 5,
      UNCOMMON: 3,
      RARE: 2,
      EPIC: 1,
    });

    expect(score).toBe(26);
  });
});
