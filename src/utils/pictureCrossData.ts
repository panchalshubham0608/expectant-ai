export type PictureCrossSize = 5 | 6;
export type PictureCrossDifficulty = 'gentle' | 'cozy' | 'classic';

export interface PictureCrossPuzzle {
  id: string;
  name: string;
  emoji: string;
  size: PictureCrossSize;
  difficulty: PictureCrossDifficulty;
  revealColor: string;
  solution: readonly boolean[];
  rowClues: readonly (readonly number[])[];
  colClues: readonly (readonly number[])[];
}

export interface PictureCrossSessionTier {
  level: number;
  label: string;
  size: PictureCrossSize;
  difficulty: PictureCrossDifficulty;
}

interface RawPatternSpec {
  id: string;
  name: string;
  emoji: string;
  size: PictureCrossSize;
  difficulty: PictureCrossDifficulty;
  revealColor: string;
  rows: readonly string[];
}

export const computeLineClues = (cells: readonly boolean[]): number[] => {
  const clues: number[] = [];
  let run = 0;
  for (const filled of cells) {
    if (filled) {
      run++;
    } else if (run > 0) {
      clues.push(run);
      run = 0;
    }
  }
  if (run > 0) clues.push(run);
  return clues.length > 0 ? clues : [0];
};

export const areCluesEqual = (
  a: readonly number[],
  b: readonly number[]
): boolean => a.length === b.length && a.every((val, idx) => val === b[idx]);

const buildPuzzle = (spec: RawPatternSpec): PictureCrossPuzzle => {
  const { size, rows } = spec;
  const solution: boolean[] = [];

  for (let r = 0; r < size; r++) {
    const line = rows[r] ?? '';
    for (let c = 0; c < size; c++) {
      solution.push(line[c] === '#');
    }
  }

  const rowClues: number[][] = [];
  for (let r = 0; r < size; r++) {
    const slice = solution.slice(r * size, (r + 1) * size);
    rowClues.push(computeLineClues(slice));
  }

  const colClues: number[][] = [];
  for (let c = 0; c < size; c++) {
    const col: boolean[] = [];
    for (let r = 0; r < size; r++) {
      col.push(solution[r * size + c]);
    }
    colClues.push(computeLineClues(col));
  }

  return {
    id: spec.id,
    name: spec.name,
    emoji: spec.emoji,
    size: spec.size,
    difficulty: spec.difficulty,
    revealColor: spec.revealColor,
    solution,
    rowClues,
    colClues,
  };
};

