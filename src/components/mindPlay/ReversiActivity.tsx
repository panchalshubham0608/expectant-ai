import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bot,
  Disc,
  HelpCircle,
  Info,
  RefreshCw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import {
  applyReversiMove,
  countReversiDiscs,
  createInitialReversiBoard,
  getValidReversiMoves,
  pickReversiBotMove,
  type ReversiCell,
  type ReversiPlayer,
  type ReversiSize,
} from '../../utils/reversiEngine';

interface ReversiActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type PlayMode = 'two-player' | 'solo';

interface ReversiSnapshot {
  board: ReversiCell[];
  currentPlayer: ReversiPlayer;
  lastMoveIndex: number | null;
  lastFlipped: number[];
}

const BOARD_SIZES: readonly ReversiSize[] = [6, 8] as const;

export default function ReversiActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: ReversiActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [size, setSize] = useState<ReversiSize>(6);
  const [board, setBoard] = useState<ReversiCell[]>(() => createInitialReversiBoard(6));
  const [currentPlayer, setCurrentPlayer] = useState<ReversiPlayer | null>(1);
  const [lastMoveIndex, setLastMoveIndex] = useState<number | null>(null);
  const [lastFlipped, setLastFlipped] = useState<number[]>([]);
  const [moveMessage, setMoveMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [history, setHistory] = useState<ReversiSnapshot[]>([]);

  const solvedReportedRef = useRef(false);

  const counts = useMemo(() => countReversiDiscs(board), [board]);
  const isGameOver = currentPlayer === null;
  const isBotTurn = mode === 'solo' && currentPlayer === 2 && !isGameOver;

  const validMoveSet = useMemo(() => {
    if (currentPlayer === null || isBotTurn) return new Set<number>();
    return new Set(getValidReversiMoves(board, size, currentPlayer));
  }, [board, size, currentPlayer, isBotTurn]);

  const lastFlippedSet = useMemo(() => new Set<number>(lastFlipped), [lastFlipped]);

  const startFresh = (nextMode: PlayMode = mode, nextSize: ReversiSize = size) => {
    setMode(nextMode);
    setSize(nextSize);
    setBoard(createInitialReversiBoard(nextSize));
    setCurrentPlayer(1);
    setLastMoveIndex(null);
    setLastFlipped([]);
    setMoveMessage(null);
    setHistory([]);
    solvedReportedRef.current = false;
  };

  const p1Label = mode === 'solo' ? 'You' : 'Player 1';
  const p2Label = mode === 'solo' ? 'Calm Bot' : 'Player 2';

  const handleCellTap = (index: number) => {
    if (currentPlayer === null || isBotTurn) return;
    const res = applyReversiMove(board, size, index, currentPlayer);
    if (!res) return;

    setHistory((prev) => [
      ...prev.slice(-63),
      { board, currentPlayer, lastMoveIndex, lastFlipped },
    ]);
    setBoard(res.nextBoard);
    setLastMoveIndex(index);
    setLastFlipped(res.flipped);
    setCurrentPlayer(res.nextTurn);

    const actor = currentPlayer === 1 ? p1Label : p2Label;
    const flippedWord = res.flipped.length === 1 ? 'stone' : 'stones';

    if (res.passedPlayer !== null) {
      const skipped = res.passedPlayer === 1 ? p1Label : p2Label;
      setMoveMessage(
        `${actor} flipped ${res.flipped.length} ${flippedWord}. ${skipped} had no move — turn skipped.`
      );
    } else {
      setMoveMessage(`${actor} flipped ${res.flipped.length} ${flippedWord}.`);
    }

    if (res.isGameOver && mode === 'solo' && !solvedReportedRef.current) {
      const finalCounts = countReversiDiscs(res.nextBoard);
      if (finalCounts.p1 > finalCounts.p2) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
    }
  };

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = window.setTimeout(() => {
      const move = pickReversiBotMove(board, size, 2, sessionSolvedCount);
      if (move === -1) return;
      const res = applyReversiMove(board, size, move, 2);
      if (!res) return;

      setHistory((prev) => [
        ...prev.slice(-63),
        { board, currentPlayer: 2, lastMoveIndex, lastFlipped },
      ]);
      setBoard(res.nextBoard);
      setLastMoveIndex(move);
      setLastFlipped(res.flipped);
      setCurrentPlayer(res.nextTurn);

      const flippedWord = res.flipped.length === 1 ? 'stone' : 'stones';
      if (res.passedPlayer === 1) {
        setMoveMessage(
          `Calm Bot flipped ${res.flipped.length} ${flippedWord}. ${p1Label} had no move — Bot plays again.`
        );
      } else {
        setMoveMessage(`Calm Bot flipped ${res.flipped.length} ${flippedWord}.`);
      }

      if (res.isGameOver && !solvedReportedRef.current) {
        const finalCounts = countReversiDiscs(res.nextBoard);
        if (finalCounts.p1 > finalCounts.p2) {
          solvedReportedRef.current = true;
          onBoardSolved?.();
        }
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, board, size, lastMoveIndex, lastFlipped, sessionSolvedCount, onBoardSolved, p1Label]);

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
      setLastFlipped(snap.lastFlipped);
      setMoveMessage(null);
    } else {
      const snap = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setBoard(snap.board);
      setCurrentPlayer(snap.currentPlayer);
      setLastMoveIndex(snap.lastMoveIndex);
      setLastFlipped(snap.lastFlipped);
      setMoveMessage(null);
    }
  };

  const gridClass =
    size === 6 ? 'grid-cols-6 grid-rows-6 gap-1' : 'grid-cols-8 grid-rows-8 gap-0.5';

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
          <Disc size={10} />
          <span>Strategy Classic</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Reversi</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Outflank your opponent&apos;s stones to flip them to your color.
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => startFresh('two-player', size)}
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
          onClick={() => startFresh('solo', size)}
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

      {/* Size Selector & How-to-Play Toggle */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5" role="group" aria-label="Board size">
          {BOARD_SIZES.map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => startFresh(mode, sz)}
              aria-pressed={size === sz}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                size === sz
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {sz}×{sz} {sz === 6 ? 'Quick' : 'Classic'}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowGuide((v) => !v)}
          aria-expanded={showGuide}
          className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100"
        >
          <HelpCircle size={12} />
          <span>{showGuide ? 'Hide rules' : 'How to play'}</span>
        </button>
      </div>

      {/* Detailed How to Play Card */}
      {showGuide && (
        <div className="mt-3 rounded-2xl bg-emerald-50/75 p-3.5 ring-1 ring-emerald-200/70">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-200/70">
              <Info size={13} />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5 text-xs leading-relaxed text-emerald-950">
              <p>
                <span className="font-bold text-emerald-900">Goal:</span> Finish with the most
                stones of your color when the board fills (or neither player has a valid move).
              </p>
              <p className="text-emerald-900/90">
                <span className="font-semibold text-emerald-900">How to flip:</span> Tap any{' '}
                <span className="font-semibold">dotted square</span> to trap one or more opponent
                stones in a straight line (horizontal, vertical, or diagonal) between your stones —
                all trapped stones flip to your color!
              </p>
              <p className="text-emerald-900/85">
                <span className="font-semibold text-emerald-900">Strategy tip:</span>{' '}
                <span className="font-semibold">Corner squares</span> can never be flipped and help
                lock down whole edges. If a player has no legal move, their turn passes
                automatically.
              </p>

              {/* Visual Sandwich-and-Flip Example */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-2 py-1.5 shadow-inner">
                  <span className="h-4 w-4 rounded-full bg-slate-800 ring-1 ring-slate-950/30" />
                  <span className="h-4 w-4 rounded-full bg-amber-50 ring-1 ring-amber-200" />
                  <span className="h-4 w-4 rounded-full bg-amber-50 ring-1 ring-amber-200" />
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 text-[9px] font-bold text-white ring-2 ring-amber-300">
                    +
                  </span>
                </div>
                <ArrowRight size={13} className="shrink-0 text-emerald-700" />
                <div className="inline-flex items-center gap-1 rounded-xl bg-emerald-800 px-2 py-1.5 shadow-inner">
                  <span className="h-4 w-4 rounded-full bg-slate-800 ring-1 ring-slate-950/30" />
                  <span className="h-4 w-4 rounded-full bg-slate-800 ring-2 ring-emerald-200" />
                  <span className="h-4 w-4 rounded-full bg-slate-800 ring-2 ring-emerald-200" />
                  <span className="h-4 w-4 rounded-full bg-slate-800 ring-1 ring-slate-950/30" />
                </div>
                <span className="text-[10px] font-semibold text-emerald-800">Trapped flip!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disc Scoreboard */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 1
              ? 'bg-slate-100 ring-2 ring-slate-700'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-slate-800 shadow-xs ring-1 ring-slate-900/20" />
            <span className="text-xs font-bold text-gray-800">{p1Label}</span>
          </div>
          <span className="text-xs font-bold text-slate-800">{counts.p1}</span>
        </div>

        <div
          className={`flex items-center justify-between rounded-2xl px-3 py-2 transition ${
            !isGameOver && currentPlayer === 2
              ? 'bg-amber-50 ring-2 ring-amber-400'
              : 'bg-gray-50 ring-1 ring-gray-200/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full bg-amber-50 shadow-xs ring-1 ring-gray-300" />
            <span className="text-xs font-bold text-gray-800">{p2Label}</span>
          </div>
          <span className="text-xs font-bold text-amber-800">{counts.p2}</span>
        </div>
      </div>

      {/* Emerald Felt Board */}
      <div className="mt-4 flex justify-center">
        <div
          className="aspect-square w-full max-w-[324px] rounded-3xl bg-emerald-800 p-2 shadow-md ring-1 ring-emerald-900/30"
          role="grid"
          aria-label={`Reversi ${size} by ${size} board`}
        >
          <div className={`grid h-full w-full ${gridClass}`}>
            {board.map((cell, idx) => {
              const isValid = validMoveSet.has(idx);
              const isLast = lastMoveIndex === idx;
              const wasFlipped = lastFlippedSet.has(idx);

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!isValid}
                  onClick={() => handleCellTap(idx)}
                  aria-label={`Square ${idx + 1}, ${
                    cell === 1
                      ? 'Dark stone'
                      : cell === 2
                        ? 'Light stone'
                        : isValid
                          ? 'Valid move'
                          : 'Empty'
                  }`}
                  className={`relative flex min-h-0 min-w-0 items-center justify-center rounded-lg bg-emerald-700/90 transition focus:outline-none ${
                    isValid ? 'cursor-pointer hover:bg-emerald-600 active:scale-95' : 'cursor-default'
                  }`}
                >
                  {cell !== 0 && (
                    <span
                      className={`h-[78%] w-[78%] rounded-full shadow-sm transition-all duration-200 ${
                        cell === 1
                          ? 'bg-gradient-to-br from-slate-700 to-slate-900 ring-1 ring-slate-950/40'
                          : 'bg-gradient-to-br from-white to-amber-100 ring-1 ring-amber-200/80'
                      } ${
                        isLast
                          ? 'ring-2 ring-amber-300 ring-offset-1 ring-offset-emerald-700'
                          : wasFlipped
                            ? 'ring-2 ring-emerald-200/90'
                            : ''
                      }`}
                    />
                  )}
                  {cell === 0 && isValid && (
                    <span
                      className="h-2.5 w-2.5 rounded-full bg-white/45 ring-1 ring-white/50"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status / Result Banner */}
      {isGameOver ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-indigo-50/70 p-3.5 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Sparkles size={15} className="text-emerald-600" />
            <span>
              {counts.p1 > counts.p2
                ? `${p1Label} ${mode === 'solo' ? 'win' : 'wins'} (${counts.p1}–${counts.p2})!`
                : counts.p2 > counts.p1
                  ? `${p2Label} wins (${counts.p2}–${counts.p1})!`
                  : `Even tie (${counts.p1}–${counts.p2})!`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => startFresh(mode, size)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <RefreshCw size={13} />
            <span>Play again</span>
          </button>
        </div>
      ) : (
        <div className="mt-2.5 space-y-0.5 text-center text-[11px] font-medium text-gray-500">
          {moveMessage && <p className="text-emerald-700">{moveMessage}</p>}
          <p>
            {isBotTurn
              ? 'Calm Bot is choosing a stone placement…'
              : `${currentPlayer === 1 ? `${p1Label} (Dark)` : `${p2Label} (Light)`}'s turn — ${validMoveSet.size} valid ${validMoveSet.size === 1 ? 'spot' : 'spots'} marked (${counts.empty} open).`}
          </p>
        </div>
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
          onClick={() => startFresh(mode, size)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>
    </div>
  );
}
