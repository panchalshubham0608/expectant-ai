export type StarlightGridSize = 5 | 6 | 7 | 8;

export type StarlightTokenId =
  | 'sun'
  | 'moon'
  | 'leaf'
  | 'blossom'
  | 'drop'
  | 'star'
  | 'cloud'
  | 'shell';

export interface StarlightTokenSpec {
  id: StarlightTokenId;
  label: string;
  emoji: string;
  stroke: string;
  softBg: string;
  ring: string;
}

export const STARLIGHT_TOKENS: readonly StarlightTokenSpec[] = [
  {
    id: 'sun',
    label: 'Sun',
    emoji: '☀️',
    stroke: '#f59e0b',
    softBg: '#fef3c7',
    ring: '#fbbf24',
  },
  {
    id: 'moon',
    label: 'Moon',
    emoji: '🌙',
    stroke: '#6366f1',
    softBg: '#e0e7ff',
    ring: '#818cf8',
  },
  {
    id: 'leaf',
    label: 'Leaf',
    emoji: '🌿',
    stroke: '#10b981',
    softBg: '#d1fae5',
    ring: '#34d399',
  },
  {
    id: 'blossom',
    label: 'Blossom',
    emoji: '🌸',
    stroke: '#f43f5e',
    softBg: '#ffe4e6',
    ring: '#fb7185',
  },
  {
    id: 'drop',
    label: 'Raindrop',
    emoji: '💧',
    stroke: '#0ea5e9',
    softBg: '#e0f2fe',
    ring: '#38bdf8',
  },
  {
    id: 'star',
    label: 'Star',
    emoji: '⭐',
    stroke: '#8b5cf6',
    softBg: '#ede9fe',
    ring: '#a78bfa',
  },
  {
    id: 'cloud',
    label: 'Cloud',
    emoji: '☁️',
    stroke: '#14b8a6',
    softBg: '#ccfbf1',
    ring: '#2dd4bf',
  },
  {
    id: 'shell',
    label: 'Shell',
    emoji: '🐚',
    stroke: '#f97316',
    softBg: '#ffedd5',
    ring: '#fb923c',
  },
] as const;

export const STARLIGHT_TOKEN_BY_ID: ReadonlyMap<StarlightTokenId, StarlightTokenSpec> = new Map(
  STARLIGHT_TOKENS.map((t) => [t.id, t])
);

export const ALLOWED_STARLIGHT_TOKEN_IDS: ReadonlySet<string> = new Set(
  STARLIGHT_TOKENS.map((t) => t.id)
);

export interface StarlightSessionTier {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  size: StarlightGridSize;
  pairCount: number;
  complexity: number;
}

export const getStarlightTierForSolvedCount = (solvedCount: number): StarlightSessionTier => {
  if (solvedCount < 2) {
    return { level: 1, label: 'Gentle Dawn', size: 5, pairCount: 4, complexity: 1 };
  }
  if (solvedCount < 4) {
    return { level: 2, label: 'Soft Twilight', size: 5, pairCount: 5, complexity: 2 };
  }
  if (solvedCount < 6) {
    return { level: 3, label: 'Cozy Starlight', size: 6, pairCount: 6, complexity: 3 };
  }
  if (solvedCount < 9) {
    return { level: 4, label: 'Deep Constellation', size: 7, pairCount: 7, complexity: 4 };
  }
  return { level: 5, label: 'Midnight Aurora', size: 8, pairCount: 8, complexity: 5 };
};

export interface StarlightPair {
  tokenId: StarlightTokenId;
  start: number;
  end: number;
}

export interface StarlightBoard {
  size: StarlightGridSize;
  pairs: StarlightPair[];
  solution: Record<string, number[]>;
}

type Coord = readonly [number, number];

/**
 * Generates a fresh, guaranteed-solvable full-grid Starlight Paths board
 * using a randomized Backbite Hamiltonian path + complexity-scored segment partition.
 */
const buildHamiltonianSnake = (size: StarlightGridSize): Coord[] => {
  const path: Coord[] = [];
  for (let r = 0; r < size; r++) {
    if (r % 2 === 0) {
      for (let c = 0; c < size; c++) path.push([r, c]);
    } else {
      for (let c = size - 1; c >= 0; c--) path.push([r, c]);
    }
  }
  return path;
};

