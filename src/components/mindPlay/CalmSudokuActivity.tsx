import { useState } from 'react';
import { CheckCircle2, Eraser, Lightbulb, RefreshCw } from 'lucide-react';
import { generateCalmSudoku, type SudokuBoard, type SudokuSize } from '../../utils/sudokuGenerator';

export default function CalmSudokuActivity() {
  const [size, setSize] = useState<SudokuSize>(4);
  const [board, setBoard] = useState<SudokuBoard>(() => generateCalmSudoku(4));
  const [values, setValues] = useState<number[]>(() => [...board.puzzle]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [checkedWrongIndices, setCheckedWrongIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const startNewBoard = (nextSize: SudokuSize) => {
    const nextBoard = generateCalmSudoku(nextSize);
    setSize(nextSize);
    setBoard(nextBoard);
    setValues([...nextBoard.puzzle]);
    setSelectedIndex(null);
    setCheckedWrongIndices([]);
    setIsSolved(false);
    setStatusMessage(null);
  };

  const checkSolved = (nextValues: number[], currentBoard: SudokuBoard): boolean =>
    nextValues.every((val, idx) => val === currentBoard.solution[idx]);

  const handleSetNumber = (num: number) => {
    if (selectedIndex === null || isSolved) return;
    if (board.puzzle[selectedIndex] !== 0) return;

    const nextValues = [...values];
    nextValues[selectedIndex] = num;
    setValues(nextValues);
    setCheckedWrongIndices((prev) => prev.filter((i) => i !== selectedIndex));
    setStatusMessage(null);

    if (checkSolved(nextValues, board)) {
      setIsSolved(true);
      setStatusMessage('Beautifully done! Every row, column, and box is in calm harmony.');
    }
  };

  const handleHint = () => {
    if (isSolved) return;
    // Prefer selected editable cell if empty or wrong; otherwise pick first empty/wrong editable cell
    let targetIndex: number | null = null;
    if (
      selectedIndex !== null &&
      board.puzzle[selectedIndex] === 0 &&
      values[selectedIndex] !== board.solution[selectedIndex]
    ) {
      targetIndex = selectedIndex;
    } else {
      targetIndex = values.findIndex(
        (val, idx) => board.puzzle[idx] === 0 && val !== board.solution[idx]
      );
    }

    if (targetIndex === null || targetIndex === -1) return;

    const nextValues = [...values];
    nextValues[targetIndex] = board.solution[targetIndex];
    setValues(nextValues);
    setSelectedIndex(targetIndex);
    setCheckedWrongIndices((prev) => prev.filter((i) => i !== targetIndex));

    if (checkSolved(nextValues, board)) {
      setIsSolved(true);
      setStatusMessage('Beautifully done! Every row, column, and box is in calm harmony.');
    } else {
      setStatusMessage('Filled in one gentle hint for you.');
    }
  };

  const handleGentleCheck = () => {
    if (isSolved) return;
    const wrong: number[] = [];
    values.forEach((val, idx) => {
      if (board.puzzle[idx] === 0 && val !== 0 && val !== board.solution[idx]) {
        wrong.push(idx);
      }
    });
    setCheckedWrongIndices(wrong);
    if (wrong.length === 0) {
      setStatusMessage('Everything filled in so far looks right — keep going at your own pace!');
    } else {
      setStatusMessage(
        `${wrong.length} ${wrong.length === 1 ? 'cell needs' : 'cells need'} another look (highlighted softly in amber).`
      );
    }
  };

  const selectedValue = selectedIndex !== null ? values[selectedIndex] : 0;
  const selectedRow = selectedIndex !== null ? Math.floor(selectedIndex / size) : -1;
  const selectedCol = selectedIndex !== null ? selectedIndex % size : -1;
  const numberChoices = Array.from({ length: size }, (_, i) => i + 1);

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Calm Mini Sudoku</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Fill each row, column, and shaded box with 1–{size}. No timer, no rush.
          </p>
        </div>
        <button
          type="button"
          onClick={() => startNewBoard(size)}
          className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>

      {/* Size toggle */}
      <div className="mt-4 inline-flex rounded-2xl bg-gray-100 p-1">
        {([4, 6] as const).map((optionSize) => (
          <button
            key={optionSize}
            type="button"
            onClick={() => startNewBoard(optionSize)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
              size === optionSize
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {optionSize === 4 ? '4×4 Gentle' : '6×6 Classic'}
          </button>
        ))}
      </div>

      {/* Sudoku grid */}
      <div className="mt-4 flex justify-center">
        <div
          className={`grid w-full overflow-hidden rounded-2xl border-2 border-indigo-200 bg-indigo-200/60 ${
            size === 4 ? 'max-w-[260px] grid-cols-4' : 'max-w-[320px] grid-cols-6'
          }`}
        >
          {values.map((val, idx) => {
            const row = Math.floor(idx / size);
            const col = idx % size;
            const isFixed = board.puzzle[idx] !== 0;
            const isSelected = idx === selectedIndex;
            const isSameNum = selectedValue > 0 && val === selectedValue;
            const isPeer =
              selectedIndex !== null && !isSelected && (row === selectedRow || col === selectedCol);
            const isWrong = checkedWrongIndices.includes(idx);

            const boxIndex =
              Math.floor(row / board.boxRows) * (size / board.boxCols) +
              Math.floor(col / board.boxCols);
            const isShadedBox = (Math.floor(row / board.boxRows) + Math.floor(col / board.boxCols)) % 2 === 1;

            const borderRight =
              col < size - 1 && (col + 1) % board.boxCols === 0
                ? 'border-r-2 border-r-indigo-300'
                : 'border-r border-r-indigo-100';
            const borderBottom =
              row < size - 1 && (row + 1) % board.boxRows === 0
                ? 'border-b-2 border-b-indigo-300'
                : 'border-b border-b-indigo-100';

            let bgClass = isShadedBox ? 'bg-indigo-50/45' : 'bg-white';
            if (isWrong) bgClass = 'bg-amber-100';
            else if (isSelected) bgClass = 'bg-indigo-600 text-white';
            else if (isSameNum) bgClass = 'bg-indigo-100';
            else if (isPeer) bgClass = 'bg-indigo-50/80';

            const textClass = isSelected
              ? 'text-white'
              : isFixed
                ? 'font-bold text-gray-900'
                : 'font-semibold text-indigo-700';

            return (
              <button
                key={`${boxIndex}-${idx}`}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-label={`Row ${row + 1} Column ${col + 1}${val ? `, value ${val}` : ', empty'}`}
                className={`aspect-square flex items-center justify-center text-base transition sm:text-lg ${borderRight} ${borderBottom} ${bgClass} ${textClass}`}
              >
                {val > 0 ? val : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* Number pad */}
      {!isSolved && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {numberChoices.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleSetNumber(num)}
              disabled={selectedIndex === null || board.puzzle[selectedIndex] !== 0}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-base font-bold text-indigo-800 ring-1 ring-indigo-200/70 transition hover:bg-indigo-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleSetNumber(0)}
            disabled={selectedIndex === null || board.puzzle[selectedIndex] !== 0}
            aria-label="Clear selected cell"
            className="flex h-11 items-center justify-center gap-1 rounded-2xl bg-gray-100 px-3 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Eraser size={14} />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* Status banner */}
      {statusMessage && (
        <div
          role="status"
          className={`mt-4 flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-medium ${
            isSolved
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70'
          }`}
        >
          {isSolved && <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Bottom helpers */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {!isSolved ? (
          <>
            <button
              type="button"
              onClick={handleGentleCheck}
              className="rounded-full bg-gray-100 px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              Check progress
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100"
            >
              <Lightbulb size={12} />
              <span>Gentle hint</span>
            </button>
          </>
        ) : (
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={() => startNewBoard(size)}
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <RefreshCw size={13} />
              <span>Play another board</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
