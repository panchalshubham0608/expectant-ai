import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Grid2X2,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import {
  applyDotsMove,
  countDotsScores,
  createDotsBoard,
  getEdgeKey,
  getHEdgeIndex,
  getVEdgeIndex,
  pickDotsBotMove,
  type DotsBoardState,
  type DotsEdge,
  type DotsGridSize,
  type DotsPlayer,
} from '../../utils/dotsAndBoxesEngine';

interface DotsAndBoxesActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type PlayMode = 'two-player' | 'solo';

interface DotsSnapshot {
  state: DotsBoardState;
  currentPlayer: DotsPlayer;
  lastEdgeKey: string | null;
}

const GRID_SIZES: readonly DotsGridSize[] = [3, 4, 5] as const;

export default function DotsAndBoxesActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: DotsAndBoxesActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [gridSize, setGridSize] = useState<DotsGridSize>(4);
  const [boardState, setBoardState] = useState<DotsBoardState>(() => createDotsBoard(4));
  const [currentPlayer, setCurrentPlayer] = useState<DotsPlayer>(1);
  const [lastEdgeKey, setLastEdgeKey] = useState<string | null>(null);
  const [bonusTurnBanner, setBonusTurnBanner] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [history, setHistory] = useState<DotsSnapshot[]>([]);

  const solvedReportedRef = useRef(false);

  const scores = useMemo(() => countDotsScores(boardState), [boardState]);
  const isGameOver = scores.remaining === 0;
  const isBotTurn = mode === 'solo' && currentPlayer === 2 && !isGameOver;

  const startFresh = (nextMode: PlayMode = mode, nextSize: DotsGridSize = gridSize) => {
    setMode(nextMode);
    setGridSize(nextSize);
    setBoardState(createDotsBoard(nextSize));
    setCurrentPlayer(1);
    setLastEdgeKey(null);
    setBonusTurnBanner(false);
    setHistory([]);
    solvedReportedRef.current = false;
  };

  const handleEdgeTap = (edge: DotsEdge) => {
    if (isGameOver || isBotTurn) return;
    const res = applyDotsMove(boardState, edge, currentPlayer);
    if (!res) return;

    setHistory((prev) => [
      ...prev.slice(-60),
      { state: boardState, currentPlayer, lastEdgeKey },
    ]);
    setBoardState(res.nextState);
    setLastEdgeKey(getEdgeKey(edge));

    const nextScores = countDotsScores(res.nextState);
    if (nextScores.remaining === 0) {
      setBonusTurnBanner(false);
      if (mode === 'solo' && nextScores.p1 > nextScores.p2 && !solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
      return;
    }

    if (res.claimedCount > 0) {
      setBonusTurnBanner(true);
    } else {
      setBonusTurnBanner(false);
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = window.setTimeout(() => {
      const edge = pickDotsBotMove(boardState, 2, sessionSolvedCount);
      if (!edge) return;
      const res = applyDotsMove(boardState, edge, 2);
      if (!res) return;

      setHistory((prev) => [
        ...prev.slice(-60),
        { state: boardState, currentPlayer: 2, lastEdgeKey },
      ]);
      setBoardState(res.nextState);
      setLastEdgeKey(getEdgeKey(edge));

      const nextScores = countDotsScores(res.nextState);
      if (nextScores.remaining === 0) {
        setBonusTurnBanner(false);
        if (nextScores.p1 > nextScores.p2 && !solvedReportedRef.current) {
          solvedReportedRef.current = true;
          onBoardSolved?.();
        }
        return;
      }

      if (res.claimedCount > 0) {
        setBonusTurnBanner(true);
      } else {
        setBonusTurnBanner(false);
        setCurrentPlayer(1);
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, boardState, lastEdgeKey, sessionSolvedCount, onBoardSolved]);

  const handleUndo = () => {
    if (history.length === 0) return;

    if (mode === 'solo') {
      let targetIdx = history.length - 1;
      while (targetIdx > 0 && history[targetIdx].currentPlayer !== 1) {
        targetIdx--;
      }
      const snap = history[targetIdx];
      setHistory(history.slice(0, targetIdx));
      setBoardState(snap.state);
      setCurrentPlayer(snap.currentPlayer);
      setLastEdgeKey(snap.lastEdgeKey);
      setBonusTurnBanner(false);
    } else {
      const snap = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setBoardState(snap.state);
      setCurrentPlayer(snap.currentPlayer);
      setLastEdgeKey(snap.lastEdgeKey);
      setBonusTurnBanner(false);
    }
  };

  const p1Label = mode === 'solo' ? 'You' : 'Player 1';
  const p2Label = mode === 'solo' ? 'Calm Bot' : 'Player 2';
  const padding = 28;
  const viewSize = 320;
  const step = (viewSize - padding * 2) / gridSize;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[10px] font-semibold text-teal-700 ring-1 ring-teal-100">
          <Grid2X2 size={10} />
          <span>Paper &amp; Pen Classic</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Dots &amp; Boxes</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap between dots to draw a line. Closing the 4th side claims the box and earns a bonus turn.
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => startFresh('two-player', gridSize)}
          aria-pressed={mode === 'two-player'}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            mode === 'two-player'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users size={13} />
          <span>2 Players</span>
        </button>
        <button
          type="button"
          onClick={() => startFresh('solo', gridSize)}
          aria-pressed={mode === 'solo'}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
            mode === 'solo'
              ? 'bg-white text-indigo-700 shadow-xs'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Bot size={13} />
          <span>Solo vs Bot</span>
        </button>
      </div>

      {/* Size Selector & Rules Row */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Box grid size">
          {GRID_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => startFresh(mode, sz)}
              aria-pressed={gridSize === sz}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                gridSize === sz
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {sz}×{sz}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          aria-expanded={showRules}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
            showRules
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <HelpCircle size={12} />
          <span>Rules</span>
        </button>
      </div>

      {showRules && (
        <div className="mt-2.5 space-y-1 rounded-2xl bg-indigo-50/70 p-3 text-xs leading-relaxed text-indigo-950 ring-1 ring-indigo-100">
          <p>
            <strong>Draw:</strong> Take turns tapping any dashed edge between two dots to draw one
            line.
          </p>
          <p>
            <strong>Bonus turn:</strong> Drawing the 4th side of a square claims that box and gives
            you an immediate extra turn!
          </p>
          <p>
            <strong>Tip:</strong> Avoid drawing the 3rd side of a box unless forced — otherwise your
            opponent can claim a chain of boxes.
          </p>
        </div>
      )}

      {/* Scoreboard */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 1
              ? 'bg-indigo-50 ring-2 ring-indigo-500'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-md bg-indigo-600" />
            <span className="text-xs font-bold text-gray-800">{p1Label}</span>
          </div>
          <span className="text-xs font-bold text-indigo-700">{scores.p1}</span>
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 2
              ? 'bg-amber-50 ring-2 ring-amber-400'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-md bg-amber-500" />
            <span className="text-xs font-bold text-gray-800">{p2Label}</span>
          </div>
          <span className="text-xs font-bold text-amber-700">{scores.p2}</span>
        </div>
      </div>

      {/* Interactive SVG Dots & Boxes Board */}
      <div className="mt-4 flex justify-center">
        <div className="w-full max-w-[320px] rounded-3xl border border-gray-200/80 bg-stone-50/70 p-2 shadow-inner">
          <svg
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="block w-full select-none touch-manipulation"
            role="img"
            aria-label={`${gridSize} by ${gridSize} Dots and Boxes board`}
          >
            {/* Claimed Boxes */}
            {Array.from({ length: gridSize }, (_, r) =>
              Array.from({ length: gridSize }, (_, c) => {
                const owner = boardState.boxes[r * gridSize + c];
                if (owner === 0) return null;
                const x = padding + c * step + 5;
                const y = padding + r * step + 5;
                const boxSide = step - 10;
                return (
                  <g key={`box-${r}-${c}`}>
                    <rect
                      x={x}
                      y={y}
                      width={boxSide}
                      height={boxSide}
                      rx="8"
                      fill={owner === 1 ? '#e0e7ff' : '#fef3c7'}
                    />
                    <text
                      x={x + boxSide / 2}
                      y={y + boxSide / 2 + 4}
                      textAnchor="middle"
                      fontSize={gridSize === 5 ? '11' : '13'}
                      fontWeight="700"
                      fill={owner === 1 ? '#4338ca' : '#b45309'}
                    >
                      {owner === 1 ? 'P1' : mode === 'solo' ? 'B' : 'P2'}
                    </text>
                  </g>
                );
              })
            )}

            {/* Horizontal Edges */}
            {Array.from({ length: gridSize + 1 }, (_, r) =>
              Array.from({ length: gridSize }, (_, c) => {
                const owner = boardState.hLines[getHEdgeIndex(gridSize, r, c)];
                const edge: DotsEdge = { orientation: 'h', row: r, col: c };
                const key = getEdgeKey(edge);
                const isLast = key === lastEdgeKey;
                const x1 = padding + c * step;
                const x2 = x1 + step;
                const y = padding + r * step;

                return (
                  <g
                    key={key}
                    role={owner === 0 ? 'button' : undefined}
                    tabIndex={owner === 0 && !isBotTurn ? 0 : undefined}
                    aria-label={owner === 0 ? `Draw horizontal line row ${r + 1} col ${c + 1}` : undefined}
                    onClick={() => handleEdgeTap(edge)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEdgeTap(edge);
                      }
                    }}
                    style={{ cursor: owner === 0 && !isBotTurn ? 'pointer' : 'default', outline: 'none' }}
                  >
                    <line x1={x1 + 8} y1={y} x2={x2 - 8} y2={y} stroke="transparent" strokeWidth="22" />
                    <line
                      x1={x1 + 5}
                      y1={y}
                      x2={x2 - 5}
                      y2={y}
                      stroke={
                        owner === 0
                          ? '#d6d3d1'
                          : owner === 1
                            ? '#4f46e5'
                            : '#d97706'
                      }
                      strokeWidth={owner === 0 ? '3' : isLast ? '7' : '5.5'}
                      strokeDasharray={owner === 0 ? '4 5' : undefined}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })
            )}

            {/* Vertical Edges */}
            {Array.from({ length: gridSize }, (_, r) =>
              Array.from({ length: gridSize + 1 }, (_, c) => {
                const owner = boardState.vLines[getVEdgeIndex(gridSize, r, c)];
                const edge: DotsEdge = { orientation: 'v', row: r, col: c };
                const key = getEdgeKey(edge);
                const isLast = key === lastEdgeKey;
                const x = padding + c * step;
                const y1 = padding + r * step;
                const y2 = y1 + step;

                return (
                  <g
                    key={key}
                    role={owner === 0 ? 'button' : undefined}
                    tabIndex={owner === 0 && !isBotTurn ? 0 : undefined}
                    aria-label={owner === 0 ? `Draw vertical line row ${r + 1} col ${c + 1}` : undefined}
                    onClick={() => handleEdgeTap(edge)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleEdgeTap(edge);
                      }
                    }}
                    style={{ cursor: owner === 0 && !isBotTurn ? 'pointer' : 'default', outline: 'none' }}
                  >
                    <line x1={x} y1={y1 + 8} x2={x} y2={y2 - 8} stroke="transparent" strokeWidth="22" />
                    <line
                      x1={x}
                      y1={y1 + 5}
                      x2={x}
                      y2={y2 - 5}
                      stroke={
                        owner === 0
                          ? '#d6d3d1'
                          : owner === 1
                            ? '#4f46e5'
                            : '#d97706'
                      }
                      strokeWidth={owner === 0 ? '3' : isLast ? '7' : '5.5'}
                      strokeDasharray={owner === 0 ? '4 5' : undefined}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })
            )}

            {/* Anchor Dots */}
            {Array.from({ length: gridSize + 1 }, (_, r) =>
              Array.from({ length: gridSize + 1 }, (_, c) => (
                <circle
                  key={`dot-${r}-${c}`}
                  cx={padding + c * step}
                  cy={padding + r * step}
                  r={gridSize === 5 ? 5 : 6}
                  fill="#334155"
                />
              ))
            )}
          </svg>
        </div>
      </div>

      {/* Status / Result Banner */}
      {isGameOver ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50/70 p-3.5 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Sparkles size={15} className="text-indigo-600" />
            <span>
              {scores.p1 > scores.p2
                ? `Player 1 wins (${scores.p1}–${scores.p2})!`
                : scores.p2 > scores.p1
                  ? `${p2Label} wins (${scores.p2}–${scores.p1})!`
                  : `Even tie (${scores.p1}–${scores.p2})!`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => startFresh(mode, gridSize)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <RefreshCw size={13} />
            <span>Play again</span>
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {isBotTurn
            ? bonusTurnBanner
              ? 'Calm Bot closed a box and takes a bonus turn…'
              : 'Calm Bot is choosing a line…'
            : bonusTurnBanner
              ? `Box claimed! ${currentPlayer === 1 ? 'Player 1' : p2Label} goes again.`
              : `${currentPlayer === 1 ? 'Player 1' : p2Label}'s turn — tap any dashed line.`}
        </p>
      )}

      {/* Action Bar */}
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleUndo}
          disabled={history.length === 0 || isBotTurn}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-45"
        >
          <Undo2 size={13} />
          <span>Undo</span>
        </button>

        <button
          type="button"
          onClick={() => startFresh(mode, gridSize)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>
    </div>
  );
}
