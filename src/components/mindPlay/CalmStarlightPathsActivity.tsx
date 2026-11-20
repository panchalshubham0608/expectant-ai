import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Undo2,
} from 'lucide-react';
import {
  STARLIGHT_TOKEN_BY_ID,
  areCellsAdjacent,
  generateStarlightBoard,
  getStarlightTierForSolvedCount,
  isPairConnected,
  isStarlightBoardSolved,
  type StarlightBoard,
  type StarlightGridSize,
  type StarlightPair,
  type StarlightTokenId,
} from '../../utils/starlightPathsGenerator';

interface CalmStarlightPathsActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

const GRID_SIZES: readonly StarlightGridSize[] = [5, 6, 7, 8] as const;

const GRID_COLS_CLASS: Record<StarlightGridSize, string> = {
  5: 'grid-cols-5',
  6: 'grid-cols-6',
  7: 'grid-cols-7',
  8: 'grid-cols-8',
};

const GRID_ROWS_CLASS: Record<StarlightGridSize, string> = {
  5: 'grid-rows-5',
  6: 'grid-rows-6',
  7: 'grid-rows-7',
  8: 'grid-rows-8',
};

const ENDPOINT_SIZE_CLASS: Record<StarlightGridSize, string> = {
  5: 'h-10 w-10 text-xl',
  6: 'h-9 w-9 text-lg',
  7: 'h-8 w-8 text-base',
  8: 'h-7 w-7 text-sm',
};

const SVG_STROKE_WIDTH: Record<StarlightGridSize, number> = {
  5: 24,
  6: 22,
  7: 20,
  8: 18,
};

const clonePaths = (paths: Record<string, number[]>): Record<string, number[]> => {
  const next: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(paths)) {
    next[k] = [...v];
  }
  return next;
};

