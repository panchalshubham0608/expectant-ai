import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Circle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Undo2,
  Users,
} from 'lucide-react';
import {
  P1_STORE,
  P2_STORE,
  applyMancalaMove,
  createInitialMancalaPits,
  isPlayersPit,
  pickMancalaBotMove,
  type MancalaPlayer,
} from '../../utils/mancalaEngine';

interface MancalaActivityProps {
  sessionSolvedCount?: number;
  onBoardSolved?: () => void;
}

type PlayMode = 'two-player' | 'solo';

interface MancalaSnapshot {
  pits: number[];
  currentPlayer: MancalaPlayer;
  lastPit: number | null;
}

const TOP_ROW_PITS = [12, 11, 10, 9, 8, 7] as const;
const BOTTOM_ROW_PITS = [0, 1, 2, 3, 4, 5] as const;

const PEBBLE_COLORS = [
  '#c084fc',
  '#60a5fa',
  '#34d399',
  '#fbbf24',
  '#f87171',
  '#38bdf8',
  '#a78bfa',
  '#fb923c',
] as const;

export default function MancalaActivity({
  sessionSolvedCount = 0,
  onBoardSolved,
}: MancalaActivityProps) {
  const [mode, setMode] = useState<PlayMode>('two-player');
  const [pits, setPits] = useState<number[]>(() => createInitialMancalaPits(4));
  const [currentPlayer, setCurrentPlayer] = useState<MancalaPlayer | null>(1);
  const [lastPit, setLastPit] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [history, setHistory] = useState<MancalaSnapshot[]>([]);

  const solvedReportedRef = useRef(false);

  const isGameOver = currentPlayer === null;
  const isBotTurn = mode === 'solo' && currentPlayer === 2 && !isGameOver;
  const p2Label = mode === 'solo' ? 'Calm Bot' : 'Player 2';

  const startFresh = (nextMode: PlayMode = mode) => {
    setMode(nextMode);
    setPits(createInitialMancalaPits(4));
    setCurrentPlayer(1);
    setLastPit(null);
    setStatusMessage(null);
    setHistory([]);
    solvedReportedRef.current = false;
  };

  const handlePitTap = (pitIndex: number) => {
    if (currentPlayer === null || isBotTurn) return;
    if (!isPlayersPit(pitIndex, currentPlayer) || pits[pitIndex] <= 0) return;

    const res = applyMancalaMove(pits, pitIndex, currentPlayer);
    if (!res) return;

    setHistory((prev) => [...prev.slice(-60), { pits, currentPlayer, lastPit }]);
    setPits(res.nextPits);
    setLastPit(res.lastPit);
    setCurrentPlayer(res.nextTurn);

    const actorName = currentPlayer === 1 ? 'Player 1' : p2Label;
    if (res.isGameOver) {
      setStatusMessage('All stones swept into stores — round complete!');
      if (
        mode === 'solo' &&
        res.nextPits[P1_STORE] > res.nextPits[P2_STORE] &&
        !solvedReportedRef.current
      ) {
        solvedReportedRef.current = true;
        onBoardSolved?.();
      }
    } else if (res.capturedCount > 0) {
      setStatusMessage(`${actorName} captured ${res.capturedCount} stones!`);
    } else if (res.extraTurn) {
      setStatusMessage(`${actorName} landed in their store — bonus turn!`);
    } else {
      setStatusMessage(null);
    }
  };

  useEffect(() => {
    if (!isBotTurn) return;
    const timer = window.setTimeout(() => {
      const pit = pickMancalaBotMove(pits, 2, sessionSolvedCount);
      if (pit === -1) return;
      const res = applyMancalaMove(pits, pit, 2);
      if (!res) return;

      setHistory((prev) => [...prev.slice(-60), { pits, currentPlayer: 2, lastPit }]);
      setPits(res.nextPits);
      setLastPit(res.lastPit);
      setCurrentPlayer(res.nextTurn);

      if (res.isGameOver) {
        setStatusMessage('All stones swept into stores — round complete!');
        if (
          res.nextPits[P1_STORE] > res.nextPits[P2_STORE] &&
          !solvedReportedRef.current
        ) {
          solvedReportedRef.current = true;
          onBoardSolved?.();
        }
      } else if (res.capturedCount > 0) {
        setStatusMessage(`Calm Bot captured ${res.capturedCount} stones.`);
      } else if (res.extraTurn) {
        setStatusMessage('Calm Bot landed in its store — bonus turn…');
      } else {
        setStatusMessage(null);
      }
    }, 520);

    return () => window.clearTimeout(timer);
  }, [isBotTurn, pits, lastPit, sessionSolvedCount, onBoardSolved]);

  const handleUndo = () => {
    if (history.length === 0) return;

    if (mode === 'solo') {
      let targetIdx = history.length - 1;
      while (targetIdx > 0 && history[targetIdx].currentPlayer !== 1) {
        targetIdx--;
      }
      const snap = history[targetIdx];
      setHistory(history.slice(0, targetIdx));
      setPits(snap.pits);
      setCurrentPlayer(snap.currentPlayer);
      setLastPit(snap.lastPit);
      setStatusMessage(null);
    } else {
      const snap = history[history.length - 1];
      setHistory((prev) => prev.slice(0, -1));
      setPits(snap.pits);
      setCurrentPlayer(snap.currentPlayer);
      setLastPit(snap.lastPit);
      setStatusMessage(null);
    }
  };

  const p1Store = pits[P1_STORE];
  const p2Store = pits[P2_STORE];

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="text-center">
        <div className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200/80">
          <Circle size={10} />
          <span>Ancient Strategy</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900">Mancala</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Tap a bowl on your side to sow pebbles counter-clockwise and collect the most in your store.
        </p>
      </div>

      {/* Mode Switch */}
      <div className="mt-3.5 grid grid-cols-2 gap-1.5 rounded-2xl bg-gray-100/90 p-1">
        <button
          type="button"
          onClick={() => startFresh('two-player')}
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
          onClick={() => startFresh('solo')}
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

      {/* Score & Help Toggle */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold">
          <span
            className={`rounded-full px-2.5 py-1 ${
              !isGameOver && currentPlayer === 1
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            P1 Store: {p1Store}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 ${
              !isGameOver && currentPlayer === 2
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {mode === 'solo' ? 'Bot' : 'P2'} Store: {p2Store}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold text-gray-600 transition hover:bg-gray-200"
        >
          <HelpCircle size={12} />
          <span>Rules</span>
        </button>
      </div>

      {showHelp && (
        <div className="mt-2.5 space-y-1 rounded-2xl bg-amber-50/80 p-3 text-xs leading-relaxed text-amber-950 ring-1 ring-amber-200/70">
          <p>
            <strong>Sow:</strong> Tap a bowl on your side to drop its pebbles one by one
            counter-clockwise (skipping your opponent&apos;s store).
          </p>
          <p>
            <strong>Bonus turn:</strong> Land your last pebble in your own store to go again.
          </p>
          <p>
            <strong>Capture:</strong> Land your last pebble in an empty bowl on your own side to
            capture it along with the opposite bowl!
          </p>
        </div>
      )}

      {/* Carved Wooden Mancala Board */}
      <div className="mt-3.5 rounded-3xl bg-gradient-to-b from-amber-800 via-amber-900 to-stone-900 p-3 shadow-md ring-1 ring-amber-950/30">
        {/* Top Direction Label */}
        <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-semibold text-amber-200/85">
          <span>← {p2Label} (sows left)</span>
          {!isGameOver && currentPlayer === 2 && (
            <span className="rounded-full bg-amber-400/25 px-2 py-0.5 text-amber-100">
              Active turn
            </span>
          )}
        </div>

        <div className="flex items-stretch gap-2">
          {/* Player 2 Store (Left) */}
          <div
            className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-stone-950/45 py-2 shadow-inner ring-1 ${
              lastPit === P2_STORE ? 'ring-amber-300' : 'ring-amber-700/50'
            }`}
            aria-label={`${p2Label} store with ${p2Store} stones`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
              {mode === 'solo' ? 'Bot' : 'P2'}
            </span>
            <span className="mt-0.5 text-base font-bold text-amber-100">{p2Store}</span>
            <div className="mt-1.5 flex max-w-[30px] flex-wrap justify-center gap-0.5">
              {Array.from({ length: Math.min(12, p2Store) }, (_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PEBBLE_COLORS[i % PEBBLE_COLORS.length] }}
                />
              ))}
            </div>
          </div>

          {/* Center 2x6 Carved Bowls */}
          <div className="flex flex-1 flex-col gap-2">
            {/* Top Row: Player 2 / Bot (12 -> 7) */}
            <div className="grid grid-cols-6 gap-1.5">
              {TOP_ROW_PITS.map((pitIdx) => {
                const count = pits[pitIdx];
                const canPlay = !isGameOver && !isBotTurn && currentPlayer === 2 && count > 0;
                const isLast = lastPit === pitIdx;
                return (
                  <button
                    key={pitIdx}
                    type="button"
                    disabled={!canPlay}
                    onClick={() => handlePitTap(pitIdx)}
                    aria-label={`${p2Label} bowl with ${count} stones`}
                    className={`flex h-14 flex-col items-center justify-center rounded-2xl bg-stone-950/45 shadow-inner transition focus:outline-none ${
                      canPlay
                        ? 'cursor-pointer ring-2 ring-amber-300/80 hover:bg-stone-950/60 active:scale-95'
                        : isLast
                          ? 'ring-2 ring-amber-200/70'
                          : 'ring-1 ring-amber-700/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-100">{count}</span>
                    <div className="mt-1 flex max-w-[26px] flex-wrap justify-center gap-0.5">
                      {Array.from({ length: Math.min(6, count) }, (_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: PEBBLE_COLORS[(pitIdx + i) % PEBBLE_COLORS.length],
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Bottom Row: Player 1 (0 -> 5) */}
            <div className="grid grid-cols-6 gap-1.5">
              {BOTTOM_ROW_PITS.map((pitIdx) => {
                const count = pits[pitIdx];
                const canPlay = !isGameOver && !isBotTurn && currentPlayer === 1 && count > 0;
                const isLast = lastPit === pitIdx;
                return (
                  <button
                    key={pitIdx}
                    type="button"
                    disabled={!canPlay}
                    onClick={() => handlePitTap(pitIdx)}
                    aria-label={`Player 1 bowl with ${count} stones`}
                    className={`flex h-14 flex-col items-center justify-center rounded-2xl bg-stone-950/45 shadow-inner transition focus:outline-none ${
                      canPlay
                        ? 'cursor-pointer ring-2 ring-indigo-300 hover:bg-stone-950/60 active:scale-95'
                        : isLast
                          ? 'ring-2 ring-indigo-200/70'
                          : 'ring-1 ring-amber-700/40'
                    }`}
                  >
                    <span className="text-xs font-bold text-amber-50">{count}</span>
                    <div className="mt-1 flex max-w-[26px] flex-wrap justify-center gap-0.5">
                      {Array.from({ length: Math.min(6, count) }, (_, i) => (
                        <span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{
                            backgroundColor: PEBBLE_COLORS[(pitIdx + i) % PEBBLE_COLORS.length],
                          }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player 1 Store (Right) */}
          <div
            className={`flex w-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-stone-950/45 py-2 shadow-inner ring-1 ${
              lastPit === P1_STORE ? 'ring-indigo-300' : 'ring-amber-700/50'
            }`}
            aria-label={`Player 1 store with ${p1Store} stones`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-200">
              P1
            </span>
            <span className="mt-0.5 text-base font-bold text-white">{p1Store}</span>
            <div className="mt-1.5 flex max-w-[30px] flex-wrap justify-center gap-0.5">
              {Array.from({ length: Math.min(12, p1Store) }, (_, i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: PEBBLE_COLORS[(i + 2) % PEBBLE_COLORS.length] }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Direction Label */}
        <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] font-semibold text-amber-200/85">
          {!isGameOver && currentPlayer === 1 ? (
            <span className="rounded-full bg-indigo-400/30 px-2 py-0.5 text-indigo-100">
              Active turn
            </span>
          ) : (
            <span />
          )}
          <span>Player 1 (sows right) →</span>
        </div>
      </div>

      {/* Status / Result Banner */}
      {isGameOver ? (
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-amber-50/70 p-3.5 text-center ring-1 ring-emerald-200/70">
          <div className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <Sparkles size={15} className="text-amber-600" />
            <span>
              {p1Store > p2Store
                ? `Player 1 wins (${p1Store}–${p2Store})!`
                : p2Store > p1Store
                  ? `${p2Label} wins (${p2Store}–${p1Store})!`
                  : `Even tie (${p1Store}–${p2Store})!`}
            </span>
          </div>
          <button
            type="button"
            onClick={() => startFresh(mode)}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
          >
            <RefreshCw size={13} />
            <span>Play again</span>
          </button>
        </div>
      ) : (
        <p className="mt-2.5 text-center text-[11px] font-medium text-gray-500">
          {statusMessage
            ? statusMessage
            : isBotTurn
              ? 'Calm Bot is choosing a bowl to sow…'
              : `${currentPlayer === 1 ? 'Player 1' : p2Label}'s turn — tap a highlighted bowl.`}
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
          onClick={() => startFresh(mode)}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/80 transition hover:bg-indigo-100"
        >
          <RefreshCw size={13} />
          <span>New board</span>
        </button>
      </div>
    </div>
  );
}
