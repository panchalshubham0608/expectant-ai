export type ReversiPlayer = 1 | 2;
export type ReversiCell = 0 | ReversiPlayer;
export type ReversiSize = 6 | 8;

const DIRS_8: readonly [number, number][] = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
];

export const createInitialReversiBoard = (size: ReversiSize): ReversiCell[] => {
  const board: ReversiCell[] = Array.from({ length: size * size }, () => 0);
  const mid = size / 2;
  board[(mid - 1) * size + (mid - 1)] = 2;
  board[(mid - 1) * size + mid] = 1;
  board[mid * size + (mid - 1)] = 1;
  board[mid * size + mid] = 2;
  return board;
};

export const getReversiFlips = (
  board: readonly ReversiCell[],
  size: ReversiSize,
  index: number,
  player: ReversiPlayer
): number[] => {
  if (board[index] !== 0) return [];
  const opp: ReversiPlayer = player === 1 ? 2 : 1;
  const row = Math.floor(index / size);
  const col = index % size;
  const flips: number[] = [];

  for (const [dr, dc] of DIRS_8) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < size && c >= 0 && c < size) {
      const idx = r * size + c;
      const cell = board[idx];
      if (cell === opp) {
        line.push(idx);
      } else if (cell === player) {
        if (line.length > 0) {
          flips.push(...line);
        }
        break;
      } else {
        break;
      }
      r += dr;
      c += dc;
    }
  }

  return flips;
};

export const getValidReversiMoves = (
  board: readonly ReversiCell[],
  size: ReversiSize,
  player: ReversiPlayer
): number[] => {
  const moves: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i] === 0 && getReversiFlips(board, size, i, player).length > 0) {
      moves.push(i);
    }
  }
  return moves;
};

export interface ReversiMoveResult {
  nextBoard: ReversiCell[];
  flipped: number[];
  nextTurn: ReversiPlayer | null;
  passedPlayer: ReversiPlayer | null;
  isGameOver: boolean;
}

export const applyReversiMove = (
  board: readonly ReversiCell[],
  size: ReversiSize,
  index: number,
  player: ReversiPlayer
): ReversiMoveResult | null => {
  const flipped = getReversiFlips(board, size, index, player);
  if (flipped.length === 0) return null;

  const nextBoard = [...board];
  nextBoard[index] = player;
  for (const f of flipped) {
    nextBoard[f] = player;
  }

  const opp: ReversiPlayer = player === 1 ? 2 : 1;
  const oppMoves = getValidReversiMoves(nextBoard, size, opp);
  if (oppMoves.length > 0) {
    return {
      nextBoard,
      flipped,
      nextTurn: opp,
      passedPlayer: null,
      isGameOver: false,
    };
  }

  const samePlayerMoves = getValidReversiMoves(nextBoard, size, player);
  if (samePlayerMoves.length > 0) {
    return {
      nextBoard,
      flipped,
      nextTurn: player,
      passedPlayer: opp,
      isGameOver: false,
    };
  }

  return {
    nextBoard,
    flipped,
    nextTurn: null,
    passedPlayer: null,
    isGameOver: true,
  };
};

export const countReversiDiscs = (
  board: readonly ReversiCell[]
): { p1: number; p2: number; empty: number } => {
  let p1 = 0;
  let p2 = 0;
  let empty = 0;
  for (const c of board) {
    if (c === 1) p1++;
    else if (c === 2) p2++;
    else empty++;
  }
  return { p1, p2, empty };
};

const getCellWeight = (size: ReversiSize, index: number): number => {
  const r = Math.floor(index / size);
  const c = index % size;
  const max = size - 1;

  const isCorner = (r === 0 || r === max) && (c === 0 || c === max);
  if (isCorner) return 100;

  const isXSquare =
    (r === 1 || r === max - 1) && (c === 1 || c === max - 1);
  if (isXSquare) return -32;

  const isCSquare =
    ((r === 0 || r === max) && (c === 1 || c === max - 1)) ||
    ((c === 0 || c === max) && (r === 1 || r === max - 1));
  if (isCSquare) return -14;

  const isEdge = r === 0 || r === max || c === 0 || c === max;
  if (isEdge) return 14;

  return 2;
};

const evaluateReversi = (
  board: readonly ReversiCell[],
  size: ReversiSize,
  bot: ReversiPlayer
): number => {
  const opp: ReversiPlayer = bot === 1 ? 2 : 1;
  const counts = countReversiDiscs(board);

  // Near endgame, disc count dominates
  if (counts.empty <= 6) {
    return (bot === 1 ? counts.p1 - counts.p2 : counts.p2 - counts.p1) * 15;
  }

  let score = 0;
  for (let i = 0; i < board.length; i++) {
    const cell = board[i];
    if (cell === 0) continue;
    const w = getCellWeight(size, i);
    score += cell === bot ? w : -w;
  }

  const botMobility = getValidReversiMoves(board, size, bot).length;
  const oppMobility = getValidReversiMoves(board, size, opp).length;
  score += (botMobility - oppMobility) * 8;

  return score;
};

export const pickReversiBotMove = (
  board: readonly ReversiCell[],
  size: ReversiSize,
  bot: ReversiPlayer,
  sessionSolvedCount = 0
): number => {
  const validMoves = getValidReversiMoves(board, size, bot);
  if (validMoves.length === 0) return -1;
  if (validMoves.length === 1) return validMoves[0];

  const opp: ReversiPlayer = bot === 1 ? 2 : 1;
  const useLookahead = sessionSolvedCount >= 2;
  const scored: { move: number; score: number }[] = [];

  for (const move of validMoves) {
    const res = applyReversiMove(board, size, move, bot);
    if (!res) continue;

    let score = evaluateReversi(res.nextBoard, size, bot);

    if (useLookahead && !res.isGameOver && res.nextTurn === opp) {
      const oppMoves = getValidReversiMoves(res.nextBoard, size, opp);
      let worstReply = Infinity;
      for (const om of oppMoves) {
        const oppRes = applyReversiMove(res.nextBoard, size, om, opp);
        if (!oppRes) continue;
        const val = evaluateReversi(oppRes.nextBoard, size, bot);
        if (val < worstReply) worstReply = val;
      }
      if (worstReply !== Infinity) {
        score = worstReply;
      }
    }

    scored.push({ move, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  const tolerance = sessionSolvedCount < 2 ? 12 : 3;
  const pool = scored.filter((item) => item.score >= best - tolerance);
  return pool[Math.floor(Math.random() * pool.length)].move;
};