const idxOf = (r: number, c: number, size: number): number => r * size + c;
const rcOf = (idx: number, size: number): [number, number] => [Math.floor(idx / size), idx % size];
const manhattan = (a: number, b: number, size: number): number => {
  const [r1, c1] = rcOf(a, size);
  const [r2, c2] = rcOf(b, size);
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
};

const getNeighbors = (idx: number, size: number): number[] => {
  const [r, c] = rcOf(idx, size);
  const out: number[] = [];
  if (r > 0) out.push(idxOf(r - 1, c, size));
  if (r < size - 1) out.push(idxOf(r + 1, c, size));
  if (c > 0) out.push(idxOf(r, c - 1, size));
  if (c < size - 1) out.push(idxOf(r, c + 1, size));
  return out;
};

const shuffle = <T,>(items: readonly T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const countPathTurns = (seg: readonly number[], size: number): number => {
  if (seg.length < 3) return 0;
  let turns = 0;
  for (let i = 2; i < seg.length; i++) {
    const [r0, c0] = rcOf(seg[i - 2], size);
    const [r1, c1] = rcOf(seg[i - 1], size);
    const [r2, c2] = rcOf(seg[i], size);
    if (r1 - r0 !== r2 - r1 || c1 - c0 !== c2 - c1) {
      turns++;
    }
  }
  return turns;
};

const scoreSegmentsComplexity = (segments: readonly number[][], size: number): number => {
  let score = 0;
  for (const seg of segments) {
    const turns = countPathTurns(seg, size);
    const dist = manhattan(seg[0], seg[seg.length - 1], size);
    const detour = Math.max(0, seg.length - 1 - dist);

    score += turns * 2.5 + detour * 2 + Math.min(dist, 5) * 1.2;
    if (turns === 0) score -= 5;
    if (dist <= 2) score -= 2.5;
  }
  return score;
};

const generateRandomHamiltonianPath = (size: StarlightGridSize, steps: number): number[] => {
  let path = buildHamiltonianSnake(size).map(([r, c]) => idxOf(r, c, size));

  for (let s = 0; s < steps; s++) {
    if (Math.random() < 0.5) {
      path = path.reverse();
    }
    const endIdx = path[path.length - 1];
    const neighbors = getNeighbors(endIdx, size);
    const chosenNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)];
    const pos = path.indexOf(chosenNeighbor);
    if (pos >= 0 && pos < path.length - 2) {
      const prefix = path.slice(0, pos + 1);
      const reversedSuffix = path.slice(pos + 1).reverse();
      path = [...prefix, ...reversedSuffix];
    }
  }

  return path;
};

const partitionPathIntoPairs = (
  fullPath: number[],
  size: StarlightGridSize,
  pairCount: number,
  minEndpointDist: number
): number[][] | null => {
  const total = fullPath.length;
  const minLen = size >= 7 ? 4 : 3;
  const maxLen = size === 5 ? 9 : size === 6 ? 11 : size === 7 ? 13 : 15;

  for (let attempt = 0; attempt < 90; attempt++) {
    const lengths: number[] = [];
    let remaining = total;
    let valid = true;

    for (let i = 0; i < pairCount - 1; i++) {
      const pairsLeftAfter = pairCount - 1 - i;
      const low = Math.max(minLen, remaining - pairsLeftAfter * maxLen);
      const high = Math.min(maxLen, remaining - pairsLeftAfter * minLen);
      if (low > high) {
        valid = false;
        break;
      }
      const len = low + Math.floor(Math.random() * (high - low + 1));
      lengths.push(len);
      remaining -= len;
    }

    if (!valid || remaining < minLen || remaining > maxLen) continue;
    lengths.push(remaining);

    const segments: number[][] = [];
    let cursor = 0;
    let goodEndpoints = true;
    for (const len of lengths) {
      const seg = fullPath.slice(cursor, cursor + len);
      cursor += len;
      if (manhattan(seg[0], seg[seg.length - 1], size) < minEndpointDist) {
        goodEndpoints = false;
        break;
      }
      segments.push(seg);
    }

    if (goodEndpoints) {
      return segments;
    }
  }

  return null;
};

