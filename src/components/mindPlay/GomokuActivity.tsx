import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Grid3X3,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import {
  createGomokuBoard,
  findGomokuWinner,
  isGomokuBoardFull,
  pickGomokuBotMove,
  type GomokuCell,
  type GomokuPlayer,
  type GomokuSize,
} from '../../utils/gomokuEngine';

interface GomokuActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type PlayMode = 'two-player' | 'solo';

interface GomokuSnapshot {
  board: GomokuCell[];
  currentPlayer: GomokuPlayer;
  lastMoveIndex: number | null;
}

const BOARD_SIZES: readonly GomokuSize[] = [9, 11] as const;

const getStarPointSet = (size: GomokuSize): ReadonlySet<number> => {
  const coords =
    size === 9
      ? [
          [2, 2],
          [2, 6],
          [4, 4],
          [6, 2],
          [6, 6],
        ]
      : [
          [2, 2],
          [2, 8],
          [5, 5],
          [8, 2],
          [8, 8],
        ];
  return new Set(coords.map(([r, c]) => r * size + c));
};

export default function GomokuActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: GomokuActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [size, setSize] = useState<GomokuSize>(9);
  const [board, setBoard] = useState<GomokuCell[]>(() => createGomokuBoard(9));
  const [currentPlayer, setCurrentPlayer] = useState<GomokuPlayer>(1);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [history, setHistory] = useState<GomokuSnapshot[]>([]);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });

  const solvedReportedRef = useRef(false);

  const winResult = useMemo(() => findGomokuWinner(board, size), [board, size]);
  const isDraw = !winResult && isGomokuBoardFull(board);
  const isGameOver = Boolean(winResult) || isDraw;
  const winningSet = useMemo(
    () => new Set<number>(winResult ? winResult.line : []),
    [winResult]
  );
  const starPoints = useMemo(() => getStarPointSet(size), [size]);

  const isBotTurn = mode === 'solo' && currentPlayer === 2 && !isGameOver;
  const p2Label = mode === 'solo' ? 'Calm Bot' : 'Player 2';

  const startFresh = (
    nextMode: PlayMode = mode,
    nextSize: GomokuSize = size,
    resetScores = false
  ) => {
    setMode(nextMode);
    setSize(nextSize);
    setBoard(createGomokuBoard(nextSize));
    setCurrentPlayer(1);
    setLastMoveIndex(null);
    setHistory([]);
    solvedReportedRef.current = false;
    if (resetScores) {
      setScores({ p1: 0, p2: 0 });
    }
  };

  const handleCellTap = (index: number) => {
    if (isGameOver || isBotTurn || board[index] !== 0) return;

    const nextBoard = [...board];
    nextBoard[index] = currentPlayer;

    setHistory((prev) => [...prev.slice(-80), { board, currentPlayer, lastMoveIndex }]);
    setBoard(nextBoard);
    setLastMoveIndex(index);

    const nextWin = findGomokuWinner(nextBoard, size);
    if (nextWin) {
      setScores((prev) =>
        nextWin.winner === 1 ? { ...prev, p1: prev.p1 + 1 } : { ...prev, p2: prev.p2 + 1 }
      );
      if (mode === 'solo' && nextWin.winner === 1 && !solvedReportedRef.current) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
      return;
    }

    if (!isGomokuBoardFull(nextBoard)) {
      setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
    }
  };

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = window.setTimeout(() => {
      const move = pickGomokuBotMove(board, size, 2, sessionSolvedCount);
      if (move === -1 || board[move] !== 0) return;

      const nextBoard = [...board];
      nextBoard[move] = 2;

      setHistory((prev) => [...prev.slice(-80), { board, currentPlayer: 2, lastMoveIndex }]);
      setBoard(nextBoard);
      setLastMoveIndex(move);

      const nextWin = findGomokuWinner(nextBoard, size);
      if (nextWin) {
        setScores((prev) => ({ ...prev, p2: prev.p2 + 1 }));
        return;
      }

      if (!isGomokuBoardFull(nextBoard)) {
        setCurrentPlayer(1);
      }
    }, 380);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, board, size, lastMoveIndex, sessionSolvedCount]);

  const handleUndo = () => {
    if (history.length === 0) return;

    if (mode === 'solo') {
      let targetIdx = history.length - 1;
      while (targetIdx > 0 && history[targetIdx].currentPlayer !== 1) {
        targetIdx--;
      }
      const snap = history[targetIdx];
      setHistory(history.slice(0, targetIdx));
      setBoard(snap.board);
      setCurrentPlayer(snap.currentPlayer);
      setLastMoveIndex(snap.lastMoveIndex);
    } else {
      const snap = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setBoard(snap.board);
      setCurrentPlayer(snap.currentPlayer);
      setLastMoveIndex(snap.lastMoveIndex);
    }
  };

  const gridClass =
    size === 9 ? 'grid-cols-9 grid-rows-9' : 'grid-cols-11 grid-rows-11';

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/80">
          <Grid3X3 size={10} />
          <span>Tabletop Stone Classic</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Five in a Row (Gomoku)</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Take turns placing stones on the board — first to align 5 in any direction wins.
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => startFresh('two-player', size, true)}
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
          onClick={() => startFresh('solo', size, true)}
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

      {/* Board Size Selector & Rules */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Board size">
          {BOARD_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => startFresh(mode, sz, false)}
              aria-pressed={size === sz}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                size === sz
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
        <div className="mt-2.5 space-y-1 rounded-2xl bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-950 ring-1 ring-amber-200/70">
          <p>
            <strong>Goal:</strong> Be the first to form an unbroken line of{' '}
            <strong>5 stones</strong> horizontally, vertically, or diagonally.
          </p>
          <p>
            <strong>How:</strong> Tap any empty square to place your stone. Unlike Four in a Row,
            stones stay wherever you place them — watch out for open lines of 3 and 4!
          </p>
        </div>
      )}

      {/* Player Turn & Score Row */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 1
              ? 'bg-indigo-50 ring-2 ring-indigo-500'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-gradient-to-br from-indigo-700 to-slate-900 shadow-xs" />
            <span className="text-xs font-bold text-gray-800">
              {mode === 'solo' ? 'You' : 'Player 1'}
            </span>
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
            <span className="h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-xs" />
            <span className="text-xs font-bold text-gray-800">{p2Label}</span>
          </div>
          <span className="text-xs font-bold text-amber-700">{scores.p2}</span>
        </div>
      </div>

      {/* Warm Bamboo Grid Board */}
      <div className="mt-4 flex justify-center">
        <div
          className="aspect-square w-full max-w-[330px] rounded-3xl border border-amber-300/80 bg-gradient-to-br from-amber-50 to-orange-50/70 p-2 shadow-inner"
          role="grid"
          aria-label={`Five in a Row ${size} by ${size} board`}
        >
          <div className={`grid h-full w-full ${gridClass}`}>
            {board.map((cell, idx) => {
              const isWinning = winningSet.has(idx);
              const isLast = lastMoveIndex === idx;
              const isStar = starPoints.has(idx);
              const canPlay = !isGameOver && !isBotTurn && cell === 0;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!canPlay}
                  onClick={() => handleCellTap(idx)}
                  aria-label={`Cell ${idx + 1}, ${
                    cell === 1 ? 'Indigo stone' : cell === 2 ? 'Amber stone' : 'empty'
                  }`}
                  className={`relative flex min-h-0 min-w-0 items-center justify-center border border-amber-300/65 focus:outline-none ${
                    canPlay ? 'cursor-pointer hover:bg-amber-200/35' : 'cursor-default'
                  }`}
                >
                  {cell === 0 && isStar && (
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-amber-700/40"
                      aria-hidden="true"
                    />
                  )}
                  {cell !== 0 && (
                    <span
                      className={`flex h-[82%] w-[82%] items-center justify-center rounded-full shadow-xs ${
                        cell === 1
                          ? 'bg-gradient-to-br from-indigo-700 to-slate-900'
                          : 'bg-gradient-to-br from-amber-400 to-amber-500 ring-1 ring-amber-600/30'
                      } ${
                        isWinning
                          ? 'scale-105 ring-2 ring-emerald-500 ring-offset-1'
                          : isLast
                            ? 'ring-2 ring-white/90'
                            : ''
                      }`}
                    >
                      {isLast && (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/85" aria-hidden="true" />
                      )}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status / Result Banner */}
      {isGameOver ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 p-3.5 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Sparkles size={15} className="text-indigo-600" />
            <span>
              {winResult
                ? winResult.winner === 1
                  ? 'Player 1 connects 5 and wins!'
                  : `${p2Label} connects 5 and wins!`
                : 'Board full — friendly draw!'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => startFresh(mode, size, false)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <RefreshCw size={13} />
            <span>Play next round</span>
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {isBotTurn
            ? 'Calm Bot is placing a stone…'
            : `${currentPlayer === 1 ? 'Player 1' : p2Label}'s turn — tap any open square.`}
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
          onClick={() => startFresh(mode, size, false)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>
    </div>
  );
}