const RAW_PATTERNS: readonly RawPatternSpec[] = [
  // ---------- 5x5 GENTLE ----------
  {
    id: 'sweet-heart',
    name: 'Sweet Heart',
    emoji: '🩷',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#f43f5e',
    rows: [
      '.#.#.',
      '#####',
      '#####',
      '.###.',
      '..#..',
    ],
  },
  {
    id: 'cozy-house',
    name: 'Cozy Home',
    emoji: '🏡',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#f59e0b',
    rows: [
      '..#..',
      '.###.',
      '#####',
      '.###.',
      '.#.#.',
    ],
  },
  {
    id: 'little-sprout',
    name: 'Little Sprout',
    emoji: '🌱',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#10b981',
    rows: [
      '.#.#.',
      '#####',
      '..#..',
      '..#..',
      '.###.',
    ],
  },
  {
    id: 'happy-cloud',
    name: 'Fluffy Cloud',
    emoji: '☁️',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#38bdf8',
    rows: [
      '..#..',
      '.###.',
      '#####',
      '#####',
      '.....',
    ],
  },
  {
    id: 'umbrella',
    name: 'Cozy Umbrella',
    emoji: '☂️',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#8b5cf6',
    rows: [
      '.###.',
      '#####',
      '..#..',
      '..#..',
      '.##..',
    ],
  },
  {
    id: 'baby-sock',
    name: 'Tiny Bootie',
    emoji: '🧦',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#ec4899',
    rows: [
      '.##..',
      '.##..',
      '.##..',
      '.####',
      '.####',
    ],
  },
  {
    id: 'apple',
    name: 'Crisp Apple',
    emoji: '🍎',
    size: 5,
    difficulty: 'gentle',
    revealColor: '#ef4444',
    rows: [
      '..#..',
      '.###.',
      '#####',
      '#####',
      '.###.',
    ],
  },

  // ---------- 5x5 COZY ----------
  {
    id: 'warm-teacup',
    name: 'Warm Teacup',
    emoji: '🍵',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#14b8a6',
    rows: [
      '.#.#.',
      '####.',
      '#####',
      '####.',
      '.###.',
    ],
  },
  {
    id: 'crescent-moon',
    name: 'Crescent Moon',
    emoji: '🌙',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#eab308',
    rows: [
      '..###',
      '.##..',
      '.##..',
      '.##..',
      '..###',
    ],
  },
  {
    id: 'tiny-sailboat',
    name: 'Tiny Sailboat',
    emoji: '⛵',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#3b82f6',
    rows: [
      '..#..',
      '.##..',
      '###..',
      '#####',
      '.###.',
    ],
  },
  {
    id: 'baby-duckling',
    name: 'Little Duckling',
    emoji: '🐥',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#f59e0b',
    rows: [
      '.##..',
      '###..',
      '.####',
      '.###.',
      '..#..',
    ],
  },
  {
    id: 'butterfly-5',
    name: 'Butterfly',
    emoji: '🦋',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#a855f7',
    rows: [
      '##.##',
      '#####',
      '.###.',
      '#####',
      '##.##',
    ],
  },
  {
    id: 'sunny-smile',
    name: 'Happy Smile',
    emoji: '😊',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#f97316',
    rows: [
      '.#.#.',
      '.#.#.',
      '.....',
      '#...#',
      '.###.',
    ],
  },
  {
    id: 'star-blossom',
    name: 'Star Blossom',
    emoji: '🌸',
    size: 5,
    difficulty: 'cozy',
    revealColor: '#f472b6',
    rows: [
      '..#..',
      '.###.',
      '#####',
      '.###.',
      '..#..',
    ],
  },

  // ---------- 6x6 CLASSIC ----------
  {
    id: 'sleeping-cat',
    name: 'Cozy Kitty',
    emoji: '🐱',
    size: 6,
    difficulty: 'classic',
    revealColor: '#8b5cf6',
    rows: [
      '#....#',
      '##..##',
      '######',
      '#.###.',
      '######',
      '.####.',
    ],
  },
  {
    id: 'little-whale-6',
    name: 'Baby Whale',
    emoji: '🐳',
    size: 6,
    difficulty: 'classic',
    revealColor: '#0ea5e9',
    rows: [
      '..#...',
      '.....#',
      '.#####',
      '######',
      '#####.',
      '.###..',
    ],
  },
  {
    id: 'potted-tulip',
    name: 'Potted Tulip',
    emoji: '🌷',
    size: 6,
    difficulty: 'classic',
    revealColor: '#ec4899',
    rows: [
      '.#.#.#',
      '.#####',
      '..###.',
      '...#..',
      '.#####',
      '..###.',
    ],
  },
  {
    id: 'teddy-face',
    name: 'Teddy Face',
    emoji: '🧸',
    size: 6,
    difficulty: 'classic',
    revealColor: '#d97706',
    rows: [
      '##..##',
      '######',
      '.####.',
      '######',
      '######',
      '.####.',
    ],
  },
  {
    id: 'crown-6',
    name: 'Little Crown',
    emoji: '👑',
    size: 6,
    difficulty: 'classic',
    revealColor: '#eab308',
    rows: [
      '......',
      '#.##.#',
      '######',
      '######',
      '.####.',
      '.####.',
    ],
  },
  {
    id: 'rainbow-arch',
    name: 'Rainbow Arch',
    emoji: '🌈',
    size: 6,
    difficulty: 'classic',
    revealColor: '#6366f1',
    rows: [
      '.####.',
      '######',
      '##..##',
      '##..##',
      '##..##',
      '......',
    ],
  },
  {
    id: 'smiling-sun',
    name: 'Warm Sun',
    emoji: '☀️',
    size: 6,
    difficulty: 'classic',
    revealColor: '#f59e0b',
    rows: [
      '..##..',
      '.####.',
      '######',
      '######',
      '.####.',
      '..##..',
    ],
  },
  {
    id: 'paper-plane',
    name: 'Paper Plane',
    emoji: '✈️',
    size: 6,
    difficulty: 'classic',
    revealColor: '#14b8a6',
    rows: [
      '....##',
      '..####',
      '######',
      '..###.',
      '..##..',
      '..#...',
    ],
  },
];

