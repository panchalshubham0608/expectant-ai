import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Grid2X2,
  HelpCircle,
  Lightbulb,
  RefreshCw,
  Square,
  Undo2,
  X,
} from 'lucide-react';
import {
  findPictureCrossHint,
  getPictureCrossTierForSolvedCount,
  isColClueSatisfied,
  isPictureCrossSolved,
  isRowClueSatisfied,
  pickPictureCrossPuzzle,
  type PictureCrossPuzzle,
  type PictureCrossSize,
} from '../../utils/pictureCrossData';

interface MiniPictureCrossActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type CellMark = 'empty' | 'filled' | 'crossed';
type ToolMode = 'fill' | 'cross';

const SIZES: readonly PictureCrossSize[] = [5, 6] as const;

export default function MiniPictureCrossActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: MiniPictureCrossActivityProps) {
  const initialTier = getPictureCrossTierForSolvedCount(sessionSolvedCount);
  const [puzzle, setPuzzle] = useState<PictureCrossPuzzle>(() =>
    pickPictureCrossPuzzle(initialTier.size, { difficulty: initialTier.difficulty })
  );
  const [cells, setCells] = useState<CellMark[]>(() =>
    Array.from({ length: puzzle.size * puzzle.size }, () => 'empty')
  );
  const [history, setHistory] = useState<CellMark[][]>([]);
  const [toolMode, setToolMode] = useState<ToolMode>('fill');
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [hintCellIndex, setHintCellIndex] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastTierLevel, setLastTierLevel] = useState<number>(initialTier.level);

  const isDraggingRef = useRef<boolean>(false);
  const dragTargetMarkRef = useRef<CellMark | null>(null);
  const dragSnapshotSavedRef = useRef<boolean>(false);
  const solvedReportedRef = useRef<boolean>(false);

  const sessionTier = getPictureCrossTierForSolvedCount(sessionSolvedCount);
  const filledBooleans = useMemo(() => cells.map((c) => c === 'filled'), [cells]);
  const isSolved = useMemo(
    () => isPictureCrossSolved(filledBooleans, puzzle),
    [filledBooleans, puzzle]
  );

  const rowDone = useMemo(
    () =>
      Array.from({ length: puzzle.size }, (_, r) =>
        isRowClueSatisfied(filledBooleans, puzzle, r)
      ),
    [filledBooleans, puzzle]
  );

  const colDone = useMemo(
    () =>
      Array.from({ length: puzzle.size }, (_, c) =>
        isColClueSatisfied(filledBooleans, puzzle, c)
      ),
    [filledBooleans, puzzle]
  );

  const startNewPuzzle = (
    size: PictureCrossSize,
    difficulty?: PictureCrossPuzzle['difficulty'],
    excludeId?: string
  ) => {
    const next = pickPictureCrossPuzzle(size, { difficulty, excludeId });
    setPuzzle(next);
    setCells(Array.from({ length: next.size * next.size }, () => 'empty'));
    setHistory([]);
    setHintCellIndex(null);
    setStatusMessage(null);
    solvedReportedRef.current = false;
  };

  const applyMarkToCell = (index: number, targetMark: CellMark, saveSnapshot: boolean) => {
    setCells((prev) => {
      if (prev[index] === targetMark) return prev;
      if (saveSnapshot) {
        setHistory((h) => [...h.slice(-24), prev]);
      }
      const next = [...prev];
      next[index] = targetMark;

      const nextFilled = next.map((c) => c === 'filled');
      if (isPictureCrossSolved(nextFilled, puzzle) && !solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
      return next;
    });
  };

  const handleCellPointerDown = (index: number) => {
    if (isSolved) return;
    setHintCellIndex(null);
    setStatusMessage(null);

    const current = cells[index];
    const desired: CellMark =
      toolMode === 'fill'
        ? current === 'filled'
          ? 'empty'
          : 'filled'
        : current === 'crossed'
          ? 'empty'
          : 'crossed';

    isDraggingRef.current = true;
    dragTargetMarkRef.current = desired;
    dragSnapshotSavedRef.current = true;
    applyMarkToCell(index, desired, true);
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || dragTargetMarkRef.current === null || isSolved) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cellEl = el?.closest<HTMLElement>('[data-pic-cell]');
    if (!cellEl) return;
    const idx = Number(cellEl.dataset.picCell);
    if (!Number.isInteger(idx) || idx < 0 || idx >= cells.length) return;
    applyMarkToCell(idx, dragTargetMarkRef.current, !dragSnapshotSavedRef.current);
    dragSnapshotSavedRef.current = true;
  };

  const stopDrag = () => {
    isDraggingRef.current = false;
    dragTargetMarkRef.current = null;
    dragSnapshotSavedRef.current = false;
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setCells(prev);
    setHintCellIndex(null);
    setStatusMessage(null);
  };

  const handleHint = () => {
    if (isSolved) return;
    const hint = findPictureCrossHint(filledBooleans, puzzle);
    if (!hint) return;
    const targetMark: CellMark = hint.shouldBeFilled ? 'filled' : 'crossed';
    applyMarkToCell(hint.index, targetMark, true);
    setHintCellIndex(hint.index);
    setStatusMessage(
      hint.shouldBeFilled
        ? 'Gently revealed one cozy square for you.'
        : 'Cleared one extra square so the clues match smoothly.'
    );
  };

  const handleNextPicture = () => {
    const didStepUp = sessionTier.level > lastTierLevel;
    setLastTierLevel(sessionTier.level);
    startNewPuzzle(
      didStepUp ? sessionTier.size : puzzle.size,
      didStepUp ? sessionTier.difficulty : undefined,
      puzzle.id
    );
  };

  const cellSizeClass = puzzle.size === 5 ? 'h-10 w-10' : 'h-9 w-9';

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-100">
          <Grid2X2 size={10} />
          <span>Cozy Picture Logic</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Mini Picture Cross</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Use the row &amp; column number clues to reveal a hidden cozy picture.
        </p>
      </div>

      {/* Size & How-to-Play Row */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Grid size">
          {SIZES.map((sz) => {
            const isActive = sz === puzzle.size;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => startNewPuzzle(sz, undefined, puzzle.id)}
                aria-pressed={isActive}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {sz}×{sz}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-200"
        >
          <HelpCircle size={12} />
          <span>How to play</span>
        </button>
      </div>

      {showHelp && (
        <div className="mt-3 rounded-2xl bg-indigo-50/75 p-3 text-xs leading-relaxed text-indigo-900 ring-1 ring-indigo-100">
          Each number tells you how many filled squares sit together in that row or column. For
          example, <strong>2 1</strong> means a group of 2, at least one empty space, then 1. Clues
          turn green when a line matches!
        </div>
      )}

      {/* Fill vs Cross Mode Switch */}
      {!isSolved && (
        <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100/80 p-1">
          <button
            type="button"
            onClick={() => setToolMode('fill')}
            aria-pressed={toolMode === 'fill'}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition ${
              toolMode === 'fill'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Square size={12} className="fill-current" />
            <span>Fill square</span>
          </button>
          <button
            type="button"
            onClick={() => setToolMode('cross')}
            aria-pressed={toolMode === 'cross'}
            className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition ${
              toolMode === 'cross'
                ? 'bg-white text-gray-800 shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <X size={13} />
            <span>Mark empty</span>
          </button>
        </div>
      )}

      {/* Nonogram Board */}
      <div
        className="mt-4 flex justify-center select-none touch-none"
        onPointerMove={handleBoardPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
      >
        <div className="inline-block rounded-3xl bg-gray-50/90 p-3 ring-1 ring-gray-200/80">
          {/* Column Clues Header */}
          <div className="flex items-end gap-1">
            <div className="w-11 shrink-0" />
            {puzzle.colClues.map((clues, colIdx) => {
              const done = colDone[colIdx];
              return (
                <div
                  key={colIdx}
                  className={`flex flex-col items-center justify-end pb-1 text-[11px] font-bold leading-tight ${
                    puzzle.size === 5 ? 'w-10' : 'w-9'
                  } ${done ? 'text-emerald-600' : 'text-gray-600'}`}
                >
                  {clues.map((n, i) => (
                    <span key={i}>{n}</span>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {Array.from({ length: puzzle.size }, (_, rowIdx) => {
              const done = rowDone[rowIdx];
              return (
                <div key={rowIdx} className="flex items-center gap-1">
                  {/* Row Clues */}
                  <div
                    className={`flex w-11 shrink-0 items-center justify-end gap-1 pr-1.5 text-[11px] font-bold ${
                      done ? 'text-emerald-600' : 'text-gray-600'
                    }`}
                  >
                    {puzzle.rowClues[rowIdx].map((n, i) => (
                      <span key={i}>{n}</span>
                    ))}
                  </div>

                  {/* Row Cells */}
                  {Array.from({ length: puzzle.size }, (_, colIdx) => {
                    const idx = rowIdx * puzzle.size + colIdx;
                    const mark = cells[idx];
                    const isFilled = mark === 'filled';
                    const isCrossed = mark === 'crossed';
                    const isHinted = hintCellIndex === idx;

                    return (
                      <button
                        key={colIdx}
                        type="button"
                        data-pic-cell={idx}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleCellPointerDown(idx);
                        }}
                        aria-label={`Row ${rowIdx + 1} column ${colIdx + 1}, ${mark}`}
                        className={`flex items-center justify-center rounded-xl transition-all duration-150 focus:outline-none ${cellSizeClass} ${
                          isFilled
                            ? 'shadow-xs'
                            : 'bg-white ring-1 ring-gray-200 hover:bg-indigo-50/40'
                        } ${isHinted ? 'ring-2 ring-amber-400 ring-offset-1' : ''}`}
                        style={
                          isFilled
                            ? {
                                backgroundColor: isSolved ? puzzle.revealColor : '#4f46e5',
                              }
                            : undefined
                        }
                      >
                        {isCrossed && !isSolved && (
                          <X size={14} className="text-gray-400" aria-hidden="true" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Solved Banner or Gentle Tip */}
      {isSolved ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 p-4 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>
              {puzzle.emoji} You revealed: {puzzle.name}!
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Every row and column fits together like a cozy little quilt.
          </p>
          <button
            type="button"
            onClick={handleNextPicture}
            className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <span>
              {sessionTier.level > lastTierLevel
                ? `Step up to ${sessionTier.label}`
                : 'Next picture'}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        statusMessage && (
          <p className="mt-2.5 text-center text-[11px] font-medium text-indigo-700">
            {statusMessage}
          </p>
        )
      )}

      {/* Action Bar */}
      <div className="mt-3.5 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0 || isSolved}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
        >
          <Undo2 size={13} />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={handleHint}
          disabled={isSolved}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/80 transition hover:bg-amber-100 disabled:opacity-45"
        >
          <Lightbulb size={13} />
          <span>Hint</span>
        </button>

        <button
          type="button"
          onClick={() => startNewPuzzle(puzzle.size, undefined, puzzle.id)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New picture</span>
        </button>
      </div>
    </div>
  );
}
