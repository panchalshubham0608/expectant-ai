import { useState } from 'react';
import { CheckCircle2, Lightbulb, Sparkles } from 'lucide-react';
import type { RiddlePuzzle } from '../../models/mindPuzzle';

interface RiddlePuzzleCardProps {
  puzzle: RiddlePuzzle;
  onSolved?: () => void;
  embedded?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

export default function RiddlePuzzleCard({
  puzzle,
  onSolved,
  embedded = false,
}: RiddlePuzzleCardProps) {
  const [triedWrongIndices, setTriedWrongIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);

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
      <div>
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700">
          <Sparkles size={11} />
          {puzzle.category}
        </span>
        <h2 className="mt-1.5 text-lg font-bold text-gray-900">{puzzle.title}</h2>
      </div>

      {/* Question prompt */}
      <div className="mt-4 rounded-2xl bg-gradient-to-br from-violet-50/70 via-purple-50/40 to-white p-4 ring-1 ring-violet-100">
        <p className="text-sm font-medium leading-relaxed text-gray-800">{puzzle.question}</p>
      </div>

      {/* Optional gentle hint */}
      {!isSolved && (
        <div className="mt-3">
          {showHint ? (
            <div className="flex items-start gap-2 rounded-2xl bg-amber-50/80 px-3.5 py-2.5 text-xs text-amber-900 ring-1 ring-amber-200/70">
              <Lightbulb size={14} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="leading-relaxed">{puzzle.hint}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200/70 transition hover:bg-amber-100"
            >
              <Lightbulb size={13} />
              <span>Need a gentle hint?</span>
            </button>
          )}
        </div>
      )}

      {/* Answer options */}
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
                    : 'bg-gray-50/80 text-gray-800 ring-1 ring-gray-200/80 hover:bg-violet-50/60 hover:ring-violet-300'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrectChoice
                    ? 'bg-emerald-600 text-white'
                    : isTriedWrong
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-white text-violet-700 shadow-sm ring-1 ring-violet-100'
                }`}
              >
                {isCorrectChoice ? <CheckCircle2 size={14} /> : OPTION_LABELS[idx]}
              </span>
              <span className="flex-1">{option}</span>
            </button>
          );
        })}
      </div>

      {/* Gentle retry prompt */}
      {!isSolved && triedWrongIndices.length > 0 && (
        <p className="mt-3 text-xs font-medium text-gray-500" role="status">
          Not quite that one — take your time and try another choice.
        </p>
      )}

      {/* Explanation on completion */}
      {isSolved && (
        <div className="mt-4 rounded-2xl bg-emerald-50/90 p-4 ring-1 ring-emerald-200/70">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Spot on!</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-950">{puzzle.explanation}</p>
        </div>
      )}
    </div>
  );
}