export const PICTURE_CROSS_PUZZLES: readonly PictureCrossPuzzle[] = RAW_PATTERNS.map(buildPuzzle);

export const getPictureCrossTierForSolvedCount = (
  solvedCount: number
): PictureCrossSessionTier => {
  if (solvedCount < 2) {
    return { level: 1, label: 'Gentle 5×5', size: 5, difficulty: 'gentle' };
  }
  if (solvedCount < 4) {
    return { level: 2, label: 'Cozy 5×5', size: 5, difficulty: 'cozy' };
  }
  return { level: 3, label: 'Classic 6×6', size: 6, difficulty: 'classic' };
};

export const pickPictureCrossPuzzle = (
  size: PictureCrossSize,
  options: { difficulty?: PictureCrossDifficulty; excludeId?: string } = {}
): PictureCrossPuzzle => {
  const bySize = PICTURE_CROSS_PUZZLES.filter((p) => p.size === size);
  const byDifficulty = options.difficulty
    ? bySize.filter((p) => p.difficulty === options.difficulty)
    : bySize;
  const pool = byDifficulty.length > 0 ? byDifficulty : bySize;
  const filtered =
    pool.length > 1 && options.excludeId
      ? pool.filter((p) => p.id !== options.excludeId)
      : pool;
  return filtered[Math.floor(Math.random() * filtered.length)] ?? PICTURE_CROSS_PUZZLES[0];
};

export const isRowClueSatisfied = (
  filled: readonly boolean[],
  puzzle: PictureCrossPuzzle,
  row: number
): boolean => {
  const start = row * puzzle.size;
  const slice = filled.slice(start, start + puzzle.size);
  return areCluesEqual(computeLineClues(slice), puzzle.rowClues[row]);
};

export const isColClueSatisfied = (
  filled: readonly boolean[],
  puzzle: PictureCrossPuzzle,
  col: number
): boolean => {
  const line: boolean[] = [];
  for (let r = 0; r < puzzle.size; r++) {
    line.push(filled[r * puzzle.size + col]);
  }
  return areCluesEqual(computeLineClues(line), puzzle.colClues[col]);
};

export const isPictureCrossSolved = (
  filled: readonly boolean[],
  puzzle: PictureCrossPuzzle
): boolean => {
  for (let r = 0; r < puzzle.size; r++) {
    if (!isRowClueSatisfied(filled, puzzle, r)) return false;
  }
  for (let c = 0; c < puzzle.size; c++) {
    if (!isColClueSatisfied(filled, puzzle, c)) return false;
  }
  return true;
};

export interface PictureCrossHint {
  index: number;
  shouldBeFilled: boolean;
}

export const findPictureCrossHint = (
  filled: readonly boolean[],
  puzzle: PictureCrossPuzzle
): PictureCrossHint | null => {
  // First gently correct any stray filled square
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (filled[i] && !puzzle.solution[i]) {
      return { index: i, shouldBeFilled: false };
    }
  }
  // Then gently fill a missing target square
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (!filled[i] && puzzle.solution[i]) {
      return { index: i, shouldBeFilled: true };
    }
  }
  return null;
};
