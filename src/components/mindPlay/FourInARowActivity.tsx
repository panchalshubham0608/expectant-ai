import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CircleDot,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import {
  FOUR_COLS,
  FOUR_ROWS,
  createEmptyFourBoard,
  dropFourDisc,
  findFourWinner,
  getDropRow,
  isFourBoardFull,
  pickFourBotMove,
  type FourCell,
  type FourPlayer,
} from '../../utils/fourInARowEngine';

interface FourInARowActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type PlayMode = 'two-player' | 'solo';

interface FourSnapshot {
  board: FourCell[];
  currentPlayer: FourPlayer;
  lastMoveIndex: number | null;
}

export default function FourInARowActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: FourInARowActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [board, setBoard] = useState<FourCell[]>(() => createEmptyFourBoard());
  const [currentPlayer, setCurrentPlayer] = useState<FourPlayer>(1);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [showRules, setShowRules] = useState<boolean>(false);
  const [history, setHistory] = useState<FourSnapshot[]>([]);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });

  const solvedReportedRef = useRef(false);

  const winResult = useMemo(() => findFourWinner(board), [board]);
  const isDraw = !winResult && isFourBoardFull(board);
  const isGameOver = Boolean(winResult) || isDraw;
  const winningSet = useMemo(
    () => new Set<number>(winResult ? winResult.line : []),
    [winResult]
  );

  const isBotTurn = mode === 'solo' && currentPlayer === 2 && !isGameOver;

  const resetRound = (nextMode: PlayMode = mode, resetScores = false) => {
    setMode(nextMode);
    setBoard(createEmptyFourBoard());
    setCurrentPlayer(1);
    setLastMoveIndex(null);
    setHistory([]);
    solvedReportedRef.current = false;
    if (resetScores) {
      setScores({ p1: 0, p2: 0 });
    }
  };

  const playColumn = (col: number, actor: FourPlayer) => {
    if (isGameOver || actor !== currentPlayer) return;
    const res = dropFourDisc(board, col, actor);
    if (!res) return;

    setHistory((prev) => [...prev.slice(-41), { board, currentPlayer, lastMoveIndex }]);
    setBoard(res.nextBoard);
    setLastMoveIndex(res.index);

    const nextWin = findFourWinner(res.nextBoard);
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

    if (!isFourBoardFull(res.nextBoard)) {
      setCurrentPlayer(actor === 1 ? 2 : 1);
    }
  };

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = window.setTimeout(() => {
      const col = pickFourBotMove(board, 2, sessionSolvedCount);
      if (col === -1) return;
      const res = dropFourDisc(board, col, 2);
      if (!res) return;

      setHistory((prev) => [...prev.slice(-41), { board, currentPlayer: 2, lastMoveIndex }]);
      setBoard(res.nextBoard);
      setLastMoveIndex(res.index);

      const nextWin = findFourWinner(res.nextBoard);
      if (nextWin) {
        setScores((prev) => ({ ...prev, p2: prev.p2 + 1 }));
        return;
      }

      if (!isFourBoardFull(res.nextBoard)) {
        setCurrentPlayer(1);
      }
    }, 420);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, board, lastMoveIndex, sessionSolvedCount]);

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

  const p1Label = mode === 'solo' ? 'You' : 'Player 1';
  const p2Label = mode === 'solo' ? 'Calm Bot' : 'Player 2';

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700 ring-1 ring-stone-200/80">
          <CircleDot size={10} />
          <span>Classic Tabletop</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Four in a Row</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap any column to drop your disc — connect 4 in a line to win.
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => resetRound('two-player', true)}
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
          onClick={() => resetRound('solo', true)}
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

      {/* Info & Rules Row */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-gray-500">7×6 board · Connect 4</span>
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
            <strong>Goal:</strong> Be the first to line up <strong>4 discs</strong> of your color
            horizontally, vertically, or diagonally.
          </p>
          <p>
            <strong>How:</strong> Tap any column — your disc drops to the lowest open slot in that
            column. Block your opponent while setting up two-way threats!
          </p>
        </div>
      )}

      {/* Player Turn & Score Row (Red vs Yellow) */}
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 1
              ? 'bg-red-50 ring-2 ring-red-400'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-xs ring-2 ring-white" />
            <span className="text-xs font-bold text-gray-800">{p1Label}</span>
          </div>
          <span className="text-xs font-bold text-red-600">{scores.p1}</span>
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 2
              ? 'bg-yellow-50 ring-2 ring-amber-400'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 shadow-xs ring-2 ring-white" />
            <span className="text-xs font-bold text-gray-800">{p2Label}</span>
          </div>
          <span className="text-xs font-bold text-amber-700">{scores.p2}</span>
        </div>
      </div>

      {/* Warm Cream-Birch 7x6 Tabletop Board */}
      <div className="mt-4 flex justify-center">
        <div
          className="w-full max-w-[336px] rounded-3xl bg-gradient-to-b from-stone-100 via-amber-50/75 to-stone-200/90 p-2.5 shadow-sm ring-1 ring-stone-300/80"
          role="grid"
          aria-label="Four in a Row 7 by 6 board"
        >
          <div
            className="grid grid-cols-7 grid-rows-6 gap-1.5"
            style={{ aspectRatio: `${FOUR_COLS} / ${FOUR_ROWS}` }}
          >
            {board.map((cell, idx) => {
              const col = idx % FOUR_COLS;
              const isColumnPlayable = !isGameOver && !isBotTurn && getDropRow(board, col) !== -1;
              const isWinningCell = winningSet.has(idx);
              const isLastMove = lastMoveIndex === idx;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isColumnPlayable}
                  onClick={() => playColumn(col, currentPlayer)}
                  aria-label={`Column ${col + 1}, ${
                    cell === 0 ? 'empty' : cell === 1 ? `${p1Label} red disc` : `${p2Label} yellow disc`
                  }`}
                  className={`relative flex min-h-0 min-w-0 items-center justify-center rounded-full transition-transform focus:outline-none ${
                    isColumnPlayable ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  } ${
                    cell === 0
                      ? 'bg-white/95 shadow-inner ring-1 ring-stone-200/90'
                      : cell === 1
                        ? 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 shadow-sm ring-1 ring-red-700/25'
                        : 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-400 shadow-sm ring-1 ring-amber-500/35'
                  } ${
                    isWinningCell
                      ? 'z-10 scale-105 ring-3 ring-emerald-500 ring-offset-1 ring-offset-stone-100 shadow-md'
                      : isLastMove && cell !== 0
                        ? cell === 1
                          ? 'ring-2 ring-red-700/70 ring-offset-1 ring-offset-stone-100'
                          : 'ring-2 ring-amber-600/80 ring-offset-1 ring-offset-stone-100'
                        : ''
                  }`}
                >
                  {isLastMove && !isWinningCell && cell !== 0 && (
                    <span className="h-2 w-2 rounded-full bg-white/85" aria-hidden="true" />
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
            <Sparkles size={15} className="text-amber-500" />
            <span>
              {winResult
                ? winResult.winner === 1
                  ? `${p1Label} ${mode === 'solo' ? 'win' : 'wins'}!`
                  : `${p2Label} wins!`
                : 'Friendly draw!'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => resetRound(mode, false)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <RefreshCw size={13} />
            <span>Play next round</span>
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {isBotTurn
            ? 'Calm Bot is choosing a column…'
            : `${currentPlayer === 1 ? p1Label : p2Label}'s turn — tap any column to drop.`}
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
          onClick={() => resetRound(mode, false)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>
    </div>
  );
}
