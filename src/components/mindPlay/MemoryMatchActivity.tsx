import { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  MEMORY_MATCH_ALLOWED_IDS,
  MEMORY_MATCH_ITEMS,
  MEMORY_MATCH_ITEM_BY_ID,
  type MemorySymbolDefinition,
} from '../../utils/memoryMatchItems';
import {
  loadMemoryState,
  saveMemoryState,
  type MemoryPairCount,
} from '../../utils/mindPlayStorage';

interface MemoryMatchActivityProps {
  profileId: string;
}

interface MemoryCardItem extends MemorySymbolDefinition {
  uid: number;
}

const shuffleArray = <T,>(items: readonly T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const buildDeck = (pairCount: MemoryPairCount): MemoryCardItem[] => {
  const chosen = shuffleArray(MEMORY_MATCH_ITEMS).slice(0, pairCount);
  const deck: MemoryCardItem[] = [];
  let uid = 0;
  for (const item of chosen) {
    deck.push({ ...item, uid: uid++ });
    deck.push({ ...item, uid: uid++ });
  }
  return shuffleArray(deck);
};

const rebuildDeckFromPairIds = (deckPairIds: string[]): MemoryCardItem[] =>
  deckPairIds.map((pairId, idx) => {
    const symbol = MEMORY_MATCH_ITEM_BY_ID.get(pairId) ?? MEMORY_MATCH_ITEMS[0];
    return { ...symbol, uid: idx };
  });

export default function MemoryMatchActivity({ profileId }: MemoryMatchActivityProps) {
  const [initialState] = useState(() => {
    const saved = loadMemoryState(profileId, MEMORY_MATCH_ALLOWED_IDS);
    if (saved) {
      return {
        pairCount: saved.pairCount,
        cards: rebuildDeckFromPairIds(saved.deckPairIds),
        matchedPairIds: saved.matchedPairIds,
      };
    }
    return {
      pairCount: 6 as MemoryPairCount,
      cards: buildDeck(6),
      matchedPairIds: [] as string[],
    };
  });

  const [pairCount, setPairCount] = useState<MemoryPairCount>(initialState.pairCount);
  const [cards, setCards] = useState<MemoryCardItem[]>(initialState.cards);
  const [flippedUids, setFlippedUids] = useState<number[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>(initialState.matchedPairIds);
  const [isChecking, setIsChecking] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    saveMemoryState(profileId, {
      pairCount,
      deckPairIds: cards.map((c) => c.pairId),
      matchedPairIds,
    });
  }, [profileId, pairCount, cards, matchedPairIds]);

  const resetGame = (nextPairCount: MemoryPairCount) => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setPairCount(nextPairCount);
    setCards(buildDeck(nextPairCount));
    setFlippedUids([]);
    setMatchedPairIds([]);
    setIsChecking(false);
  };

  const handleCardTap = (card: MemoryCardItem) => {
    if (isChecking) return;
    if (flippedUids.includes(card.uid) || matchedPairIds.includes(card.pairId)) return;

    const nextFlipped = [...flippedUids, card.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
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
          <h2 className="text-lg font-bold text-gray-900">Calm Memory Match</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Fresh playful icons every round — turn over two cards at a time to match all pairs.
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
              onClick={() => {
                if (count !== pairCount) resetGame(count);
              }}
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
        <div className="text-xs font-medium text-gray-500">
          Pairs: <strong className="text-gray-800">{matchedPairIds.length}/{pairCount}</strong>
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
              className={`aspect-square flex items-center justify-center rounded-2xl transition duration-200 active:scale-95 ${
                isMatched
                  ? `${card.tint} ring-2 opacity-90`
                  : isRevealed
                    ? `${card.tint} ring-2 shadow-sm`
                    : 'bg-gradient-to-br from-emerald-50 to-teal-100/70 text-emerald-300 ring-1 ring-emerald-200/70 hover:from-emerald-100/70 hover:to-teal-100'
              }`}
            >
              {isRevealed ? (
                <span
                  role="img"
                  aria-hidden="true"
                  className="select-none text-[2.5rem] leading-none sm:text-5xl"
                >
                  {card.symbol}
                </span>
              ) : (
                <span className="select-none text-xl font-bold text-emerald-500/60">✦</span>
              )}
            </button>
          );
        })}
      </div>

      {isCompleted && (
        <div role="status" className="mt-4 space-y-3">
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200/70">
            <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
            <span>Every pair matched! Take a quiet breath or enjoy another round.</span>
          </div>
          <button
            type="button"
            onClick={() => resetGame(pairCount)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99]"
          >
            <span>Play again</span>
            <ArrowRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
