export type ConstellationTierKey = 'gentle' | 'cozy' | 'detailed';

export interface ConstellationStar {
  x: number;
  y: number;
}

export interface ConstellationPuzzle {
  id: string;
  name: string;
  emoji: string;
  tier: ConstellationTierKey;
  dedication: string;
  revealTint: string;
  closed: boolean;
  stars: readonly ConstellationStar[];
  accentSparkles?: readonly ConstellationStar[];
}

export interface ConstellationSessionTier {
  level: number;
  label: string;
  tierKey: ConstellationTierKey;
  hideFutureNumbers: boolean;
}

export const CONSTELLATION_TIERS: readonly {
  key: ConstellationTierKey;
  label: string;
}[] = [
  { key: 'gentle', label: 'Gentle' },
  { key: 'cozy', label: 'Cozy' },
  { key: 'detailed', label: 'Detailed' },
] as const;

export const getConstellationTierForSolvedCount = (
  solvedCount: number
): ConstellationSessionTier => {
  if (solvedCount < 2) {
    return { level: 1, label: 'Gentle', tierKey: 'gentle', hideFutureNumbers: false };
  }
  if (solvedCount < 4) {
    return { level: 2, label: 'Cozy', tierKey: 'cozy', hideFutureNumbers: false };
  }
  if (solvedCount < 6) {
    return { level: 3, label: 'Detailed', tierKey: 'detailed', hideFutureNumbers: false };
  }
  return { level: 4, label: 'Stargazer', tierKey: 'detailed', hideFutureNumbers: true };
};

