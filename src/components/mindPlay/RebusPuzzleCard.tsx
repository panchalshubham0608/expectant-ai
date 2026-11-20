import { useState } from 'react';
import { CheckCircle2, Eye, HelpCircle, Lightbulb } from 'lucide-react';
import type { RebusColorToken, RebusPuzzle, RebusVisualSpec } from '../../models/mindPuzzle';

interface RebusPuzzleCardProps {
  puzzle: RebusPuzzle;
  onSolved?: () => void;
  embedded?: boolean;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'] as const;

const COLOR_STYLES: Record<
  RebusColorToken,
  { text: string; badge: string; dot: string; label: string }
> = {
  blue: {
    text: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
    dot: 'bg-blue-500',
    label: 'Blue',
  },
  green: {
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dot: 'bg-emerald-500',
    label: 'Green',
  },
  gold: {
    text: 'text-amber-500',
    badge: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-400',
    label: 'Gold',
  },
  silver: {
    text: 'text-slate-400',
    badge: 'bg-slate-100 text-slate-600 ring-slate-300',
    dot: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400',
    label: 'Silver',
  },
  red: {
    text: 'text-rose-600',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
    dot: 'bg-rose-500',
    label: 'Red',
  },
  rose: {
    text: 'text-pink-500',
    badge: 'bg-pink-50 text-pink-700 ring-pink-200',
    dot: 'bg-pink-400',
    label: 'Rose',
  },
};

function RebusVisualStage({ visual }: { visual: RebusVisualSpec }) {
  const renderArt = () => {
    switch (visual.layout) {
      case 'stack':
        return (
          <div className="flex flex-col items-center gap-1.5 text-center">
            <span className="text-2xl font-black tracking-wide text-slate-900 sm:text-3xl">
              {visual.primary}
            </span>
            <span className="h-0.5 w-28 rounded-full bg-slate-300" aria-hidden="true" />
            <span className="text-2xl font-black tracking-wide text-sky-700 sm:text-3xl">
              {visual.secondary}
            </span>
          </div>
        );

      case 'between':
        return (
          <div className="flex flex-wrap items-center justify-center gap-2.5 text-center">
            <span className="text-xl font-black tracking-wide text-slate-800 sm:text-2xl">
              {visual.primary}
            </span>
            <span className="rounded-xl bg-sky-100/90 px-3 py-1 text-lg font-extrabold tracking-wide text-sky-800 ring-1 ring-sky-300/80 sm:text-xl">
              {visual.secondary}
            </span>
            <span className="text-xl font-black tracking-wide text-slate-800 sm:text-2xl">
              {visual.accent ?? visual.primary}
            </span>
          </div>
        );

      case 'repeat': {
        const count = Math.max(2, Math.min(4, visual.repeatCount ?? 2));
        return (
          <div className="flex flex-col items-center gap-1 text-center">
            {Array.from({ length: count }, (_, idx) => (
              <span
                key={idx}
                className="text-xl font-black tracking-widest text-slate-900 sm:text-2xl"
              >
                {visual.primary}
              </span>
            ))}
          </div>
        );
      }

      case 'size': {
        const isTiny = visual.sizeVariant !== 'giant';
        return (
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="flex min-h-[84px] min-w-[200px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-5 py-4">
              <span
                className={
                  isTiny
                    ? 'text-[11px] font-bold tracking-[0.22em] text-slate-700'
                    : 'text-4xl font-black tracking-tight text-slate-900 sm:text-5xl'
                }
              >
                {visual.primary}
              </span>
            </div>
            {visual.secondary && (
              <span className="text-sm font-bold tracking-wide text-slate-500">
                {visual.secondary}
              </span>
            )}
          </div>
        );
      }

      case 'direction': {
        const dir = visual.direction ?? 'upsideDown';
        if (dir === 'upsideDown') {
          return (
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="inline-block rotate-180 select-none text-3xl font-black tracking-widest text-slate-900 sm:text-4xl">
                {visual.primary}
              </span>
              {visual.secondary && (
                <span className="text-sm font-bold text-slate-500">{visual.secondary}</span>
              )}
            </div>
          );
        }

        if (dir === 'backwards') {
          const reversed = Array.from(visual.primary).reverse().join('');
          return (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="inline-flex items-center gap-2">
                <span className="text-lg font-bold text-sky-600" aria-hidden="true">
                  ←
                </span>
                <span className="text-3xl font-black tracking-widest text-slate-900 sm:text-4xl">
                  {reversed}
                </span>
              </div>
              {visual.secondary && (
                <span className="text-sm font-bold text-slate-500">{visual.secondary}</span>
              )}
            </div>
          );
        }

        // 'rising' or 'falling' diagonal stepped letters
        const letters = Array.from(visual.primary).slice(0, 14);
        const stepPx = letters.length > 7 ? 5 : 8;
        const mid = (letters.length - 1) / 2;
        return (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="inline-flex items-center justify-center gap-0.5">
              {letters.map((ch, idx) => {
                const offset = dir === 'rising' ? (mid - idx) * stepPx : (idx - mid) * stepPx;
                return (
                  <span
                    key={`${ch}-${idx}`}
                    style={{ transform: `translateY(${Math.round(offset)}px)` }}
                    className="inline-block text-2xl font-black tracking-wider text-slate-900 sm:text-3xl"
                  >
                    {ch === ' ' ? '\u00A0' : ch}
                  </span>
                );
              })}
            </div>
            {visual.secondary && (
              <span className="text-sm font-bold text-slate-500">{visual.secondary}</span>
            )}
          </div>
        );
      }

      case 'split':
        return (
          <div className="flex items-center justify-center gap-4 text-center">
            <span className="text-2xl font-black tracking-wider text-slate-900 sm:text-3xl">
              {visual.primary}
            </span>
            <div className="flex flex-col items-center gap-1" aria-hidden="true">
              <span className="h-3 w-0.5 rounded-full bg-sky-400" />
              <span className="h-2.5 w-0.5 rounded-full bg-sky-300" />
              <span className="h-3 w-0.5 rounded-full bg-sky-400" />
            </div>
            <span className="text-2xl font-black tracking-wider text-slate-900 sm:text-3xl">
              {visual.secondary}
            </span>
          </div>
        );

      case 'box': {
        const isInside = visual.boxPlacement === 'inside';
        if (isInside) {
          return (
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-24 min-w-[144px] items-center justify-center rounded-2xl border-2 border-slate-800 bg-white px-5 shadow-xs">
                <span className="text-2xl font-black tracking-wider text-slate-900">
                  {visual.primary}
                </span>
              </div>
              {visual.secondary && (
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {visual.secondary}
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex flex-wrap items-center justify-center gap-4 text-center">
            <div className="flex h-20 w-24 items-center justify-center rounded-xl border-2 border-slate-700 bg-white/90 shadow-xs">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                {visual.secondary || 'BOX'}
              </span>
            </div>
            <span className="text-2xl font-black tracking-wider text-sky-700 sm:text-3xl">
              {visual.primary}
            </span>
          </div>
        );
      }

      case 'colorWord': {
        const token = visual.color ?? 'blue';
        const palette = COLOR_STYLES[token] ?? COLOR_STYLES.blue;
        return (
          <div className="flex flex-col items-center gap-2.5 text-center">
            <span
              className={`text-3xl font-black tracking-widest drop-shadow-[0_1px_1px_rgba(15,23,42,0.12)] sm:text-4xl ${palette.text}`}
            >
              {visual.primary}
            </span>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-semibold text-slate-500 ring-1 ring-slate-200/80">
              <span className={`h-2.5 w-2.5 rounded-full ${palette.dot}`} aria-hidden="true" />
              <span>Color clue</span>
            </div>
            {visual.secondary && (
              <span className="text-sm font-bold text-slate-600">{visual.secondary}</span>
            )}
          </div>
        );
      }
    }
  };

  return (
    <div
      className="relative mt-4 flex min-h-[164px] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-slate-50 via-white to-sky-50/70 px-5 py-6 ring-1 ring-slate-200/80 shadow-inner"
      role="img"
      aria-label="Typographic visual word puzzle"
    >
      {/* Subtle editorial corner marks */}
      <span
        className="pointer-events-none absolute left-3 top-3 h-2.5 w-2.5 rounded-tl-md border-l-2 border-t-2 border-slate-200"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute right-3 top-3 h-2.5 w-2.5 rounded-tr-md border-r-2 border-t-2 border-slate-200"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-3 left-3 h-2.5 w-2.5 rounded-bl-md border-b-2 border-l-2 border-slate-200"
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute bottom-3 right-3 h-2.5 w-2.5 rounded-br-md border-b-2 border-r-2 border-slate-200"
        aria-hidden="true"
      />

      {renderArt()}
    </div>
  );
}

export default function RebusPuzzleCard({
  puzzle,
  onSolved,
  embedded = false,
}: RebusPuzzleCardProps) {
  const [triedWrongIndices, setTriedWrongIndices] = useState<number[]>([]);
  const [isSolved, setIsSolved] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showRules, setShowRules] = useState(false);

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
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
            <Eye size={11} />
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
        <div className="mt-2.5 space-y-1 rounded-2xl bg-sky-50/75 p-3 text-xs leading-relaxed text-sky-950 ring-1 ring-sky-200/70">
          <p>
            <strong>Goal:</strong> Decode the familiar phrase hidden in the visual word arrangement.
          </p>
          <p>
            <strong>How:</strong> Look closely at position (over/under/between), size, color,
            direction, breaks, or repetition — then pick the matching phrase below.
          </p>
        </div>
      )}

      {/* Editorial Typographic Visual Stage */}
      <RebusVisualStage visual={puzzle.visual} />

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

      {/* 4 Answer Choices */}
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
                    : 'bg-gray-50/80 text-gray-800 ring-1 ring-gray-200/80 hover:bg-sky-50/60 hover:ring-sky-300'
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  isCorrectChoice
                    ? 'bg-emerald-600 text-white'
                    : isTriedWrong
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-white text-sky-700 shadow-sm ring-1 ring-sky-100'
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
          Not quite that one — look again at how the words are arranged and try another choice.
        </p>
      )}

      {/* Explanation on completion */}
      {isSolved && (
        <div className="mt-4 rounded-2xl bg-emerald-50/90 p-4 ring-1 ring-emerald-200/70">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Clever eye!</p>
          <p className="mt-1 text-xs leading-relaxed text-emerald-950">{puzzle.explanation}</p>
        </div>
      )}
    </div>
  );
}