export default function CalmStarlightPathsActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: CalmStarlightPathsActivityProps) {
  const [board, setBoard] = useState<StarlightBoard>(() => {
    const tier = getStarlightTierForSolvedCount(sessionSolvedCount);
    return generateStarlightBoard(tier.size, {
      complexity: tier.complexity,
      pairCount: tier.pairCount,
    });
  });
  const [paths, setPaths] = useState<Record<string, number[]>>({});
  const [history, setHistory] = useState<Record<string, number[]>[]>([]);
  const [activeTokenId, setActiveTokenId] = useState<StarlightTokenId | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [lastTierLevel, setLastTierLevel] = useState<number>(
    () => getStarlightTierForSolvedCount(sessionSolvedCount).level
  );

  const isDraggingRef = useRef(false);
  const activeTokenRef = useRef<StarlightTokenId | null>(null);
  const dragSnapshotSavedRef = useRef(false);
  const boardSolvedReportedRef = useRef(false);

  const size = board.size;
  const totalCells = size * size;
  const sessionTier = getStarlightTierForSolvedCount(sessionSolvedCount);

  const endpointByCell = useMemo(() => {
    const map = new Map<number, StarlightPair>();
    for (const pair of board.pairs) {
      map.set(pair.start, pair);
      map.set(pair.end, pair);
    }
    return map;
  }, [board]);

  const pairByToken = useMemo(() => {
    const map = new Map<StarlightTokenId, StarlightPair>();
    for (const pair of board.pairs) {
      map.set(pair.tokenId, pair);
    }
    return map;
  }, [board]);

  const cellOwner = useMemo(() => {
    const map = new Map<number, StarlightTokenId>();
    for (const pair of board.pairs) {
      const path = paths[pair.tokenId];
      if (!path) continue;
      for (const cell of path) {
        map.set(cell, pair.tokenId);
      }
    }
    return map;
  }, [board.pairs, paths]);

  const connectedCount = useMemo(
    () => board.pairs.filter((pair) => isPairConnected(pair, paths[pair.tokenId])).length,
    [board.pairs, paths]
  );

  const isSolved = useMemo(() => isStarlightBoardSolved(board, paths), [board, paths]);

  useEffect(() => {
    if (isSolved && !boardSolvedReportedRef.current) {
      boardSolvedReportedRef.current = true;
      onBoardSolved?.();
    }
  }, [isSolved, onBoardSolved]);

  useEffect(() => {
    const stopDrag = () => {
      isDraggingRef.current = false;
      dragSnapshotSavedRef.current = false;
    };
    window.addEventListener('pointerup', stopDrag);
    window.addEventListener('pointercancel', stopDrag);
    return () => {
      window.removeEventListener('pointerup', stopDrag);
      window.removeEventListener('pointercancel', stopDrag);
    };
  }, []);

  const pushHistory = (snapshot: Record<string, number[]>) => {
    setHistory((prev) => [...prev.slice(-24), clonePaths(snapshot)]);
  };

  const startBoardWithOptions = (
    nextSize: StarlightGridSize,
    complexity: number,
    pairCount?: number,
    notice: string | null = null
  ) => {
    isDraggingRef.current = false;
    activeTokenRef.current = null;
    dragSnapshotSavedRef.current = false;
    boardSolvedReportedRef.current = false;
    setBoard(generateStarlightBoard(nextSize, { complexity, pairCount }));
    setPaths({});
    setHistory([]);
    setActiveTokenId(null);
    setStatusMessage(notice);
  };

  const handleManualSizeChange = (nextSize: StarlightGridSize) => {
    startBoardWithOptions(nextSize, sessionTier.complexity);
  };

  const handlePlayNextSky = () => {
    const tier = getStarlightTierForSolvedCount(sessionSolvedCount);
    const steppedUp = tier.level > lastTierLevel;
    setLastTierLevel(tier.level);
    const notice = steppedUp
      ? `Stepped up to ${tier.label} (${tier.size}×${tier.size}) — pick any size above anytime.`
      : null;
    startBoardWithOptions(tier.size, tier.complexity, tier.pairCount, notice);
  };

  const tryStepToCell = (tokenId: StarlightTokenId, cellIdx: number) => {
    const pair = pairByToken.get(tokenId);
    if (!pair) return;

    setPaths((prev) => {
      const current = prev[tokenId] ?? [];
      if (current.length === 0) return prev;
      const tip = current[current.length - 1];
      if (tip === cellIdx) return prev;

      // Backtrack cleanly if dragging back over our own drawn path
      const existingIdx = current.indexOf(cellIdx);
      if (existingIdx !== -1) {
        if (!dragSnapshotSavedRef.current) {
          pushHistory(prev);
          dragSnapshotSavedRef.current = true;
        }
        return {
          ...prev,
          [tokenId]: current.slice(0, existingIdx + 1),
        };
      }

      // Already reached the matching endpoint — don't extend past it
      if (isPairConnected(pair, current)) return prev;

      if (!areCellsAdjacent(tip, cellIdx, size)) return prev;

      // Block stepping into another pair's endpoint
      const endpointHere = endpointByCell.get(cellIdx);
      if (endpointHere && endpointHere.tokenId !== tokenId) return prev;

      // Block crossing another pair's path
      for (const [otherToken, otherPath] of Object.entries(prev)) {
        if (otherToken !== tokenId && otherPath.includes(cellIdx)) {
          return prev;
        }
      }

      if (!dragSnapshotSavedRef.current) {
        pushHistory(prev);
        dragSnapshotSavedRef.current = true;
      }

      return {
        ...prev,
        [tokenId]: [...current, cellIdx],
      };
    });
  };

  const handleCellPointerDown = (cellIdx: number) => {
    if (isSolved) return;
    setStatusMessage(null);

    const endpoint = endpointByCell.get(cellIdx);
    const currentActive = activeTokenRef.current;

    // Allow tap-to-complete when tapping the destination endpoint adjacent to the active tip
    if (endpoint && currentActive === endpoint.tokenId) {
      const activePath = paths[currentActive] ?? [];
      if (
        activePath.length > 0 &&
        !isPairConnected(endpoint, activePath) &&
        activePath[activePath.length - 1] !== cellIdx &&
        areCellsAdjacent(activePath[activePath.length - 1], cellIdx, size)
      ) {
        dragSnapshotSavedRef.current = false;
        tryStepToCell(currentActive, cellIdx);
        isDraggingRef.current = false;
        activeTokenRef.current = null;
        setActiveTokenId(null);
        return;
      }
    }

    // Starting or restarting from an endpoint
    if (endpoint) {
      pushHistory(paths);
      dragSnapshotSavedRef.current = true;
      isDraggingRef.current = true;
      activeTokenRef.current = endpoint.tokenId;
      setActiveTokenId(endpoint.tokenId);
      setPaths((prev) => ({
        ...prev,
        [endpoint.tokenId]: [cellIdx],
      }));
      return;
    }

    // Grabbing an existing drawn path cell to trim & continue from here
    const owner = cellOwner.get(cellIdx);
    if (owner) {
      const ownedPath = paths[owner] ?? [];
      const pos = ownedPath.indexOf(cellIdx);
      if (pos !== -1) {
        pushHistory(paths);
        dragSnapshotSavedRef.current = true;
        isDraggingRef.current = true;
        activeTokenRef.current = owner;
        setActiveTokenId(owner);
        setPaths((prev) => ({
          ...prev,
          [owner]: ownedPath.slice(0, pos + 1),
        }));
      }
      return;
    }

    // Tapping an empty adjacent cell extends the currently active path (tap-step accessibility)
    if (currentActive) {
      dragSnapshotSavedRef.current = false;
      isDraggingRef.current = true;
      tryStepToCell(currentActive, cellIdx);
    }
  };

  const handleBoardPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !activeTokenRef.current || isSolved) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    const cellEl = target.closest('[data-starlight-cell]');
    if (!cellEl) return;
    const rawIdx = cellEl.getAttribute('data-starlight-cell');
    if (rawIdx === null) return;
    const cellIdx = Number.parseInt(rawIdx, 10);
    if (!Number.isInteger(cellIdx) || cellIdx < 0 || cellIdx >= totalCells) return;
    tryStepToCell(activeTokenRef.current, cellIdx);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setPaths(previous);
    activeTokenRef.current = null;
    setActiveTokenId(null);
    setStatusMessage(null);
  };

  const handleHint = () => {
    if (isSolved) return;
    const nextUnsolved = board.pairs.find((pair) => !isPairConnected(pair, paths[pair.tokenId]));
    if (!nextUnsolved) return;

    const solutionPath = board.solution[nextUnsolved.tokenId];
    if (!solutionPath) return;

    const solutionSet = new Set(solutionPath);
    pushHistory(paths);

    const nextPaths: Record<string, number[]> = {};
    for (const [tokenId, existingPath] of Object.entries(paths)) {
      if (tokenId === nextUnsolved.tokenId) continue;
      const collides = existingPath.some((c) => solutionSet.has(c));
      if (!collides) {
        nextPaths[tokenId] = [...existingPath];
      }
    }
    nextPaths[nextUnsolved.tokenId] = [...solutionPath];

    setPaths(nextPaths);
    activeTokenRef.current = null;
    setActiveTokenId(null);
    const tokenSpec = STARLIGHT_TOKEN_BY_ID.get(nextUnsolved.tokenId);
    setStatusMessage(
      tokenSpec ? `Connected the ${tokenSpec.label.toLowerCase()} path for you.` : 'Connected one path.'
    );
  };

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <h2 className="text-lg font-bold text-gray-900">Calm Starlight Paths</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Draw gentle paths linking matching sky &amp; nature icons without crossing lines.
        </p>
      </div>

      {/* Size Selector */}
      <div className="mt-4 flex justify-center">
        <div className="inline-flex rounded-2xl bg-gray-100 p-1" role="group" aria-label="Grid size">
          {GRID_SIZES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                if (option !== size) handleManualSizeChange(option);
              }}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                size === option
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {option}×{option}
            </button>
          ))}
        </div>
      </div>

      {/* How to play */}
      <div className="mt-3 rounded-2xl bg-indigo-50/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-indigo-900/90 ring-1 ring-indigo-100">
        <span className="font-bold text-indigo-950">How to play: </span>
        Drag (or tap cell by cell) from any icon to its matching pair. Drag backward or tap an icon
        to adjust a line — no timers, take your time.
      </div>

      {/* Pair Progress Dots */}
      <div className="mt-3 flex items-center justify-between px-1 text-xs">
        <span className="font-medium text-gray-500">
          Pairs connected:{' '}
          <strong className="text-gray-800">
            {connectedCount} of {board.pairs.length}
          </strong>
        </span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {board.pairs.map((pair) => {
            const spec = STARLIGHT_TOKEN_BY_ID.get(pair.tokenId);
            const done = isPairConnected(pair, paths[pair.tokenId]);
            return (
              <span
                key={pair.tokenId}
                style={{ backgroundColor: done && spec ? spec.stroke : undefined }}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  done ? 'scale-110' : 'bg-gray-200'
                }`}
              />
            );
          })}
        </div>
      </div>

      {/* Interactive Grid + Declarative SVG Path Overlay */}
      <div className="mt-3 flex justify-center">
        <div
          onPointerMove={handleBoardPointerMove}
          className="relative aspect-square w-full max-w-[320px] touch-none select-none overflow-hidden rounded-2xl border-2 border-indigo-200/80 bg-slate-50/70 shadow-inner"
        >
          {/* Underlying cell grid */}
          <div className={`grid h-full w-full ${GRID_COLS_CLASS[size]} ${GRID_ROWS_CLASS[size]}`}>
            {Array.from({ length: totalCells }, (_, cellIdx) => {
              const ownerId = cellOwner.get(cellIdx);
              const ownerSpec = ownerId ? STARLIGHT_TOKEN_BY_ID.get(ownerId) : undefined;
              const endpoint = endpointByCell.get(cellIdx);
              const endpointSpec = endpoint ? STARLIGHT_TOKEN_BY_ID.get(endpoint.tokenId) : undefined;
              const isEndpointActive = endpoint && activeTokenId === endpoint.tokenId;

              return (
                <div
                  key={cellIdx}
                  data-starlight-cell={cellIdx}
                  onPointerDown={() => handleCellPointerDown(cellIdx)}
                  style={{
                    backgroundColor: ownerSpec ? `${ownerSpec.softBg}99` : undefined,
                  }}
                  className="relative flex min-h-0 min-w-0 cursor-pointer items-center justify-center border border-indigo-100/70 transition-colors"
                >
                  {endpoint && endpointSpec && (
                    <div
                      style={{
                        backgroundColor: endpointSpec.softBg,
                        borderColor: endpointSpec.stroke,
                      }}
                      className={`relative z-20 flex items-center justify-center rounded-full border-2 shadow-sm transition-transform ${ENDPOINT_SIZE_CLASS[size]} ${
                        isEndpointActive ? 'scale-110 ring-2 ring-indigo-300 ring-offset-1' : ''
                      }`}
                      aria-label={`${endpointSpec.label} endpoint`}
                    >
                      <span className="leading-none">{endpointSpec.emoji}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Declarative SVG ribbon paths connecting cells */}
          <svg
            viewBox={`0 0 ${size * 100} ${size * 100}`}
            className="pointer-events-none absolute inset-0 z-10 h-full w-full"
            aria-hidden="true"
          >
            {board.pairs.map((pair) => {
              const path = paths[pair.tokenId];
              if (!path || path.length < 2) return null;
              const spec = STARLIGHT_TOKEN_BY_ID.get(pair.tokenId);
              if (!spec) return null;

              const points = path
                .map((cell) => {
                  const r = Math.floor(cell / size);
                  const c = cell % size;
                  return `${c * 100 + 50},${r * 100 + 50}`;
                })
                .join(' ');

              return (
                <polyline
                  key={pair.tokenId}
                  points={points}
                  fill="none"
                  stroke={spec.stroke}
                  strokeWidth={SVG_STROKE_WIDTH[size]}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={0.82}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Status or Celebration */}
      {isSolved ? (
        <div
          role="status"
          className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200/70"
        >
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            <Sparkles size={15} className="text-emerald-600" />
            <span>Every starlight path connected!</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700/90">
            {sessionTier.level > lastTierLevel
              ? `Ready for ${sessionTier.label} (${sessionTier.size}×${sessionTier.size}) next!`
              : 'Peaceful, smooth work — ready for another calm sky whenever you like.'}
          </p>
        </div>
      ) : (
        statusMessage && (
          <div
            role="status"
            className="mt-3.5 flex items-center gap-2 rounded-2xl bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/70"
          >
            <CheckCircle2 size={14} className="shrink-0 text-amber-600" />
            <span>{statusMessage}</span>
          </div>
        )
      )}

      {/* Bottom Action Bar */}
      <div className="mt-5 border-t border-gray-100 pt-4">
        {!isSolved ? (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Undo2 size={14} />
              <span>Undo</span>
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100 active:scale-[0.98]"
            >
              <Lightbulb size={14} />
              <span>Hint</span>
            </button>
            <button
              type="button"
              onClick={() => handleManualSizeChange(size)}
              className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98]"
            >
              <RefreshCw size={13} />
              <span>New sky</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePlayNextSky}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <span>
              {sessionTier.level > lastTierLevel
                ? `Play next level (${sessionTier.size}×${sessionTier.size})`
                : 'Play another sky'}
            </span>
            <ArrowRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
