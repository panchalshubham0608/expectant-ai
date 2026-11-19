import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, RefreshCw } from 'lucide-react';

type PairCount = 6 | 8;

interface MemoryCardItem {
  uid: number;
  pairId: string;
  symbol: string;
  label: string;
  tint: string;
}

const SYMBOLS: Omit<MemoryCardItem, 'uid'>[] = [
  { pairId: 'blossom', symbol: '🌸', label: 'Cherry Blossom', tint: 'bg-rose-50 ring-rose-200' },
  { pairId: 'leaf', symbol: '🌿', label: 'Botanical Leaf', tint: 'bg-emerald-50 ring-emerald-200' },
  { pairId: 'moon', symbol: '🌙', label: 'Crescent Moon', tint: 'bg-indigo-50 ring-indigo-200' },
  { pairId: 'star', symbol: '⭐', label: 'Golden Star', tint: 'bg-amber-50 ring-amber-200' },
  { pairId: 'butterfly', symbol: '🦋', label: 'Butterfly', tint: 'bg-sky-50 ring-sky-200' },
  { pairId: 'daisy', symbol: '🌼', label: 'Wild Daisy', tint: 'bg-yellow-50 ring-yellow-200' },
  { pairId: 'rainbow', symbol: '🌈', label: 'Rainbow', tint: 'bg-purple-50 ring-purple-200' },
  { pairId: 'cloud', symbol: '☁️', label: 'Soft Cloud', tint: 'bg-teal-50 ring-teal-200' },
];

const buildDeck = (pairCount: PairCount): MemoryCardItem[] => {
  const chosen = SYMBOLS.slice(0, pairCount);
  const deck: MemoryCardItem[] = [];
  let uid = 0;
  for (const item of chosen) {
    deck.push({ ...item, uid: uid++ });
    deck.push({ ...item, uid: uid++ });
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

export default function MemoryMatchActivity() {
  const [pairCount, setPairCount] = useState<PairCount>(6);
  const [cards, setCards] = useState<MemoryCardItem[]>(() => buildDeck(6));
  const [flippedUids, setFlippedUids] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const resetGame = (nextPairCount: PairCount) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPairCount(nextPairCount);
    setCards(buildDeck(nextPairCount));
    setFlippedUids([]);
    setMatchedPairIds([]);
    setMoves(0);
    setIsChecking(false);
  };

  const handleCardTap = (card: MemoryCardItem) => {
    if (isChecking) return;
    if (flippedUids.includes(card.uid) || matchedPairIds.includes(card.pairId)) return;

    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves((m) => m + 1);
      const firstCard = cards.find((c) => c.uid === nextFlipped[0]);
      if (firstCard && firstCard.pairId === card.pairId) {
        setMatchedPairIds((prev) => [...prev, card.pairId]);
        setFlippedUids([]);
      } else {
        setIsChecking(true);
        timerRef.current = window.setTimeout(() => {
          setFlippedUids([]);
          setIsChecking(false);
          timerRef.current = null;
        }, 800);
      }
    }
  };

  const isCompleted = matchedPairIds.length === pairCount;

  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Botanical Memory Match</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Turn over two gentle cards at a time to uncover all matching pairs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => resetGame(pairCount)}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
        >
          <RefreshCw size={13} />
          <span>New shuffle</span>
        </button>
      </div>

      {/* Mode & progress bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-2xl bg-gray-100 p-1">
          {([6, 8] as const).map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => resetGame(count)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                pairCount === count
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {count} Pairs
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
          <span>
            Pairs: <strong className="text-gray-800">{matchedPairIds.length}/{pairCount}</strong>
          </span>
          <span>
            Turns: <strong className="text-gray-800">{moves}</strong>
          </span>
        </div>
      </div>

      {/* Card Grid */}
      <div className="mt-4 grid grid-cols-4 gap-2.5">
        {cards.map((card) => {
          const isMatched = matchedPairIds.includes(card.pairId);
          const isRevealed = isMatched || flippedUids.includes(card.uid);

          return (
            <button
              key={card.uid}
              type="button"
              onClick={() => handleCardTap(card)}
              disabled={isMatched}
              aria-label={isRevealed ? card.label : 'Hidden memory card'}
              className={`aspect-square flex items-center justify-center rounded-2xl text-2xl transition duration-200 active:scale-95 sm:text-3xl ${
                isMatched
                  ? `${card.tint} ring-2 opacity-90`
                  : isRevealed
                    ? `${card.tint} ring-2 shadow-sm`
                    : 'bg-gradient-to-br from-emerald-50 to-teal-100/70 text-emerald-300 ring-1 ring-emerald-200/70 hover:from-emerald-100/70 hover:to-teal-100'
              }`}
            >
              {isRevealed ? (
                <span role="img" aria-hidden="true">
                  {card.symbol}
                </span>
              ) : (
                <span className="text-base font-bold text-emerald-500/60">✦</span>
              )}
            </button>
          );
        })}
      </div>

      {isCompleted && (
        <div
          role="status"
          className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200/70"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>Every pair matched calmly in {moves} turns!</span>
          </div>
          <button
            type="button"
            onClick={() => resetGame(pairCount)}
            className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            Play again
          </button>
        </div>
      )}
    </div>
  );
}
