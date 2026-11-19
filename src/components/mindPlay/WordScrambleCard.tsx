import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Lightbulb,
  RotateCcw,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import type { WordScramblePuzzle } from '../../models/mindPuzzle';

interface WordScrambleCardProps {
  puzzle: WordScramblePuzzle;
  onSolved?: () => void;
  embedded?: boolean;
}

interface LetterTile {
  id: number;
  char: string;
}

const scrambleWordLetters = (word: string): LetterTile[] => {
  const letters = word.split('').map((char, idx) => ({ id: idx, char }));
  for (let attempt = 0; attempt < 10; attempt++) {
    const copy = [...letters];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    if (copy.map((l) => l.char).join('') !== word) {
      return copy;
    }
  }
  // Guaranteed rotation fallback if random shuffle matched
  return [...letters.slice(1), letters[0]];
};

export default function WordScrambleCard({
  puzzle,
  onSolved,
  embedded = false,
}: WordScrambleCardProps) {
  const initialScrambles = useMemo(
    () => puzzle.items.map((item) => scrambleWordLetters(item.word)),
    [puzzle]
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [tilesByItem, setTilesByItem] = useState<LetterTile[][]>(initialScrambles);
  const [placedIdsByItem, setPlacedIdsByItem] = useState<number[][]>(() =>
    puzzle.items.map(() => [])
  );
  const [solvedIndices, setSolvedIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  const currentItem = puzzle.items[activeIndex];
  const currentTiles = useMemo(
    () => tilesByItem[activeIndex] ?? [],
    [tilesByItem, activeIndex]
  );
  const currentPlacedIds = placedIdsByItem[activeIndex] ?? [];
  const isCurrentSolved = solvedIndices.includes(activeIndex);
  const isAllSolved = solvedIndices.length === puzzle.items.length;

  const tileById = useMemo(() => {
    const map = new Map<number, LetterTile>();
    for (const tile of currentTiles) {
      map.set(tile.id, tile);
    }
    return map;
  }, [currentTiles]);

  const updateCurrentPlaced = (nextIds: number[]) => {
    setPlacedIdsByItem((prev) => prev.map((ids, idx) => (idx === activeIndex ? nextIds : ids)));

    if (nextIds.length === currentItem.word.length) {
      const formedWord = nextIds.map((id) => tileById.get(id)?.char ?? '').join('');
      if (formedWord === currentItem.word) {
        const nextSolved = solvedIndices.includes(activeIndex)
          ? solvedIndices
          : [...solvedIndices, activeIndex];
        setSolvedIndices(nextSolved);
        setFeedback(`Wonderful! "${currentItem.word}" is unscrambled.`);
        if (nextSolved.length === puzzle.items.length) {
          onSolved?.();
        }
      } else {
        setFeedback('Almost there — tap any letter above to move it back and try again.');
      }
    } else {
      setFeedback(null);
    }
  };

  const handleSelectTile = (tileId: number) => {
    if (isCurrentSolved || currentPlacedIds.includes(tileId)) return;
    updateCurrentPlaced([...currentPlacedIds, tileId]);
  };

  const handleRemovePlaced = (tileId: number) => {
    if (isCurrentSolved) return;
    updateCurrentPlaced(currentPlacedIds.filter((id) => id !== tileId));
  };

  const handleClear = () => {
    if (isCurrentSolved) return;
    updateCurrentPlaced([]);
  };

  const handleShuffleTiles = () => {
    if (isCurrentSolved) return;
    setTilesByItem((prev) =>
      prev.map((tiles, idx) => (idx === activeIndex ? scrambleWordLetters(currentItem.word) : tiles))
    );
    updateCurrentPlaced([]);
  };

  const handleRevealLetter = () => {
    if (isCurrentSolved) return;
    const targetWord = currentItem.word;

    // Keep valid prefix of already placed tiles, then fill the next correct character
    let prefixLen = 0;
    while (
      prefixLen < currentPlacedIds.length &&
      tileById.get(currentPlacedIds[prefixLen])?.char === targetWord[prefixLen]
    ) {
      prefixLen++;
    }

    const keptIds = currentPlacedIds.slice(0, prefixLen);
    const neededChar = targetWord[prefixLen];
    const matchingTile = currentTiles.find(
      (t) => t.char === neededChar && !keptIds.includes(t.id)
    );

    if (matchingTile) {
      updateCurrentPlaced([...keptIds, matchingTile.id]);
    }
  };

  const handleGoNextUnsolved = () => {
    const next = puzzle.items.findIndex((_, idx) => idx !== activeIndex && !solvedIndices.includes(idx));
    if (next !== -1) {
      setActiveIndex(next);
      setFeedback(null);
    }
  };

  return (
    <div className={embedded ? '' : 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100'}>
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700">
          <Sparkles size={11} />
          Cozy Word Unscrambler
        </span>
        <h2 className="mt-1.5 text-lg font-bold text-gray-900">{puzzle.title}</h2>
        <p className="mt-0.5 text-xs text-gray-500">Theme: {puzzle.theme}</p>
      </div>

      {/* Word step pills */}
      <div className="mt-4 flex items-center gap-1.5">
        {puzzle.items.map((item, idx) => {
          const solved = solvedIndices.includes(idx);
          const isActive = idx === activeIndex;
          return (
            <button
              key={`${item.word}-${idx}`}
              type="button"
              onClick={() => {
                setActiveIndex(idx);
                setFeedback(null);
              }}
              className={`flex flex-1 items-center justify-center gap-1 rounded-xl py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-teal-600 text-white shadow-sm'
                  : solved
                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {solved && <CheckCircle2 size={12} />}
              <span>Word {idx + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Clue card */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-teal-50/70 to-emerald-50/40 p-4 ring-1 ring-teal-100">
        <p className="text-[11px] font-bold uppercase tracking-wider text-teal-700">
          Clue ({currentItem.word.length} letters)
        </p>
        <p className="mt-1 text-sm leading-relaxed text-gray-800">{currentItem.clue}</p>
      </div>

      {/* Answer slots */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {currentItem.word.split('').map((_, slotIdx) => {
          const placedId = currentPlacedIds[slotIdx];
          const placedTile = placedId !== undefined ? tileById.get(placedId) : undefined;
          return (
            <button
              key={slotIdx}
              type="button"
              disabled={!placedTile || isCurrentSolved}
              onClick={() => placedTile && handleRemovePlaced(placedTile.id)}
              aria-label={placedTile ? `Remove letter ${placedTile.char}` : 'Empty letter slot'}
              className={`flex h-11 w-10 items-center justify-center rounded-xl text-base font-bold transition ${
                isCurrentSolved
                  ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-300'
                  : placedTile
                    ? 'bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                    : 'border-2 border-dashed border-gray-200 bg-gray-50 text-transparent'
              }`}
            >
              {placedTile ? placedTile.char : '_'}
            </button>
          );
        })}
      </div>

      {/* Scrambled letter pool */}
      {!isCurrentSolved && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {currentTiles.map((tile) => {
            const isUsed = currentPlacedIds.includes(tile.id);
            return (
              <button
                key={tile.id}
                type="button"
                disabled={isUsed}
                onClick={() => handleSelectTile(tile.id)}
                className={`flex h-11 w-10 items-center justify-center rounded-xl text-base font-bold transition active:scale-95 ${
                  isUsed
                    ? 'bg-gray-100 text-gray-300'
                    : 'bg-white text-gray-800 shadow-sm ring-1 ring-gray-200 hover:bg-teal-50 hover:ring-teal-300'
                }`}
              >
                {tile.char}
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div
          role="status"
          className={`mt-4 rounded-2xl px-3.5 py-2.5 text-xs font-medium ${
            isCurrentSolved
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70'
              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70'
          }`}
        >
          {feedback}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {!isCurrentSolved ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={handleClear}
                disabled={currentPlacedIds.length === 0}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
              >
                <RotateCcw size={12} />
                <span>Clear</span>
              </button>
              <button
                type="button"
                onClick={handleShuffleTiles}
                className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
              >
                <Shuffle size={12} />
                <span>Shuffle</span>
              </button>
            </div>
            <button
              type="button"
              onClick={handleRevealLetter}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100"
            >
              <Lightbulb size={12} />
              <span>Reveal a letter</span>
            </button>
          </>
        ) : isAllSolved ? (
          <div className="flex w-full items-center justify-center rounded-2xl bg-teal-50/70 px-4 py-3">
            <span className="text-xs font-semibold text-teal-900">
              All {puzzle.items.length} words unscrambled!
            </span>
          </div>
        ) : (
          <div className="flex w-full justify-end">
            <button
              type="button"
              onClick={handleGoNextUnsolved}
              className="rounded-full bg-teal-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              Next word →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
