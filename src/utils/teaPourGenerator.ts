export type TeaPourDifficulty = 4 | 5 | 6 | 7 | 8;

export interface TeaPourSessionTier {
  level: 1 | 2 | 3 | 4 | 5;
  label: string;
  difficulty: TeaPourDifficulty;
  strictMix: boolean;
}

export const getTeaPourTierForSolvedCount = (solvedCount: number): TeaPourSessionTier => {
  if (solvedCount < 2) {
    return { level: 1, label: 'Gentle Blend', difficulty: 4, strictMix: false };
  }
  if (solvedCount < 4) {
    return { level: 2, label: 'Warm Infusion', difficulty: 5, strictMix: false };
  }
  if (solvedCount < 6) {
    return { level: 3, label: 'Cozy Palette', difficulty: 6, strictMix: true };
  }
  if (solvedCount < 9) {
    return { level: 4, label: 'Botanical Mix', difficulty: 7, strictMix: true };
  }
  return { level: 5, label: 'Master Apothecary', difficulty: 8, strictMix: true };
};

export type TeaColorId =
  | 'chamomile'
  | 'lavender'
  | 'mint'
  | 'rosehip'
  | 'blueberry'
  | 'peach'
  | 'matcha'
  | 'hibiscus';

export interface TeaColorSpec {
  id: TeaColorId;
  label: string;
  hex: string;
  highlightHex: string;
}

export const TEA_JAR_CAPACITY = 4;

// Hardcoded soothing herbal tea & watercolor shade allow-list
export const TEA_COLORS: readonly TeaColorSpec[] = [
  { id: 'chamomile', label: 'Chamomile', hex: '#fbbf24', highlightHex: '#fde68a' },
  { id: 'lavender', label: 'Lavender', hex: '#a78bfa', highlightHex: '#ddd6fe' },
  { id: 'mint', label: 'Mint Leaf', hex: '#34d399', highlightHex: '#a7f3d0' },
  { id: 'rosehip', label: 'Rosehip', hex: '#fb7185', highlightHex: '#fecdd3' },
  { id: 'blueberry', label: 'Blueberry', hex: '#60a5fa', highlightHex: '#bfdbfe' },
  { id: 'peach', label: 'Peach', hex: '#fb923c', highlightHex: '#fed7aa' },
  { id: 'matcha', label: 'Matcha', hex: '#84cc16', highlightHex: '#d9f99d' },
  { id: 'hibiscus', label: 'Hibiscus', hex: '#c084fc', highlightHex: '#f3e8ff' },
] as const;

export const TEA_COLOR_BY_ID: ReadonlyMap<TeaColorId, TeaColorSpec> = new Map(
  TEA_COLORS.map((c) => [c.id, c])
);

export const ALLOWED_TEA_COLOR_IDS: ReadonlySet<string> = new Set(TEA_COLORS.map((c) => c.id));

export type TeaJar = TeaColorId[];

export interface TeaPourMove {
  from: number;
  to: number;
}