export const CONSTELLATION_PUZZLES: readonly ConstellationPuzzle[] = [
  // ---------- GENTLE (6-8 stars) ----------
  {
    id: 'crescent-moon',
    name: 'Crescent Moon',
    emoji: '🌙',
    tier: 'gentle',
    dedication: 'A gentle crescent watching softly over sweet naps and quiet nights.',
    revealTint: '#fde68a',
    closed: true,
    stars: [
      { x: 208, y: 46 },
      { x: 150, y: 66 },
      { x: 118, y: 122 },
      { x: 138, y: 184 },
      { x: 196, y: 218 },
      { x: 244, y: 198 },
      { x: 186, y: 162 },
      { x: 184, y: 100 },
    ],
    accentSparkles: [
      { x: 248, y: 92 },
      { x: 268, y: 132 },
    ],
  },
  {
    id: 'cozy-heart',
    name: 'Cozy Heart',
    emoji: '💛',
    tier: 'gentle',
    dedication: 'Two heartbeats sharing one quiet, loving rhythm.',
    revealTint: '#fbcfe8',
    closed: true,
    stars: [
      { x: 180, y: 102 },
      { x: 136, y: 64 },
      { x: 84, y: 94 },
      { x: 96, y: 152 },
      { x: 180, y: 222 },
      { x: 264, y: 152 },
      { x: 276, y: 94 },
      { x: 224, y: 64 },
    ],
    accentSparkles: [{ x: 180, y: 148 }],
  },
  {
    id: 'paper-boat',
    name: 'Paper Boat',
    emoji: '⛵',
    tier: 'gentle',
    dedication: 'May your little adventures sail across calm, sunlit waters.',
    revealTint: '#bae6fd',
    closed: true,
    stars: [
      { x: 180, y: 54 },
      { x: 134, y: 146 },
      { x: 74, y: 146 },
      { x: 116, y: 204 },
      { x: 244, y: 204 },
      { x: 286, y: 146 },
      { x: 226, y: 146 },
    ],
    accentSparkles: [
      { x: 180, y: 146 },
      { x: 180, y: 178 },
    ],
  },
  {
    id: 'wishing-star',
    name: 'Wishing Star',
    emoji: '⭐',
    tier: 'gentle',
    dedication: 'Every bright little wish we whisper is already wrapped around you.',
    revealTint: '#fef08a',
    closed: true,
    stars: [
      { x: 180, y: 42 },
      { x: 204, y: 102 },
      { x: 274, y: 108 },
      { x: 220, y: 150 },
      { x: 240, y: 218 },
      { x: 180, y: 180 },
      { x: 120, y: 218 },
      { x: 140, y: 150 },
      { x: 86, y: 108 },
      { x: 156, y: 102 },
    ],
  },

  // ---------- COZY (9-11 stars) ----------
  {
    id: 'fluffy-cloud',
    name: 'Fluffy Cloud',
    emoji: '☁️',
    tier: 'cozy',
    dedication: 'Soft like cotton clouds drifting gently across a lavender evening.',
    revealTint: '#e0e7ff',
    closed: true,
    stars: [
      { x: 84, y: 188 },
      { x: 64, y: 144 },
      { x: 96, y: 104 },
      { x: 142, y: 92 },
      { x: 182, y: 66 },
      { x: 230, y: 84 },
      { x: 264, y: 112 },
      { x: 294, y: 148 },
      { x: 272, y: 188 },
      { x: 180, y: 192 },
    ],
    accentSparkles: [
      { x: 142, y: 148 },
      { x: 216, y: 148 },
    ],
  },
  {
    id: 'baby-whale',
    name: 'Baby Whale',
    emoji: '🐳',
    tier: 'cozy',
    dedication: 'Safe, cozy, and weightless — swimming peacefully in your warm little ocean.',
    revealTint: '#a5f3fc',
    closed: true,
    stars: [
      { x: 76, y: 144 },
      { x: 102, y: 96 },
      { x: 162, y: 86 },
      { x: 216, y: 116 },
      { x: 262, y: 132 },
      { x: 300, y: 102 },
      { x: 296, y: 156 },
      { x: 256, y: 168 },
      { x: 212, y: 188 },
      { x: 144, y: 194 },
      { x: 90, y: 180 },
    ],
    accentSparkles: [
      { x: 116, y: 144 },
      { x: 152, y: 54 },
      { x: 176, y: 50 },
    ],
  },
  {
    id: 'little-duckling',
    name: 'Little Duckling',
    emoji: '🐥',
    tier: 'cozy',
    dedication: 'A tiny sunny friend ready for splashing bath times and giggles.',
    revealTint: '#fef08a',
    closed: true,
    stars: [
      { x: 118, y: 96 },
      { x: 154, y: 62 },
      { x: 198, y: 74 },
      { x: 204, y: 116 },
      { x: 256, y: 124 },
      { x: 288, y: 154 },
      { x: 254, y: 198 },
      { x: 174, y: 208 },
      { x: 114, y: 184 },
      { x: 124, y: 134 },
      { x: 84, y: 114 },
    ],
    accentSparkles: [{ x: 152, y: 96 }],
  },
  {
    id: 'sleeping-owl',
    name: 'Sleeping Owl',
    emoji: '🦉',
    tier: 'cozy',
    dedication: 'Wise little eyes and cozy feathers tucked in for sweet bedtime stories.',
    revealTint: '#ddd6fe',
    closed: true,
    stars: [
      { x: 126, y: 60 },
      { x: 180, y: 74 },
      { x: 234, y: 60 },
      { x: 248, y: 108 },
      { x: 262, y: 164 },
      { x: 230, y: 212 },
      { x: 180, y: 222 },
      { x: 130, y: 212 },
      { x: 98, y: 164 },
      { x: 112, y: 108 },
    ],
    accentSparkles: [
      { x: 154, y: 112 },
      { x: 206, y: 112 },
      { x: 180, y: 134 },
    ],
  },

  // ---------- DETAILED (12-14 stars) ----------
  {
    id: 'butterfly-wings',
    name: 'Butterfly Wings',
    emoji: '🦋',
    tier: 'detailed',
    dedication: 'Gentle little flutters that make every waiting day feel magical.',
    revealTint: '#f5d0fe',
    closed: true,
    stars: [
      { x: 180, y: 88 },
      { x: 134, y: 54 },
      { x: 76, y: 78 },
      { x: 88, y: 134 },
      { x: 132, y: 154 },
      { x: 94, y: 196 },
      { x: 146, y: 222 },
      { x: 180, y: 176 },
      { x: 214, y: 222 },
      { x: 266, y: 196 },
      { x: 228, y: 154 },
      { x: 272, y: 134 },
      { x: 284, y: 78 },
      { x: 226, y: 54 },
    ],
    accentSparkles: [{ x: 180, y: 132 }],
  },
  {
    id: 'teddy-bear',
    name: 'Teddy Bear',
    emoji: '🧸',
    tier: 'detailed',
    dedication: 'Soft warm hugs waiting for tiny arms to reach out and hold on.',
    revealTint: '#fed7aa',
    closed: true,
    stars: [
      { x: 116, y: 58 },
      { x: 150, y: 68 },
      { x: 210, y: 68 },
      { x: 244, y: 58 },
      { x: 256, y: 98 },
      { x: 228, y: 126 },
      { x: 268, y: 162 },
      { x: 244, y: 218 },
      { x: 180, y: 206 },
      { x: 116, y: 218 },
      { x: 92, y: 162 },
      { x: 132, y: 126 },
      { x: 104, y: 98 },
    ],
    accentSparkles: [
      { x: 162, y: 100 },
      { x: 198, y: 100 },
      { x: 180, y: 118 },
    ],
  },
  {
    id: 'baby-elephant',
    name: 'Baby Elephant',
    emoji: '🐘',
    tier: 'detailed',
    dedication: 'Gentle strength, big curiosity, and the warmest heart.',
    revealTint: '#c7d2fe',
    closed: true,
    stars: [
      { x: 128, y: 80 },
      { x: 182, y: 68 },
      { x: 238, y: 82 },
      { x: 274, y: 124 },
      { x: 272, y: 198 },
      { x: 236, y: 204 },
      { x: 220, y: 170 },
      { x: 168, y: 172 },
      { x: 156, y: 206 },
      { x: 120, y: 202 },
      { x: 112, y: 148 },
      { x: 76, y: 168 },
      { x: 64, y: 126 },
      { x: 96, y: 104 },
    ],
    accentSparkles: [{ x: 118, y: 116 }],
  },
  {
    id: 'cozy-cradle',
    name: 'Starry Cradle',
    emoji: '✨',
    tier: 'detailed',
    dedication: 'A quiet little nest built from patience, wonder, and love.',
    revealTint: '#a7f3d0',
    closed: true,
    stars: [
      { x: 76, y: 122 },
      { x: 110, y: 74 },
      { x: 168, y: 64 },
      { x: 204, y: 108 },
      { x: 256, y: 108 },
      { x: 294, y: 128 },
      { x: 280, y: 180 },
      { x: 242, y: 214 },
      { x: 180, y: 224 },
      { x: 118, y: 214 },
      { x: 80, y: 180 },
      { x: 128, y: 136 },
    ],
    accentSparkles: [
      { x: 152, y: 102 },
      { x: 232, y: 152 },
    ],
  },
] as const;

export const pickConstellation = (
  tier: ConstellationTierKey,
  excludeId?: string
): ConstellationPuzzle => {
  const pool = CONSTELLATION_PUZZLES.filter((c) => c.tier === tier);
  const filtered = pool.length > 1 && excludeId ? pool.filter((c) => c.id !== excludeId) : pool;
  return filtered[Math.floor(Math.random() * filtered.length)] ?? CONSTELLATION_PUZZLES[0];
};
