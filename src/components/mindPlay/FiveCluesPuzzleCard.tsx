import { useState } from 'react';
import { CheckCircle2, ChevronRight, Eye, HelpCircle, Search, Sparkles } from 'lucide-react';
import type { FiveCluesPuzzle } from '../../models/mindPuzzle';

interface FiveCluesPuzzleCardProps {
  puzzle: FiveCluesPuzzle;
  onSolved?: () => void;
  embedded?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function FiveCluesPuzzleCard({
  puzzle,
  onSolved,
  embedded = false,
}: FiveCluesPuzzleCardProps) {
  const [revealedCount, setRevealedCount] = useState(1);
  const [showChoices, setShowChoices] = useState(false);
  const [triedWrongIndices, setTriedWrongIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [showRules, setShowRules] = useState(false);

  const visibleClueCount = isSolved ? puzzle.clues.length : revealedCount;
  const remainingClues = puzzle.clues.length - revealedCount;
  const areChoicesVisible = showChoices || revealedCount >= puzzle.clues.length || isSolved;

  const handleRevealNextClue = () => {
    if (isSolved || revealedCount >= puzzle.clues.length) return;
    setRevealedCount((prev) => Math.min(puzzle.clues.length, prev + 1));
  };

  const handleChooseOption = (index: number) => {
    if (isSolved || triedWrongIndices.includes(index)) return;

    if (index === puzzle.correctIndex) {
      setIsSolved(true);
      onSolved?.();
    } else {
      setTriedWrongIndices((prev) => [...prev, index]);
    }
  };

  return (
    <div className={embedded ? '' : 'rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100'}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/70">
            <Search size={11} />
            <span>{puzzle.category}</span>
          </span>
          <h2 className="mt-1.5 text-lg font-bold text-gray-900">{puzzle.title}</h2>
        </div>

        <button
          type="button"
          onClick={() => setShowRules((v) => !v)}
          aria-expanded={showRules}
          className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
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
        <div className="mt-2.5 space-y-1 rounded-2xl bg-amber-50/75 p-3 text-xs leading-relaxed text-amber-950 ring-1 ring-amber-200/70">
          <p>
            <strong>Goal:</strong> Uncover the mystery subject from up to{' '}
            <strong>5 progressive clues</strong>, starting subtle and getting clearer.
          </p>
          <p>
            <strong>How:</strong> Guess early whenever it clicks by opening the 4 choices, or
            reveal as many clues as you like — zero penalty, no rush.
          </p>
        </div>
      )}

      {/* Clue progress dots */}
      <div className="mt-3.5 flex items-center justify-between px-0.5">
        <span className="text-xs font-medium text-gray-500">
          {isSolved
            ? 'All 5 clues revealed'
            : `Clue ${revealedCount} of ${puzzle.clues.length}`}
        </span>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {puzzle.clues.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 w-2 rounded-full transition ${
                idx < visibleClueCount
                  ? isSolved
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Progressive clue deck */}
      <div className="mt-2.5 space-y-2">
        {puzzle.clues.slice(0, visibleClueCount).map((clue, idx) => {
          const isLatest = !isSolved && idx === visibleClueCount - 1;
          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 rounded-2xl p-3.5 transition ${
                isLatest
                  ? 'bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white ring-1 ring-amber-200/80'
                  : 'bg-gray-50/80 ring-1 ring-gray-200/60'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                  isLatest
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-white text-amber-800 ring-1 ring-amber-200'
                }`}
              >
                {idx + 1}
              </span>
              <p className="text-sm leading-relaxed text-gray-800">{clue}</p>
            </div>
          );
        })}

        {/* Tactile stacked sealed-clue card inside the clue deck */}
        {!isSolved && remainingClues > 0 && (
          <div className={`relative ${remainingClues > 1 ? 'pb-1.5' : ''}`}>
            {remainingClues > 2 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-5 bottom-0 h-3 rounded-b-2xl border border-amber-200/60 bg-amber-50/40"
              />
            )}
            {remainingClues > 1 && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-2.5 bottom-0.5 h-3.5 rounded-b-2xl border border-amber-200/80 bg-amber-50/70"
              />
            )}
            <button
              type="button"
              onClick={handleRevealNextClue}
              className="group relative flex w-full items-center gap-3 rounded-2xl border border-dashed border-amber-300/90 bg-gradient-to-r from-amber-50/75 via-white to-orange-50/60 px-3.5 py-3 text-left shadow-xs transition hover:border-amber-400 hover:from-amber-50 hover:to-orange-50/90 hover:shadow-sm active:scale-[0.99]"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-amber-400 bg-white text-[11px] font-bold text-amber-700 transition group-hover:border-solid group-hover:bg-amber-500 group-hover:text-white">
                {revealedCount + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-950">
                  {remainingClues === 1
                    ? 'Reveal final clue'
                    : `Reveal Clue ${revealedCount + 1}`}
                </p>
                <p className="text-[11px] text-amber-800/75">
                  {remainingClues === 1
                    ? 'Clearest hint — unlocks the 4 choices too'
                    : 'Tap to flip the next sealed clue'}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100/90 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition group-hover:bg-amber-500 group-hover:text-white">
                <Eye size={12} />
                <span>{remainingClues === 1 ? 'Final' : `${remainingClues} left`}</span>
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Dedicated full-width Ready to Guess trigger */}
      {!isSolved && !areChoicesVisible && (
        <button
          type="button"
          onClick={() => setShowChoices(true)}
          className="mt-3.5 flex w-full items-center justify-between rounded-2xl bg-indigo-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
        >
          <span className="inline-flex items-center gap-2">
            <Sparkles size={14} />
            <span>Ready to guess? Show 4 choices</span>
          </span>
          <ChevronRight size={15} className="text-indigo-200" />
        </button>
      )}

      {/* 4 answer options */}
      {areChoicesVisible && (
        <div className="mt-4 space-y-2">
          {puzzle.options.map((option, idx) => {
            const isCorrectChoice = isSolved && idx === puzzle.correctIndex;
            const isTriedWrong = triedWrongIndices.includes(idx);

            return (
              <button
                key={`${option}-${idx}`}
                type="button"
                disabled={isSolved || isTriedWrong}
                onClick={() => handleChooseOption(idx)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                  isCorrectChoice
                    ? 'bg-emerald-50 text-emerald-950 ring-2 ring-emerald-400'
                    : isTriedWrong
                      ? 'bg-gray-50 text-gray-400 line-through ring-1 ring-gray-100'
                      : 'bg-gray-50/80 text-gray-800 ring-1 ring-gray-200/80 hover:bg-amber-50/60 hover:ring-amber-300'
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCorrectChoice
                      ? 'bg-emerald-600 text-white'
                      : isTriedWrong
                        ? 'bg-gray-200 text-gray-400'
                        : 'bg-white text-amber-800 shadow-sm ring-1 ring-amber-200/80'
                  }`}
                >
                  {isCorrectChoice ? <CheckCircle2 size={14} /> : OPTION_LABELS[idx]}
                </span>
                <span className="flex-1">{option}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Gentle retry prompt */}
      {!isSolved && triedWrongIndices.length > 0 && (
        <p className="mt-3 text-xs font-medium text-gray-500" role="status">
          {revealedCount < puzzle.clues.length
            ? 'Not quite that one — reveal another clue or try another choice.'
            : 'Not quite that one — take your time and try another choice.'}
        </p>
      )}

      {/* Explanation on solve */}
      {isSolved && (
        <div className="mt-4 rounded-2xl bg-emerald-50/90 p-4 ring-1 ring-emerald-200/70">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Mystery solved!
          </p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-950">{puzzle.explanation}</p>
        </div>
      )}
    </div>
  );
}
