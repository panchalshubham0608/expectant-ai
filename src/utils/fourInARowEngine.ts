export type FourPlayer = 1 | 2;
export type FourCell = 0 | FourPlayer;

export const FOUR_ROWS = 6;
export const FOUR_COLS = 7;

export interface FourWinResult {
  winner: FourPlayer;
  line: readonly [number, number, number, number];
}

export const createEmptyFourBoard = (): FourCell[] =>
  Array.from({ length: FOUR_ROWS * FOUR_COLS }, () => 0);

export const getFourIndex = (row: number, col: number): number => row * FOUR_COLS + col;

export const getDropRow = (board: readonly FourCell[], col: number): number => {
  if (col < 0 || col >= FOUR_COLS) return -1;
  for (let r = FOUR_ROWS - 1; r >= 0; r--) {
    if (board[getFourIndex(r, col)] === 0) return r;
  }
  return -1;
};

export const dropFourDisc = (
  board: readonly FourCell[],
  col: number,
  player: FourPlayer
): { nextBoard: FourCell[]; row: number; index: number } | null => {
  const row = getDropRow(board, col);
  if (row === -1) return null;
  const index = getFourIndex(row, col);
  const nextBoard = [...board];
  nextBoard[index] = player;
  return { nextBoard, row, index };
};

export const isFourBoardFull = (board: readonly FourCell[]): boolean => {
  for (let c = 0; c < FOUR_COLS; c++) {
    if (board[c] === 0) return false;
  }
  return true;
};

const DIRECTIONS: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const findFourWinner = (board: readonly FourCell[]): FourWinResult | null => {
  for (let r = 0; r < FOUR_ROWS; r++) {
    for (let c = 0; c < FOUR_COLS; c++) {
      const start = board[getFourIndex(r, c)];
      if (start === 0) continue;

      for (const [dr, dc] of DIRECTIONS) {
        const r3 = r + dr * 3;
        const c3 = c + dc * 3;
        if (r3 < 0 || r3 >= FOUR_ROWS || c3 < 0 || c3 >= FOUR_COLS) continue;

        const i0 = getFourIndex(r, c);
        const i1 = getFourIndex(r + dr, c + dc);
        const i2 = getFourIndex(r + dr * 2, c + dc * 2);
        const i3 = getFourIndex(r3, c3);

        if (board[i1] === start && board[i2] === start && board[i3] === start) {
          return { winner: start, line: [i0, i1, i2, i3] };
        }
      }
    }
  }
  return null;
};

const scoreWindow = (
  a: FourCell,
  b: FourCell,
  c: FourCell,
  d: FourCell,
  bot: FourPlayer,
  opp: FourPlayer
): number => {
  let botCount = 0;
  let oppCount = 0;
  let emptyCount = 0;
  for (const cell of [a, b, c, d]) {
    if (cell === bot) botCount++;
    else if (cell === opp) oppCount++;
    else emptyCount++;
  }

  if (botCount === 4) return 10000;
  if (botCount === 3 && emptyCount === 1) return 18;
  if (botCount === 2 && emptyCount === 2) return 5;
  if (oppCount === 3 && emptyCount === 1) return -22;
  if (oppCount === 2 && emptyCount === 2) return -4;
  return 0;
};

const evaluateFourBoard = (board: readonly FourCell[], bot: FourPlayer): number => {
  const opp: FourPlayer = bot === 1 ? 2 : 1;
  let score = 0;

  // Prefer center column control
  const centerCol = Math.floor(FOUR_COLS / 2);
  for (let r = 0; r < FOUR_ROWS; r++) {
    const cell = board[getFourIndex(r, centerCol)];
    if (cell === bot) score += 6;
    else if (cell === opp) score -= 4;
  }

  for (let r = 0; r < FOUR_ROWS; r++) {
    for (let c = 0; c < FOUR_COLS; c++) {
      for (const [dr, dc] of DIRECTIONS) {
        const r3 = r + dr * 3;
        const c3 = c + dc * 3;
        if (r3 < 0 || r3 >= FOUR_ROWS || c3 < 0 || c3 >= FOUR_COLS) continue;
        score += scoreWindow(
          board[getFourIndex(r, c)],
          board[getFourIndex(r + dr, c + dc)],
          board[getFourIndex(r + dr * 2, c + dc * 2)],
          board[getFourIndex(r3, c3)],
          bot,
          opp
        );
      }
    }
  }

  return score;
};

const COL_ORDER = [3, 2, 4, 1, 5, 0, 6] as const;

const minimax = (
  board: FourCell[],
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  bot: FourPlayer
): number => {
  const opp: FourPlayer = bot === 1 ? 2 : 1;
  const win = findFourWinner(board);
  if (win) {
    return win.winner === bot ? 100000 + depth * 100 : -100000 - depth * 100;
  }
  if (depth === 0 || isFourBoardFull(board)) {
    return evaluateFourBoard(board, bot);
  }

  let a = alpha;
  let b = beta;

  if (maximizing) {
    let best = -Infinity;
    for (const col of COL_ORDER) {
      const row = getDropRow(board, col);
      if (row === -1) continue;
      const idx = getFourIndex(row, col);
      board[idx] = bot;
      const val = minimax(board, depth - 1, a, b, false, bot);
      board[idx] = 0;
      if (val > best) best = val;
      if (best > a) a = best;
      if (a >= b) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const col of COL_ORDER) {
      const row = getDropRow(board, col);
      if (row === -1) continue;
      const idx = getFourIndex(row, col);
      board[idx] = opp;
      const val = minimax(board, depth - 1, a, b, true, bot);
      board[idx] = 0;
      if (val < best) best = val;
      if (best < b) b = best;
      if (a >= b) break;
    }
    return best;
  }
};

export const pickFourBotMove = (
  board: readonly FourCell[],
  bot: FourPlayer,
  sessionSolvedCount = 0
): number => {
  const validCols = COL_ORDER.filter((col) => getDropRow(board, col) !== -1);
  if (validCols.length === 0) return -1;

  const opp: FourPlayer = bot === 1 ? 2 : 1;

  // Immediate win check
  for (const col of validCols) {
    const res = dropFourDisc(board, col, bot);
    if (res && findFourWinner(res.nextBoard)?.winner === bot) return col;
  }

  // Immediate block check
  for (const col of validCols) {
    const res = dropFourDisc(board, col, opp);
    if (res && findFourWinner(res.nextBoard)?.winner === opp) return col;
  }

  const depth = sessionSolvedCount < 2 ? 2 : sessionSolvedCount < 5 ? 3 : 4;
  const workBoard = [...board];
  const scored: { col: number; score: number }[] = [];

  for (const col of validCols) {
    const row = getDropRow(workBoard, col);
    const idx = getFourIndex(row, col);
    workBoard[idx] = bot;
    const score = minimax(workBoard, depth - 1, -Infinity, Infinity, false, bot);
    workBoard[idx] = 0;
    scored.push({ col, score });
  }

  scored.sort((x, y) => y.score - x.score);
  const bestScore = scored[0].score;
  const tolerance = sessionSolvedCount < 2 ? 10 : 2;
  const topPool = scored.filter((item) => item.score >= bestScore - tolerance);
  return topPool[Math.floor(Math.random() * topPool.length)].col;
};