const buildFallbackBoard = (size: StarlightGridSize): StarlightBoard => {
  const fullPath = buildHamiltonianSnake(size).map(([r, c]) => idxOf(r, c, size));
  const cutsBySize: Record<StarlightGridSize, number[]> = {
    5: [6, 6, 7, 6],
    6: [6, 6, 6, 6, 6, 6],
    7: [7, 7, 7, 7, 7, 7, 7],
    8: [8, 8, 8, 8, 8, 8, 8, 8],
  };
  const cuts = cutsBySize[size];
  const tokens = shuffle(STARLIGHT_TOKENS).slice(0, cuts.length);
  const pairs: StarlightPair[] = [];
  const solution: Record<string, number[]> = {};
  let cursor = 0;

  cuts.forEach((len, idx) => {
    const seg = fullPath.slice(cursor, cursor + len);
    cursor += len;
    const token = tokens[idx];
    pairs.push({
      tokenId: token.id,
      start: seg[0],
      end: seg[seg.length - 1],
    });
    solution[token.id] = seg;
  });

  return { size, pairs, solution };
};

export interface GenerateStarlightOptions {
  complexity?: number;
  pairCount?: number;
}

const defaultPairCountForSize = (size: StarlightGridSize, complexity: number): number => {
  if (size === 5) return complexity >= 2 ? 5 : 4;
  if (size === 6) return complexity >= 3 ? 6 : 5;
  if (size === 7) return complexity >= 4 ? 7 : 6;
  return complexity >= 5 ? 8 : 7;
};

export const generateStarlightBoard = (
  size: StarlightGridSize,
  options?: GenerateStarlightOptions
): StarlightBoard => {
  const complexity = Math.max(1, Math.min(5, Math.floor(options?.complexity ?? 1)));
  const pairCount = Math.max(
    4,
    Math.min(STARLIGHT_TOKENS.length, options?.pairCount ?? defaultPairCountForSize(size, complexity))
  );
  const backbiteSteps = size * size * (5 + complexity);
  const candidateTarget = complexity === 1 ? 2 : complexity === 2 ? 5 : complexity === 3 ? 8 : 11;
  const preferredDist = complexity >= 3 && size >= 6 ? 3 : 2;

  let bestSegments: number[][] | null = null;
  let bestScore = -Infinity;

  for (let tries = 0; tries < 45; tries++) {
    const fullPath = generateRandomHamiltonianPath(size, backbiteSteps);
    const segments =
      partitionPathIntoPairs(fullPath, size, pairCount, preferredDist) ??
      partitionPathIntoPairs(fullPath, size, pairCount, 2);
    if (!segments) continue;

    const score = scoreSegmentsComplexity(segments, size);
    if (score > bestScore) {
      bestScore = score;
      bestSegments = segments;
    }

    if (tries + 1 >= candidateTarget && bestSegments) {
      break;
    }
  }

  if (!bestSegments) {
    return buildFallbackBoard(size);
  }

  const tokens = shuffle(STARLIGHT_TOKENS).slice(0, bestSegments.length);
  const pairs: StarlightPair[] = [];
  const solution: Record<string, number[]> = {};

  bestSegments.forEach((seg, idx) => {
    const token = tokens[idx];
    pairs.push({
      tokenId: token.id,
      start: seg[0],
      end: seg[seg.length - 1],
    });
    solution[token.id] = seg;
  });

  return { size, pairs, solution };
};

export const areCellsAdjacent = (a: number, b: number, size: StarlightGridSize): boolean =>
  manhattan(a, b, size) === 1;

export const isPairConnected = (pair: StarlightPair, path: readonly number[] | undefined): boolean => {
  if (!path || path.length < 2) return false;
  const first = path[0];
  const last = path[path.length - 1];
  return (
    (first === pair.start && last === pair.end) || (first === pair.end && last === pair.start)
  );
};

export const isStarlightBoardSolved = (
  board: StarlightBoard,
  paths: Record<string, number[]>
): boolean => {
  const used = new Set<number>();
  for (const pair of board.pairs) {
    const path = paths[pair.tokenId];
    if (!isPairConnected(pair, path)) return false;
    for (let i = 0; i < path.length; i++) {
      const cell = path[i];
      if (used.has(cell)) return false;
      used.add(cell);
      if (i > 0 && !areCellsAdjacent(path[i - 1], cell, board.size)) {
        return false;
      }
    }
  }
  return true;
};
