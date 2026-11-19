import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Lightbulb,
  Shuffle,
  Sparkles,
} from 'lucide-react';
import type { ConnectionsDifficulty, ConnectionsPuzzle } from '../../models/mindPuzzle';

interface ConnectionsPuzzleCardProps {
  puzzle: ConnectionsPuzzle;
  onSolved?: () => void;
  embedded?: boolean;
}

const DIFFICULTY_STYLES: Record<
  ConnectionsDifficulty,
  { bg: string; badge: string; label: string }
> = {
  gentle: {
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Gentle',
  },
  cozy: {
    bg: 'bg-sky-50 border-sky-200 text-sky-950',
    badge: 'bg-sky-100 text-sky-800',
    label: 'Cozy',
  },
  clever: {
    bg: 'bg-violet-50 border-violet-200 text-violet-950',
    badge: 'bg-violet-100 text-violet-800',
    label: 'Clever',
  },
  tricky: {
    bg: 'bg-amber-50 border-amber-200 text-amber-950',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Tricky',
  },
};

const shuffleStrings = (items: string[]): string[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function ConnectionsPuzzleCard({
  puzzle,
  onSolved,
  embedded = false,
}: ConnectionsPuzzleCardProps) {
  const allWords = useMemo(
    () => shuffleStrings(puzzle.groups.flatMap((g) => [...g.words])),
    [puzzle]
  );

  const [remainingWords, setRemainingWords] = useState<string[]>(allWords);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [solvedGroupIndices, setSolvedGroupIndices] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ tone: 'info' | 'warm' | 'success'; text: string } | null>(
    null
  );
  const [hintLevel, setHintLevel] = useState<number>(0);

  const isCompleted = solvedGroupIndices.length === puzzle.groups.length;

  const firstUnsolvedIndex = puzzle.groups.findIndex((_, idx) => !solvedGroupIndices.includes(idx));
  const hintGroup = firstUnsolvedIndex >= 0 ? puzzle.groups[firstUnsolvedIndex] : null;

  const toggleWord = (word: string) => {
    if (isCompleted) return;
    setFeedback(null);
    setSelectedWords((prev) => {
      if (prev.includes(word)) {
        return prev.filter((w) => w !== word);
      }
      if (prev.length >= 4) return prev;
      return [...prev, word];
    });
  };

  const handleSubmit = () => {
    if (selectedWords.length !== 4 || isCompleted) return;
    const selectedSet = new Set(selectedWords.map((w) => w.toLowerCase()));

    let matchedGroupIndex = -1;
    let bestOverlap = 0;

    puzzle.groups.forEach((group, idx) => {
      if (solvedGroupIndices.includes(idx)) return;
      const overlap = group.words.filter((w) => selectedSet.has(w.toLowerCase())).length;
      if (overlap === 4) {
        matchedGroupIndex = idx;
      }
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
      }
    });

    if (matchedGroupIndex !== -1) {
      const matchedWordsLower = new Set(
        puzzle.groups[matchedGroupIndex].words.map((w) => w.toLowerCase())
      );
      const nextSolved = [...solvedGroupIndices, matchedGroupIndex];
      setSolvedGroupIndices(nextSolved);
      setRemainingWords((prev) => prev.filter((w) => !matchedWordsLower.has(w.toLowerCase())));
      setSelectedWords([]);
      setHintLevel(0);

      if (nextSolved.length === puzzle.groups.length) {
        setFeedback({
          tone: 'success',
          text: 'Lovely work! You found all four peaceful connections.',
        });
        onSolved?.();
      } else {
        setFeedback({
          tone: 'success',
          text: `Found "${puzzle.groups[matchedGroupIndex].category}"!`,
        });
      }
      return;
    }

    if (bestOverlap === 3) {
      setFeedback({
        tone: 'warm',
        text: 'So close — 3 of those words belong together!',
      });
    } else {
      setFeedback({
        tone: 'info',
        text: 'Not quite a group yet — take your time and try another combination.',
      });
    }
  };

  const handleShuffle = () => {
    setRemainingWords((prev) => shuffleStrings(prev));
  };

  const handleHint = () => {
    if (!hintGroup || isCompleted) return;
    if (hintLevel === 0) {
      setHintLevel(1);
      setFeedback({
        tone: 'warm',
        text: `Hint: Look for four words connected to "${hintGroup.category}".`,
      });
    } else {
      setHintLevel(2);
      const twoStarterWords = hintGroup.words.slice(0, 2);
      setSelectedWords(twoStarterWords);
      setFeedback({
        tone: 'warm',
        text: `Selected two words from "${hintGroup.category}" to get you started.`,
      });
    }
  };

  const handleRevealAll = () => {
    setSolvedGroupIndices([0, 1, 2, 3]);
    setRemainingWords([]);
    setSelectedWords([]);
    setFeedback({
      tone: 'info',
      text: 'All four groups revealed. Try a fresh puzzle whenever you feel like it!',
    });
    onSolved?.();
  };

  return (
    <div className={embedded ? '' : 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100'}>
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700">
          <Sparkles size={11} />
          Calm Word Connections
        </span>
        <h2 className="mt-1.5 text-lg font-bold text-gray-900">{puzzle.title}</h2>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{puzzle.themeHint}</p>
      </div>

      {/* Clear, beginner-friendly instructions */}
      {!isCompleted && (
        <div className="mt-3 rounded-2xl bg-blue-50/70 px-3.5 py-2.5 text-xs leading-relaxed text-blue-950 ring-1 ring-blue-100">
          <span className="font-bold text-blue-800">How to play:</span> Tap{' '}
          <span className="font-semibold">4 words</span> that share a common theme, then tap{' '}
          <span className="font-semibold">Check group</span>. Uncover all{' '}
          <span className="font-semibold">4 groups</span> at your own pace—unlimited tries, and
          tap <span className="font-semibold">Hint</span> anytime for a clue.
        </div>
      )}

      {/* Solved groups */}
      {solvedGroupIndices.length > 0 && (
        <div className="mt-4 space-y-2">
          {solvedGroupIndices.map((idx) => {
            const group = puzzle.groups[idx];
            const style = DIFFICULTY_STYLES[group.difficulty];
            return (
              <div
                key={group.category}
                className={`rounded-2xl border px-4 py-3 text-center transition ${style.bg}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0 opacity-80" />
                  <p className="text-xs font-bold uppercase tracking-wider">{group.category}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${style.badge}`}>
                    {style.label}
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium opacity-90">{group.words.join(' · ')}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Remaining words grid */}
      {!isCompleted && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-gray-500">
                Groups found: {solvedGroupIndices.length} of 4
              </span>
              <div className="flex items-center gap-1" aria-hidden="true">
                {[0, 1, 2, 3].map((dot) => (
                  <span
                    key={dot}
                    className={`h-2 w-2 rounded-full transition ${
                      dot < solvedGroupIndices.length ? 'bg-emerald-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            {selectedWords.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setSelectedWords([]);
                  setFeedback(null);
                }}
                className="text-[11px] font-semibold text-gray-500 underline-offset-2 transition hover:text-gray-800 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {remainingWords.map((word) => {
              const isSelected = selectedWords.includes(word);
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => toggleWord(word)}
                  aria-pressed={isSelected}
                  className={`min-h-[3.1rem] rounded-2xl px-2.5 py-2 text-center text-xs font-semibold leading-snug transition active:scale-[0.98] ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300'
                      : 'bg-gray-50 text-gray-800 ring-1 ring-gray-200/80 hover:bg-indigo-50/60'
                  }`}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Gentle feedback banner */}
      {feedback && (
        <div
          role="status"
          className={`mt-3 rounded-2xl px-3.5 py-2.5 text-xs font-medium ${
            feedback.tone === 'success'
              ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/70'
              : feedback.tone === 'warm'
                ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/70'
                : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Controls */}
      {!isCompleted && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleShuffle}
              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-200"
            >
              <Shuffle size={12} />
              <span>Shuffle</span>
            </button>
            <button
              type="button"
              onClick={handleHint}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100"
            >
              <Lightbulb size={12} />
              <span>{hintLevel === 0 ? 'Hint' : 'Nudge me'}</span>
            </button>
            <button
              type="button"
              onClick={handleRevealAll}
              className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <Eye size={12} />
              <span>Reveal</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedWords.length !== 4}
            className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            Check group ({selectedWords.length}/4)
          </button>
        </div>
      )}
    </div>
  );
}
