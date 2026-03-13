export type CollectibleRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC';

const RARITY_POINTS: Record<CollectibleRarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 4,
  EPIC: 7,
};

export function collectiblePrestigeTier(completedSets: number): string {
  if (completedSets >= 10) return 'MYTHIC FORGE';
  if (completedSets >= 6) return 'LEGEND FORGE';
  if (completedSets >= 3) return 'ELITE FORGE';
  if (completedSets >= 1) return 'INITIATE FORGE';
  return 'UNSEEDED';
}

export function setForgeProgress(ansiTotal: number, archiveTotal: number, malwareTotal: number, completedSets: number): {
  nextSetTarget: number;
  fragments: number;
  missingPieces: number;
} {
  const nextSetTarget = completedSets + 1;
  const missingForNextSet = [
    Math.max(0, nextSetTarget - ansiTotal),
    Math.max(0, nextSetTarget - archiveTotal),
    Math.max(0, nextSetTarget - malwareTotal),
  ];

  return {
    nextSetTarget,
    fragments: missingForNextSet.filter((missing) => missing === 0).length,
    missingPieces: missingForNextSet.reduce((sum, missing) => sum + missing, 0),
  };
}

export function collectiblePrestigeScore(totalByRarity: Record<CollectibleRarity, number>): number {
  return Object.entries(totalByRarity).reduce((sum, [rarity, total]) => {
    return sum + (RARITY_POINTS[rarity as CollectibleRarity] * total);
  }, 0);
}
