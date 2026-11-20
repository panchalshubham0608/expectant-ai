import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  CircleDot,
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

function BabyTokenIcon({
  variant,
  className = 'h-full w-full',
}: {
  variant: 'girl' | 'boy';
  className?: string;
}) {
  if (variant === 'girl') {
    return (
      <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
        {/* Soft blush-pink medallion backdrop */}
        <circle cx="20" cy="20" r="19" fill="#fbcfe8" />
        <circle cx="20" cy="20" r="17.5" fill="none" stroke="#f472b6" strokeWidth="1.8" />

        {/* Sweet baby face */}
        <circle cx="20" cy="22.5" r="10.2" fill="#fff7ed" stroke="#f9a8d4" strokeWidth="1" />
        {/* Little ears */}
        <circle cx="9.8" cy="22.5" r="2.2" fill="#fff7ed" stroke="#f9a8d4" strokeWidth="0.9" />
        <circle cx="30.2" cy="22.5" r="2.2" fill="#fff7ed" stroke="#f9a8d4" strokeWidth="0.9" />

        {/* Soft hair swoop */}
        <path
          d="M 11.5 18.8 C 13 13 27 13 28.5 18.8 C 25.5 16.2 14.5 16.2 11.5 18.8 Z"
          fill="#d97757"
          opacity="0.72"
        />

        {/* Pink ribbon bow perched on top-right */}
        <g transform="translate(26.5, 11.5) rotate(18)">
          <ellipse cx="-3.6" cy="0" rx="3.4" ry="2.2" fill="#ec4899" />
          <ellipse cx="3.6" cy="0" rx="3.4" ry="2.2" fill="#ec4899" />
          <circle cx="0" cy="0" r="1.7" fill="#fbcfe8" stroke="#db2777" strokeWidth="0.8" />
        </g>

        {/* Gentle eyes, rosy cheeks & warm smile */}
        <circle cx="16.4" cy="22.2" r="1.25" fill="#475569" />
        <circle cx="23.6" cy="22.2" r="1.25" fill="#475569" />
        <ellipse cx="13.8" cy="24.4" rx="1.9" ry="1.1" fill="#f9a8d4" opacity="0.8" />
        <ellipse cx="26.2" cy="24.4" rx="1.9" ry="1.1" fill="#f9a8d4" opacity="0.8" />
        <path
          d="M 17.5 25.6 Q 20 27.6 22.5 25.6"
          fill="none"
          stroke="#be185d"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      {/* Soft powder-blue medallion backdrop */}
      <circle cx="20" cy="20" r="19" fill="#bae6fd" />
      <circle cx="20" cy="20" r="17.5" fill="none" stroke="#38bdf8" strokeWidth="1.8" />

      {/* Sweet baby face */}
      <circle cx="20" cy="23.2" r="10" fill="#fff7ed" stroke="#7dd3fc" strokeWidth="1" />
      {/* Little ears */}
      <circle cx="10" cy="23.2" r="2.2" fill="#fff7ed" stroke="#7dd3fc" strokeWidth="0.9" />
      <circle cx="30" cy="23.2" r="2.2" fill="#fff7ed" stroke="#7dd3fc" strokeWidth="0.9" />

      {/* Cozy sky-blue baby beanie with top pom */}
      <path
        d="M 10.6 19.6 C 11.4 11.8 28.6 11.8 29.4 19.6 Z"
        fill="#38bdf8"
        stroke="#0284c7"
        strokeWidth="0.9"
      />
      <rect x="9.8" y="18.2" width="20.4" height="3.2" rx="1.6" fill="#0284c7" />
      <circle cx="20" cy="10.2" r="2.5" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.9" />

      {/* Gentle eyes, rosy cheeks & warm smile */}
      <circle cx="16.4" cy="23.4" r="1.25" fill="#475569" />
      <circle cx="23.6" cy="23.4" r="1.25" fill="#475569" />
      <ellipse cx="13.8" cy="25.5" rx="1.8" ry="1.05" fill="#fda4af" opacity="0.65" />
      <ellipse cx="26.2" cy="25.5" rx="1.8" ry="1.05" fill="#fda4af" opacity="0.65" />
      <path
        d="M 17.5 26.6 Q 20 28.5 22.5 26.6"
        fill="none"
        stroke="#0369a1"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type BabyVariant = 'girl' | 'boy';

const pickRandomBabyVariant = (): BabyVariant => (Math.random() < 0.5 ? 'girl' : 'boy');

export default function FourInARowActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: FourInARowActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [p1Variant, setP1Variant] = useState<BabyVariant>(() => pickRandomBabyVariant());
  const [board, setBoard] = useState<FourCell[]>(() => createEmptyFourBoard());
  const [currentPlayer, setCurrentPlayer] = useState<FourPlayer>(1);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<FourSnapshot[]>([]);
  const [scores, setScores] = useState<{ p1: number; p2: number }>({ p1: 0, p2: 0 });

  const solvedReportedRef = useRef(false);

  const p2Variant: BabyVariant = p1Variant === 'girl' ? 'boy' : 'girl';

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
    setP1Variant(pickRandomBabyVariant());
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

  const p1TokenName = p1Variant === 'girl' ? 'Baby Girl' : 'Baby Boy';
  const p2TokenName = p2Variant === 'girl' ? 'Baby Girl' : 'Baby Boy';
  const p1Name = mode === 'solo' ? 'You' : 'Player 1';
  const p2Name = mode === 'solo' ? 'Calm Bot' : 'Player 2';

  const getActiveCardClass = (variant: BabyVariant) =>
    variant === 'girl' ? 'bg-pink-50 ring-2 ring-pink-300' : 'bg-sky-50 ring-2 ring-sky-300';
  const getScoreColorClass = (variant: BabyVariant) =>
    variant === 'girl' ? 'text-pink-600' : 'text-sky-600';
  const getLastMoveRingClass = (variant: BabyVariant) =>
    variant === 'girl'
      ? 'ring-2 ring-pink-500 ring-offset-1 ring-offset-stone-100'
      : 'ring-2 ring-sky-500 ring-offset-1 ring-offset-stone-100';

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-0.5 text-[10px] font-semibold text-stone-700 ring-1 ring-stone-200/80">
          <CircleDot size={10} />
          <span>Classic Tabletop</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Four in a Row</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap any column to drop your baby token — connect 4 in a line to win.
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

      {/* Player Turn & Score Row */}
      <div className="mt-3.5 grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-2xl px-2.5 py-2 transition ${
            !isGameOver && currentPlayer === 1
              ? getActiveCardClass(p1Variant)
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-6 w-6 shrink-0">
              <BabyTokenIcon variant={p1Variant} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold text-gray-800">{p1Name}</p>
              <p className={`truncate text-[10px] font-semibold ${getScoreColorClass(p1Variant)}`}>
                {p1TokenName}
              </p>
            </div>
          </div>
          <span className={`ml-1 text-xs font-bold ${getScoreColorClass(p1Variant)}`}>
            {scores.p1}
          </span>
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl px-2.5 py-2 transition ${
            !isGameOver && currentPlayer === 2
              ? getActiveCardClass(p2Variant)
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-6 w-6 shrink-0">
              <BabyTokenIcon variant={p2Variant} />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-xs font-bold text-gray-800">{p2Name}</p>
              <p className={`truncate text-[10px] font-semibold ${getScoreColorClass(p2Variant)}`}>
                {p2TokenName}
              </p>
            </div>
          </div>
          <span className={`ml-1 text-xs font-bold ${getScoreColorClass(p2Variant)}`}>
            {scores.p2}
          </span>
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
              const cellVariant: BabyVariant | null =
                cell === 1 ? p1Variant : cell === 2 ? p2Variant : null;

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isColumnPlayable}
                  onClick={() => playColumn(col, currentPlayer)}
                  aria-label={`Column ${col + 1}, ${
                    cellVariant === null
                      ? 'empty'
                      : cellVariant === 'girl'
                        ? 'Baby Girl token'
                        : 'Baby Boy token'
                  }`}
                  className={`relative flex min-h-0 min-w-0 items-center justify-center rounded-full p-[1px] transition-transform focus:outline-none ${
                    isColumnPlayable ? 'cursor-pointer active:scale-95' : 'cursor-default'
                  } ${
                    cell === 0
                      ? 'bg-white/95 shadow-inner ring-1 ring-stone-200/90'
                      : 'bg-transparent'
                  } ${
                    isWinningCell
                      ? 'z-10 scale-105 ring-3 ring-amber-400 shadow-md'
                      : isLastMove && cellVariant !== null
                        ? getLastMoveRingClass(cellVariant)
                        : ''
                  }`}
                >
                  {cellVariant !== null && <BabyTokenIcon variant={cellVariant} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status / Result Banner */}
      {isGameOver ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-pink-50/70 via-white to-sky-50/80 p-3.5 text-center ring-1 ring-stone-200/80">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Sparkles size={15} className="text-amber-500" />
            <span>
              {winResult
                ? winResult.winner === 1
                  ? `${p1Name} (${p1TokenName}) wins!`
                  : `${p2Name} (${p2TokenName}) wins!`
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
            ? `Calm Bot is dropping a ${p2TokenName} token…`
            : `${currentPlayer === 1 ? `${p1Name} (${p1TokenName})` : `${p2Name} (${p2TokenName})`}'s turn — tap any column to drop.`}
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
