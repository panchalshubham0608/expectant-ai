export type DotsPlayer = 1 | 2;
export type DotsBoxOwner = 0 | DotsPlayer;
export type DotsGridSize = 3 | 4 | 5;

export interface DotsEdge {
  orientation: 'h' | 'v';
  row: number;
  col: number;
}

export interface DotsBoardState {
  size: DotsGridSize;
  /** Horizontal lines: (size + 1) rows x size cols, owner 0 | 1 | 2 */
  hLines: DotsBoxOwner[];
  /** Vertical lines: size rows x (size + 1) cols, owner 0 | 1 | 2 */
  vLines: DotsBoxOwner[];
  /** Claimed boxes: size x size */
  boxes: DotsBoxOwner[];
}

export interface DotsMoveResult {
  nextState: DotsBoardState;
  claimedCount: number;
  claimedIndices: number[];
}

export const createDotsBoard = (size: DotsGridSize): DotsBoardState => ({
  size,
  hLines: Array.from({ length: (size + 1) * size }, () => 0),
  vLines: Array.from({ length: size * (size + 1) }, () => 0),
  boxes: Array.from({ length: size * size }, () => 0),
});

export const getHEdgeIndex = (size: DotsGridSize, row: number, col: number): number =>
  row * size + col;

export const getVEdgeIndex = (size: DotsGridSize, row: number, col: number): number =>
  row * (size + 1) + col;

export const getEdgeKey = (edge: DotsEdge): string =>
  `${edge.orientation}-${edge.row}-${edge.col}`;

export const countBoxSides = (
  state: DotsBoardState,
  boxRow: number,
  boxCol: number
): number => {
  const { size, hLines, vLines } = state;
  let count = 0;
  if (hLines[getHEdgeIndex(size, boxRow, boxCol)] !== 0) count++;
  if (hLines[getHEdgeIndex(size, boxRow + 1, boxCol)] !== 0) count++;
  if (vLines[getVEdgeIndex(size, boxRow, boxCol)] !== 0) count++;
  if (vLines[getVEdgeIndex(size, boxRow, boxCol + 1)] !== 0) count++;
  return count;
};

export const applyDotsMove = (
  state: DotsBoardState,
  edge: DotsEdge,
  player: DotsPlayer
): DotsMoveResult | null => {
  const { size } = state;
  const hLines = [...state.hLines];
  const vLines = [...state.vLines];
  const boxes = [...state.boxes];

  if (edge.orientation === 'h') {
    const idx = getHEdgeIndex(size, edge.row, edge.col);
    if (hLines[idx] !== 0) return null;
    hLines[idx] = player;
  } else {
    const idx = getVEdgeIndex(size, edge.row, edge.col);
    if (vLines[idx] !== 0) return null;
    vLines[idx] = player;
  }

  const nextState: DotsBoardState = { size, hLines, vLines, boxes };
  const candidateBoxes: [number, number][] = [];

  if (edge.orientation === 'h') {
    if (edge.row > 0) candidateBoxes.push([edge.row - 1, edge.col]);
    if (edge.row < size) candidateBoxes.push([edge.row, edge.col]);
  } else {
    if (edge.col > 0) candidateBoxes.push([edge.row, edge.col - 1]);
    if (edge.col < size) candidateBoxes.push([edge.row, edge.col]);
  }

  const claimedIndices: number[] = [];
  for (const [br, bc] of candidateBoxes) {
    const bIdx = br * size + bc;
    if (boxes[bIdx] === 0 && countBoxSides(nextState, br, bc) === 4) {
      boxes[bIdx] = player;
      claimedIndices.push(bIdx);
    }
  }

  return {
    nextState,
    claimedCount: claimedIndices.length,
    claimedIndices,
  };
};

export const getAvailableDotsEdges = (state: DotsBoardState): DotsEdge[] => {
  const { size, hLines, vLines } = state;
  const edges: DotsEdge[] = [];

  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) {
      if (hLines[getHEdgeIndex(size, r, c)] === 0) {
        edges.push({ orientation: 'h', row: r, col: c });
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) {
      if (vLines[getVEdgeIndex(size, r, c)] === 0) {
        edges.push({ orientation: 'v', row: r, col: c });
      }
    }
  }

  return edges;
};

export const countDotsScores = (state: DotsBoardState): { p1: number; p2: number; remaining: number } => {
  let p1 = 0;
  let p2 = 0;
  let remaining = 0;
  for (const owner of state.boxes) {
    if (owner === 1) p1++;
    else if (owner === 2) p2++;
    else remaining++;
  }
  return { p1, p2, remaining };
};

const simulateChainGain = (state: DotsBoardState, player: DotsPlayer): number => {
  let current = state;
  let totalClaimed = 0;
  for (let guard = 0; guard < state.size * state.size; guard++) {
    const avail = getAvailableDotsEdges(current);
    let tookBox = false;
    for (const edge of avail) {
      const res = applyDotsMove(current, edge, player);
      if (res && res.claimedCount > 0) {
        current = res.nextState;
        totalClaimed += res.claimedCount;
        tookBox = true;
        break;
      }
    }
    if (!tookBox) break;
  }
  return totalClaimed;
};

export const pickDotsBotMove = (
  state: DotsBoardState,
  bot: DotsPlayer,
  sessionSolvedCount = 0
): DotsEdge | null => {
  const available = getAvailableDotsEdges(state);
  if (available.length === 0) return null;

  // 1. Always take any edge that immediately completes 1 or 2 boxes
  const scoringEdges: { edge: DotsEdge; count: number }[] = [];
  for (const edge of available) {
    const res = applyDotsMove(state, edge, bot);
    if (res && res.claimedCount > 0) {
      scoringEdges.push({ edge, count: res.claimedCount });
    }
  }
  if (scoringEdges.length > 0) {
    scoringEdges.sort((a, b) => b.count - a.count);
    return scoringEdges[0].edge;
  }

  // 2. Prefer safe edges that don't leave a 3-sided box for the opponent
  const safeEdges: DotsEdge[] = [];
  const riskyEdges: { edge: DotsEdge; oppChain: number }[] = [];
  const opp: DotsPlayer = bot === 1 ? 2 : 1;

  for (const edge of available) {
    const res = applyDotsMove(state, edge, bot);
    if (!res) continue;

    let createsThirdSide = false;
    const adjacent: [number, number][] = [];
    if (edge.orientation === 'h') {
      if (edge.row > 0) adjacent.push([edge.row - 1, edge.col]);
      if (edge.row < state.size) adjacent.push([edge.row, edge.col]);
    } else {
      if (edge.col > 0) adjacent.push([edge.row, edge.col - 1]);
      if (edge.col < state.size) adjacent.push([edge.row, edge.col]);
    }

    for (const [br, bc] of adjacent) {
      if (countBoxSides(res.nextState, br, bc) === 3) {
        createsThirdSide = true;
      }
    }

    if (!createsThirdSide) {
      safeEdges.push(edge);
    } else {
      const oppChain = sessionSolvedCount >= 2 ? simulateChainGain(res.nextState, opp) : 1;
      riskyEdges.push({ edge, oppChain });
    }
  }

  if (safeEdges.length > 0) {
    return safeEdges[Math.floor(Math.random() * safeEdges.length)];
  }

  // 3. Forced to open a chain: pick the smallest sacrifice
  riskyEdges.sort((a, b) => a.oppChain - b.oppChain);
  const minLoss = riskyEdges[0].oppChain;
  const bestRisky = riskyEdges.filter((r) => r.oppChain === minLoss);
  return bestRisky[Math.floor(Math.random() * bestRisky.length)].edge;
};
