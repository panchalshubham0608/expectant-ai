export type MancalaPlayer = 1 | 2;

export const P1_STORE = 6;
export const P2_STORE = 13;

export const createInitialMancalaPits = (stonesPerPit = 4): number[] => [
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  0, // P1 store (6)
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  stonesPerPit,
  0, // P2 store (13)
];

export const isPlayersPit = (pitIndex: number, player: MancalaPlayer): boolean =>
  player === 1 ? pitIndex >= 0 && pitIndex <= 5 : pitIndex >= 7 && pitIndex <= 12;

export const getValidMancalaPits = (
  pits: readonly number[],
  player: MancalaPlayer
): number[] => {
  const start = player === 1 ? 0 : 7;
  const valid: number[] = [];
  for (let i = start; i < start + 6; i++) {
    if (pits[i] > 0) valid.push(i);
  }
  return valid;
};

export interface MancalaMoveResult {
  nextPits: number[];
  nextTurn: MancalaPlayer | null;
  extraTurn: boolean;
  capturedCount: number;
  lastPit: number;
  isGameOver: boolean;
}

export const applyMancalaMove = (
  pits: readonly number[],
  pitIndex: number,
  player: MancalaPlayer
): MancalaMoveResult | null => {
  if (!isPlayersPit(pitIndex, player) || pits[pitIndex] <= 0) return null;

  const nextPits = [...pits];
  let stones = nextPits[pitIndex];
  nextPits[pitIndex] = 0;

  const ownStore = player === 1 ? P1_STORE : P2_STORE;
  const oppStore = player === 1 ? P2_STORE : P1_STORE;

  let idx = pitIndex;
  while (stones > 0) {
    idx = (idx + 1) % 14;
    if (idx === oppStore) continue;
    nextPits[idx] += 1;
    stones -= 1;
  }

  let capturedCount = 0;
  // Capture rule: last stone lands in an empty pit on own side, opposite pit has stones
  if (isPlayersPit(idx, player) && nextPits[idx] === 1) {
    const oppIdx = 12 - idx;
    if (nextPits[oppIdx] > 0) {
      capturedCount = nextPits[oppIdx] + 1;
      nextPits[ownStore] += capturedCount;
      nextPits[idx] = 0;
      nextPits[oppIdx] = 0;
    }
  }

  const p1SideSum = nextPits.slice(0, 6).reduce((a, b) => a + b, 0);
  const p2SideSum = nextPits.slice(7, 13).reduce((a, b) => a + b, 0);

  if (p1SideSum === 0 || p2SideSum === 0) {
    nextPits[P1_STORE] += p1SideSum;
    nextPits[P2_STORE] += p2SideSum;
    for (let i = 0; i < 6; i++) nextPits[i] = 0;
    for (let i = 7; i < 13; i++) nextPits[i] = 0;

    return {
      nextPits,
      nextTurn: null,
      extraTurn: false,
      capturedCount,
      lastPit: idx,
      isGameOver: true,
    };
  }

  const extraTurn = idx === ownStore;
  const opp: MancalaPlayer = player === 1 ? 2 : 1;

  return {
    nextPits,
    nextTurn: extraTurn ? player : opp,
    extraTurn,
    capturedCount,
    lastPit: idx,
    isGameOver: false,
  };
};

const evaluateMancala = (pits: readonly number[], bot: MancalaPlayer): number => {
  const ownStore = bot === 1 ? P1_STORE : P2_STORE;
  const oppStore = bot === 1 ? P2_STORE : P1_STORE;
  const ownSideSum = (bot === 1 ? pits.slice(0, 6) : pits.slice(7, 13)).reduce((a, b) => a + b, 0);
  const oppSideSum = (bot === 1 ? pits.slice(7, 13) : pits.slice(0, 6)).reduce((a, b) => a + b, 0);

  return (pits[ownStore] - pits[oppStore]) * 10 + (ownSideSum - oppSideSum) * 2;
};

const minimaxMancala = (
  pits: readonly number[],
  depth: number,
  alpha: number,
  beta: number,
  turn: MancalaPlayer,
  bot: MancalaPlayer
): number => {
  const valid = getValidMancalaPits(pits, turn);
  if (depth === 0 || valid.length === 0) {
    return evaluateMancala(pits, bot);
  }

  const isMax = turn === bot;
  let a = alpha;
  let b = beta;

  if (isMax) {
    let best = -Infinity;
    for (const pit of valid) {
      const res = applyMancalaMove(pits, pit, turn);
      if (!res) continue;
      const val = res.isGameOver || res.nextTurn === null
        ? evaluateMancala(res.nextPits, bot) * 5
        : minimaxMancala(
            res.nextPits,
            res.extraTurn ? depth - 1 : depth - 1,
            a,
            b,
            res.nextTurn,
            bot
          );
      if (val > best) best = val;
      if (best > a) a = best;
      if (a >= b) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const pit of valid) {
      const res = applyMancalaMove(pits, pit, turn);
      if (!res) continue;
      const val = res.isGameOver || res.nextTurn === null
        ? evaluateMancala(res.nextPits, bot) * 5
        : minimaxMancala(res.nextPits, depth - 1, a, b, res.nextTurn, bot);
      if (val < best) best = val;
      if (best < b) b = best;
      if (a >= b) break;
    }
    return best;
  }
};

export const pickMancalaBotMove = (
  pits: readonly number[],
  bot: MancalaPlayer,
  sessionSolvedCount = 0
): number => {
  const valid = getValidMancalaPits(pits, bot);
  if (valid.length === 0) return -1;
  if (valid.length === 1) return valid[0];

  const depth = sessionSolvedCount < 2 ? 2 : sessionSolvedCount < 5 ? 3 : 4;
  const scored: { pit: number; score: number }[] = [];

  for (const pit of valid) {
    const res = applyMancalaMove(pits, pit, bot);
    if (!res) continue;
    const score = res.isGameOver || res.nextTurn === null
      ? evaluateMancala(res.nextPits, bot) * 5
      : minimaxMancala(res.nextPits, depth - 1, -Infinity, Infinity, res.nextTurn, bot) +
        (res.extraTurn ? 6 : 0) +
        res.capturedCount * 3;
    scored.push({ pit, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  const tolerance = sessionSolvedCount < 2 ? 8 : 2;
  const pool = scored.filter((item) => item.score >= best - tolerance);
  return pool[Math.floor(Math.random() * pool.length)].pit;
};
