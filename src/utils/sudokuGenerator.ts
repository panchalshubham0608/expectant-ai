export type SudokuSize = 4 | 6;

export interface SudokuBoard {
  size: SudokuSize;
  boxRows: number;
  boxCols: number;
  puzzle: number[]; // 0 = empty cell
  solution: number[];
}

const getBoxDimensions = (size: SudokuSize): { boxRows: number; boxCols: number } =>
  size === 4 ? { boxRows: 2, boxCols: 2 } : { boxRows: 2, boxCols: 3 };

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const isPlacementValid = (
  grid: number[],
  index: number,
  num: number,
  size: SudokuSize,
  boxRows: number,
  boxCols: number
): boolean => {
  const row = Math.floor(index / size);
  const col = index % size;

  for (let c = 0; c < size; c++) {
    if (grid[row * size + c] === num) return false;
  }

  for (let r = 0; r < size; r++) {
    if (grid[r * size + col] === num) return false;
  }

  const startRow = Math.floor(row / boxRows) * boxRows;
  const startCol = Math.floor(col / boxCols) * boxCols;
  for (let r = startRow; r < startRow + boxRows; r++) {
    for (let c = startCol; c < startCol + boxCols; c++) {
      if (grid[r * size + c] === num) return false;
    }
  }

  return true;
};

const fillSolvedGrid = (
  grid: number[],
  index: number,
  size: SudokuSize,
  boxRows: number,
  boxCols: number
): boolean => {
  if (index === size * size) return true;
  const candidates = shuffle(Array.from({ length: size }, (_, i) => i + 1));

  for (const num of candidates) {
    if (isPlacementValid(grid, index, num, size, boxRows, boxCols)) {
      grid[index] = num;
      if (fillSolvedGrid(grid, index + 1, size, boxRows, boxCols)) {
        return true;
      }
      grid[index] = 0;
    }
  }

  return false;
};

const countSolutions = (
  grid: number[],
  size: SudokuSize,
  boxRows: number,
  boxCols: number,
  maxSolutions: number = 2
): number => {
  const emptyIndex = grid.indexOf(0);
  if (emptyIndex === -1) return 1;

  let found = 0;
  for (let num = 1; num <= size; num++) {
    if (isPlacementValid(grid, emptyIndex, num, size, boxRows, boxCols)) {
      grid[emptyIndex] = num;
      found += countSolutions(grid, size, boxRows, boxCols, maxSolutions - found);
      grid[emptyIndex] = 0;
      if (found >= maxSolutions) return found;
    }
  }
  return found;
};

/**
 * Generates a calm, uniquely solvable 4x4 or 6x6 Sudoku board.
 */
export const generateCalmSudoku = (size: SudokuSize): SudokuBoard => {
  const { boxRows, boxCols } = getBoxDimensions(size);
  const solution = Array<number>(size * size).fill(0);
  fillSolvedGrid(solution, 0, size, boxRows, boxCols);

  const puzzle = [...solution];
  // Leave a gentle number of clues so the puzzle feels relaxing rather than stressful
  const targetRemovals = size === 4 ? 8 : 18;
  const indices = shuffle(Array.from({ length: size * size }, (_, i) => i));

  let removed = 0;
  for (const idx of indices) {
    if (removed >= targetRemovals) break;
    const backup = puzzle[idx];
    puzzle[idx] = 0;

    const testGrid = [...puzzle];
    if (countSolutions(testGrid, size, boxRows, boxCols, 2) === 1) {
      removed++;
    } else {
      puzzle[idx] = backup;
    }
  }

  return {
    size,
    boxRows,
    boxCols,
    puzzle,
    solution,
  };
};