const shuffle = <T,>(items: readonly T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export const isJarMonochrome = (jar: readonly TeaColorId[]): boolean =>
  jar.length > 0 && jar.every((c) => c === jar[0]);

export const isJarComplete = (jar: readonly TeaColorId[]): boolean =>
  jar.length === TEA_JAR_CAPACITY && isJarMonochrome(jar);

export const isTeaPourSolved = (jars: readonly TeaJar[]): boolean =>
  jars.every((jar) => jar.length === 0 || isJarComplete(jar));

export const canPourJar = (
  jars: readonly TeaJar[],
  fromIdx: number,
  toIdx: number
): boolean => {
  if (fromIdx === toIdx) return false;
  const from = jars[fromIdx];
  const to = jars[toIdx];
  if (!from || !to) return false;
  if (from.length === 0 || to.length >= TEA_JAR_CAPACITY) return false;
  if (to.length === 0) return true;
  return to[to.length - 1] === from[from.length - 1];
};

export const countTopRun = (jar: readonly TeaColorId[]): number => {
  if (jar.length === 0) return 0;
  const top = jar[jar.length - 1];
  let count = 1;
  for (let i = jar.length - 2; i >= 0; i--) {
    if (jar[i] === top) count++;
    else break;
  }
  return count;
};

export const applyTeaPour = (
  jars: readonly TeaJar[],
  fromIdx: number,
  toIdx: number
): { nextJars: TeaJar[]; pouredCount: number } | null => {
  if (!canPourJar(jars, fromIdx, toIdx)) return null;

  const nextJars = jars.map((jar) => [...jar]);
  const from = nextJars[fromIdx];
  const to = nextJars[toIdx];
  const topColor = from[from.length - 1];
  let pouredCount = 0;

  while (
    from.length > 0 &&
    to.length < TEA_JAR_CAPACITY &&
    from[from.length - 1] === topColor
  ) {
    const popped = from.pop();
    if (!popped) break;
    to.push(popped);
    pouredCount++;
  }

  return { nextJars, pouredCount };
};

export const hasAnyValidTeaPour = (jars: readonly TeaJar[]): boolean => {
  for (let i = 0; i < jars.length; i++) {
    if (jars[i].length === 0 || isJarComplete(jars[i])) continue;
    for (let j = 0; j < jars.length; j++) {
      if (canPourJar(jars, i, j)) {
        // Ignore pouring a pure monochrome jar into an empty jar as it makes no real progress
        if (jars[j].length === 0 && isJarMonochrome(jars[i])) continue;
        return true;
      }
    }
  }
  return false;
};

const canonicalStateKey = (jars: readonly TeaJar[]): string =>
  jars
    .map((jar) => jar.join(','))
    .sort()
    .join('|');

const getCandidateMoves = (jars: readonly TeaJar[]): TeaPourMove[] => {
  const priorityMoves: TeaPourMove[] = [];
  const secondaryMoves: TeaPourMove[] = [];
  let usedEmptyTarget = false;

  for (let from = 0; from < jars.length; from++) {
    const src = jars[from];
    if (src.length === 0 || isJarComplete(src)) continue;
    const srcMono = isJarMonochrome(src);
    const srcRun = countTopRun(src);

    for (let to = 0; to < jars.length; to++) {
      if (!canPourJar(jars, from, to)) continue;
      const dst = jars[to];

      if (dst.length === 0) {
        if (srcMono || usedEmptyTarget) continue;
        usedEmptyTarget = true;
        secondaryMoves.push({ from, to });
      } else {
        const freeSpace = TEA_JAR_CAPACITY - dst.length;
        const dstMono = isJarMonochrome(dst);
        // Strongly prefer moves that complete or cleanly consolidate monochrome jars
        if (dstMono && srcRun <= freeSpace) {
          priorityMoves.push({ from, to });
        } else if (srcRun <= freeSpace) {
          secondaryMoves.unshift({ from, to });
        } else {
          secondaryMoves.push({ from, to });
        }
      }
    }
  }

  return [...priorityMoves, ...secondaryMoves];
};

/**
 * Fast bounded DFS solver returning the first move on a verified winning path,
 * or null if unsolvable within the search budget.
 */
export const findTeaPourHint = (
  initialJars: readonly TeaJar[],
  maxVisited: number = 8000
): TeaPourMove | null => {
  if (isTeaPourSolved(initialJars)) return null;

  const visited = new Set<string>([canonicalStateKey(initialJars)]);
  let visitedCount = 1;

  const dfs = (jars: readonly TeaJar[], depth: number): TeaPourMove | null => {
    if (depth > 64 || visitedCount >= maxVisited) return null;

    const moves = getCandidateMoves(jars);
    for (const move of moves) {
      const applied = applyTeaPour(jars, move.from, move.to);
      if (!applied) continue;

      if (isTeaPourSolved(applied.nextJars)) {
        return move;
      }

      const key = canonicalStateKey(applied.nextJars);
      if (visited.has(key)) continue;
      visited.add(key);
      visitedCount++;

      if (dfs(applied.nextJars, depth + 1) !== null) {
        return move;
      }

      if (visitedCount >= maxVisited) return null;
    }

    return null;
  };

  return dfs(initialJars, 0);
};

export const generateTeaPourPuzzle = (
  colorCount: TeaPourDifficulty,
  strictMix: boolean = false
): TeaJar[] => {
  const chosenColors = shuffle(TEA_COLORS)
    .slice(0, colorCount)
    .map((c) => c.id);

  for (let attempt = 0; attempt < 70; attempt++) {
    const pool: TeaColorId[] = [];
    for (const color of chosenColors) {
      for (let k = 0; k < TEA_JAR_CAPACITY; k++) {
        pool.push(color);
      }
    }
    const mixed = shuffle(pool);
    const jars: TeaJar[] = [];
    for (let j = 0; j < colorCount; j++) {
      jars.push(mixed.slice(j * TEA_JAR_CAPACITY, (j + 1) * TEA_JAR_CAPACITY));
    }
    // Always include 2 empty jars for relaxed, comfortable solving
    jars.push([], []);

    // Reject if any jar starts already complete or nearly complete;
    // at higher levels (strictMix) also prefer jars with fewer stacked duplicates.
    const hasTrivialJar = jars.some((jar) => {
      if (isJarComplete(jar)) return true;
      if (jar.length === TEA_JAR_CAPACITY && countTopRun(jar) >= 3) return true;
      if (strictMix && jar.length === TEA_JAR_CAPACITY) {
        const distinct = new Set(jar).size;
        if (distinct <= 2 && attempt < 40) return true;
      }
      return false;
    });
    if (hasTrivialJar) continue;

    // Prove solvability before serving to the user
    if (findTeaPourHint(jars, 5500) !== null) {
      return jars;
    }
  }

  // Deterministic guaranteed-solvable fallback
  const fallback: TeaJar[] = [];
  for (let j = 0; j < colorCount; j++) {
    fallback.push([
      chosenColors[j],
      chosenColors[(j + 1) % colorCount],
      chosenColors[(j + 2) % colorCount],
      chosenColors[(j + 3) % colorCount],
    ]);
  }
  fallback.push([], []);
  return fallback;
};
