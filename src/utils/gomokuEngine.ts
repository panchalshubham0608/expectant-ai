export type GomokuPlayer = 1 | 2;
export type GomokuCell = 0 | GomokuPlayer;
export type GomokuSize = 9 | 11;

export interface GomokuWinResult {
  winner: GomokuPlayer;
  line: readonly number[];
}

export const createGomokuBoard = (size: GomokuSize): GomokuCell[] =>
  Array.from({ length: size * size }, () => 0);

const AXES: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export const findGomokuWinner = (
  board: readonly GomokuCell[],
  size: GomokuSize
): GomokuWinResult | null => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const player = board[r * size + c];
      if (player === 0) continue;

      for (const [dr, dc] of AXES) {
        // Only start from the beginning of a run
        const prevR = r - dr;
        const prevC = c - dc;
        if (
          prevR >= 0 &&
          prevR < size &&
          prevC >= 0 &&
          prevC < size &&
          board[prevR * size + prevC] === player
        ) {
          continue;
        }

        const line: number[] = [r * size + c];
        let nr = r + dr;
        let nc = c + dc;
        while (
          nr >= 0 &&
          nr < size &&
          nc >= 0 &&
          nc < size &&
          board[nr * size + nc] === player
        ) {
          line.push(nr * size + nc);
          nr += dr;
          nc += dc;
        }

        if (line.length >= 5) {
          return { winner: player, line: line.slice(0, 5) };
        }
      }
    }
  }
  return null;
};

export const isGomokuBoardFull = (board: readonly GomokuCell[]): boolean =>
  board.every((cell) => cell !== 0);

const scorePatternAt = (
  board: readonly GomokuCell[],
  size: GomokuSize,
  row: number,
  col: number,
  player: GomokuPlayer
): number => {
  let total = 0;

  for (const [dr, dc] of AXES) {
    let count = 1;
    let openEnds = 0;

    // Forward scan
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
      count++;
      r += dr;
      c += dc;
    }
    if (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === 0) {
      openEnds++;
    }

    // Backward scan
    r = row - dr;
    c = col - dc;
    while (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === player) {
      count++;
      r -= dr;
      c -= dc;
    }
    if (r >= 0 && r < size && c >= 0 && c < size && board[r * size + c] === 0) {
      openEnds++;
    }

    if (count >= 5) {
      total += 1_000_000;
    } else if (count === 4 && openEnds === 2) {
      total += 80_000;
    } else if (count === 4 && openEnds === 1) {
      total += 8_500;
    } else if (count === 3 && openEnds === 2) {
      total += 6_000;
    } else if (count === 3 && openEnds === 1) {
      total += 650;
    } else if (count === 2 && openEnds === 2) {
      total += 420;
    } else if (count === 2 && openEnds === 1) {
      total += 80;
    }
  }

  return total;
};

export const pickGomokuBotMove = (
  board: readonly GomokuCell[],
  size: GomokuSize,
  bot: GomokuPlayer,
  sessionSolvedCount = 0
): number => {
  const opp: GomokuPlayer = bot === 1 ? 2 : 1;
  const center = Math.floor(size / 2);

  let hasAnyStone = false;
  for (const c of board) {
    if (c !== 0) {
      hasAnyStone = true;
      break;
    }
  }
  if (!hasAnyStone) {
    return center * size + center;
  }

  // Consider empty cells within Chebyshev distance 2 of any existing stone
  const candidateSet = new Set<number>();
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r * size + c] === 0) continue;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
            const idx = nr * size + nc;
            if (board[idx] === 0) candidateSet.add(idx);
          }
        }
      }
    }
  }

  if (candidateSet.size === 0) return -1;

  const scored: { index: number; score: number }[] = [];
  for (const idx of candidateSet) {
    const r = Math.floor(idx / size);
    const c = idx % size;
    const attack = scorePatternAt(board, size, r, c, bot);
    const defense = scorePatternAt(board, size, r, c, opp);
    const centerBias = (size - (Math.abs(r - center) + Math.abs(c - center))) * 6;

    // Prioritize winning immediately, then blocking opponent wins, then tactical forks
    const combined = attack + defense * 0.92 + centerBias;
    scored.push({ index: idx, score: combined });
  }

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  // Never add noise on winning/critical blocking moves
  if (best >= 50_000 || sessionSolvedCount >= 3) {
    return scored[0].index;
  }

  const tolerance = sessionSolvedCount < 2 ? 220 : 60;
  const pool = scored.filter((item) => item.score >= best - tolerance);
  return pool[Math.floor(Math.random() * pool.length)].index;
};
