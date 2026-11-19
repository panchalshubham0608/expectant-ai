import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Palette,
  RefreshCw,
  Undo2,
} from 'lucide-react';
import {
  findGradientHint,
  generateGradientBoard,
  getGradientTierForSolvedCount,
  isGradientSolved,
  type GradientBoard,
  type GradientGridSize,
  type GradientHintPair,
} from '../../utils/pastelGradientGenerator';

interface PastelGradientHarmonyActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

const GRID_SIZES: readonly GradientGridSize[] = [4, 5, 6] as const;

const GRID_COLS_CLASS: Record<GradientGridSize, string> = {
  4: 'grid-cols-4',
  5: 'grid-cols-5',
  6: 'grid-cols-6',
};

export default function PastelGradientHarmonyActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: PastelGradientHarmonyActivityProps) {
  const initialTier = getGradientTierForSolvedCount(sessionSolvedCount);
  const [board, setBoard] = useState<GradientBoard>(() =>
    generateGradientBoard(initialTier.size, { gentleSwaps: initialTier.gentleSwaps })
  );
  const [order, setOrder] = useState<number[]>(() => [...board.initialOrder]);
  const [history, setHistory] = useState<number[][]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [hintPair, setHintPair] = useState<GradientHintPair | null>(null);
  const [lastTierLevel, setLastTierLevel] = useState<number>(initialTier.level);

  const solvedReportedRef = useRef(false);

  const sessionTier = getGradientTierForSolvedCount(sessionSolvedCount);
  const lockedSet = useMemo(() => new Set(board.lockedIndices), [board.lockedIndices]);
  const isSolved = useMemo(() => isGradientSolved(order), [order]);

  const startBoard = (
    size: GradientGridSize,
    gentleSwaps: number | null = null,
    excludePaletteId?: string
  ) => {
    const next = generateGradientBoard(size, { gentleSwaps, excludePaletteId });
    setBoard(next);
    setOrder([...next.initialOrder]);
    setHistory([]);
    setSelectedIndex(null);
    setHintPair(null);
    solvedReportedRef.current = false;
  };

  const handleTileTap = (slotIndex: number) => {
    if (isSolved || lockedSet.has(slotIndex)) return;

    if (selectedIndex === null) {
      setSelectedIndex(slotIndex);
      return;
    }

    if (selectedIndex === slotIndex) {
      setSelectedIndex(null);
      return;
    }

    const nextOrder = [...order];
    const tmp = nextOrder[selectedIndex];
    nextOrder[selectedIndex] = nextOrder[slotIndex];
    nextOrder[slotIndex] = tmp;

    setHistory((prev) => [...prev.slice(-24), order]);
    setOrder(nextOrder);
    setSelectedIndex(null);
    setHintPair(null);

    if (isGradientSolved(nextOrder) && !solvedReportedRef.current) {
      solvedReportedRef.current = true;
      onBoardSolved?.();
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const prevOrder = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setOrder(prevOrder);
    setSelectedIndex(null);
    setHintPair(null);
  };

  const handleHint = () => {
    if (isSolved) return;
    const pair = findGradientHint(order);
    setHintPair(pair);
    setSelectedIndex(null);
  };

  const handleNextHarmony = () => {
    const didStepUp = sessionTier.level > lastTierLevel;
    setLastTierLevel(sessionTier.level);
    startBoard(
      didStepUp ? sessionTier.size : board.size,
      didStepUp ? sessionTier.gentleSwaps : null,
      board.palette.id
    );
  };

  const correctUnlockedCount = order.filter(
    (tileId, idx) => !lockedSet.has(idx) && tileId === idx
  ).length;
  const totalUnlockedCount = order.length - board.lockedIndices.length;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-100">
          <Palette size={10} />
          <span>Calm Color Harmony</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Pastel Gradient Harmony</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Swap tiles between the 4 locked corners (•) until every shade flows smoothly.
        </p>
      </div>

      {/* Size Selector & Palette Pill */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Grid size">
          {GRID_SIZES.map((sz) => {
            const isActive = sz === board.size;
            return (
              <button
                key={sz}
                type="button"
                onClick={() => startBoard(sz, sz === 4 ? 6 : null, board.palette.id)}
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

        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
          {board.palette.name}
        </span>
      </div>

      {/* Pastel Tile Grid */}
      <div className="mt-4 flex justify-center">
        <div
          className={`grid aspect-square w-full max-w-[320px] overflow-hidden rounded-3xl p-1.5 shadow-inner ring-1 ring-gray-200/80 transition-all duration-500 ${
            GRID_COLS_CLASS[board.size]
          } ${isSolved ? 'gap-0 bg-white' : 'gap-1 bg-gray-100/90'}`}
          role="grid"
          aria-label={`${board.palette.name} ${board.size} by ${board.size} pastel gradient grid`}
        >
          {order.map((tileId, slotIndex) => {
            const color = board.tileColors[tileId] ?? '#e5e7eb';
            const isLocked = lockedSet.has(slotIndex);
            const isSelected = selectedIndex === slotIndex;
            const isHinted =
              hintPair !== null &&
              (hintPair.fromIndex === slotIndex || hintPair.toIndex === slotIndex);

            return (
              <button
                key={slotIndex}
                type="button"
                disabled={isLocked || isSolved}
                onClick={() => handleTileTap(slotIndex)}
                aria-label={
                  isLocked
                    ? `Locked corner tile ${slotIndex + 1}`
                    : `Color tile ${slotIndex + 1}${isSelected ? ', selected' : ''}`
                }
                aria-pressed={isSelected}
                className={`relative flex items-center justify-center transition-all duration-200 focus:outline-none ${
                  isSolved ? 'rounded-none' : 'rounded-xl'
                } ${
                  isSelected
                    ? 'z-10 scale-[0.92] ring-3 ring-white shadow-md'
                    : isHinted
                      ? 'z-10 ring-3 ring-indigo-600 ring-offset-1'
                      : isLocked
                        ? 'cursor-default'
                        : 'hover:brightness-[1.03] active:scale-95'
                }`}
                style={{ backgroundColor: color }}
              >
                {isLocked && !isSolved && (
                  <span
                    className="h-2 w-2 rounded-full bg-white/90 shadow-xs"
                    aria-hidden="true"
                  />
                )}
                {isSelected && (
                  <span
                    className="h-2.5 w-2.5 rounded-full border-2 border-white bg-black/15"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solved Banner or Gentle Status */}
      {isSolved ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50/70 p-4 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-900">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>Silky smooth harmony!</span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Every shade in <strong>{board.palette.name}</strong> has settled right into place.
          </p>
          <button
            type="button"
            onClick={handleNextHarmony}
            className="mt-3.5 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <span>
              {sessionTier.level > lastTierLevel
                ? `Step up to ${sessionTier.size}×${sessionTier.size} harmony`
                : 'Next palette'}
            </span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {hintPair
            ? 'Swap the two highlighted tiles to bring a shade home.'
            : selectedIndex !== null
              ? 'Now tap another tile to swap shades.'
              : `${correctUnlockedCount} of ${totalUnlockedCount} shades in harmony.`}
        </p>
      )}

      {/* Action Controls */}
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
          onClick={() => startBoard(board.size, null, board.palette.id)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New palette</span>
        </button>
      </div>
    </div>
  );
}
