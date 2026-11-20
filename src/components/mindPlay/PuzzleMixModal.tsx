import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Eye,
  EyeOff,
  Lightbulb,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Type,
  X,
} from 'lucide-react';
import { ALL_MIND_PUZZLE_KINDS, type MindPuzzleKind } from '../../models/mindPuzzle';
import {
  type MindPuzzlePreferences,
  type PuzzleKindPreferenceMode,
} from '../../utils/mindPuzzlePreferences';

interface PuzzleMixModalProps {
  isOpen: boolean;
  preferences: MindPuzzlePreferences;
  isRefreshing: boolean;
  onSave: (
    nextOverrides: Record<MindPuzzleKind, PuzzleKindPreferenceMode>,
    refreshToday: boolean
  ) => void;
  onReset: () => void;
  onClose: () => void;
}

const KIND_META: Record<
  MindPuzzleKind,
  {
    label: string;
    description: string;
    icon: typeof Search;
    iconBox: string;
  }
> = {
  fiveClues: {
    label: '5-Clue Mystery',
    description: 'Uncover a cozy mystery across 5 progressive clues.',
    icon: Search,
    iconBox: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
  },
  rebus: {
    label: 'Word Picture',
    description: 'Crisp typographic & visual wordplay cards.',
    icon: Eye,
    iconBox: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70',
  },
  wordScramble: {
    label: 'Word Scramble',
    description: 'Unscramble 4 themed words with warm clues.',
    icon: Type,
    iconBox: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200/70',
  },
  riddle: {
    label: 'Brain Teasers',
    description: 'Gentle riddles, wordplay, and pattern sparks.',
    icon: Lightbulb,
    iconBox: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200/70',
  },
};

export default function PuzzleMixModal({
  isOpen,
  preferences,
  isRefreshing,
  onSave,
  onReset,
  onClose,
}: PuzzleMixModalProps) {
  const [draftOverrides, setDraftOverrides] = useState<
    Record<MindPuzzleKind, PuzzleKindPreferenceMode>
  >(preferences.overrides);

  useEffect(() => {
    if (!isOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') return null;

  const enabledCount = ALL_MIND_PUZZLE_KINDS.filter(
    (kind) => draftOverrides[kind] !== 'hidden'
  ).length;

  const handleSetMode = (kind: MindPuzzleKind, mode: PuzzleKindPreferenceMode) => {
    if (mode === 'hidden' && draftOverrides[kind] !== 'hidden' && enabledCount <= 1) {
      return;
    }
    setDraftOverrides((prev) => ({ ...prev, [kind]: mode }));
  };

  const maxAffinity = Math.max(...ALL_MIND_PUZZLE_KINDS.map((k) => preferences.affinity[k]));
  const minAffinity = Math.min(...ALL_MIND_PUZZLE_KINDS.map((k) => preferences.affinity[k]));
  const hasLearnedSpread = maxAffinity - minAffinity >= 0.75;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Customize daily puzzle mix"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-5 pb-3.5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <SlidersHorizontal size={14} />
                <span>Customize Mix</span>
              </div>
              <h2 className="mt-0.5 text-base font-bold text-gray-900">
                Tailor your daily puzzle variety
              </h2>
              <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">
                Your mix quietly adapts as you play. Favorite styles you love or hide any you want
                to skip.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close customize mix"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable Variety Rows */}
        <div className="flex-1 space-y-2.5 overflow-y-auto px-4 py-3.5">
          {ALL_MIND_PUZZLE_KINDS.map((kind) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            const currentMode = draftOverrides[kind];
            const isLastVisible = currentMode !== 'hidden' && enabledCount <= 1;
            const isQuietlyPreferred =
              currentMode === 'auto' &&
              hasLearnedSpread &&
              preferences.affinity[kind] >= maxAffinity - 0.35 &&
              preferences.affinity[kind] > 0.5;

            return (
              <div
                key={kind}
                className={`rounded-2xl p-3.5 transition ${
                  currentMode === 'hidden'
                    ? 'bg-gray-50/70 opacity-75 ring-1 ring-gray-200/60'
                    : currentMode === 'favorite'
                      ? 'bg-indigo-50/50 ring-1 ring-indigo-200'
                      : 'bg-gray-50/90 ring-1 ring-gray-200/70'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${meta.iconBox}`}
                  >
                    <Icon size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-900">{meta.label}</p>
                      {isQuietlyPreferred && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                          <Sparkles size={9} />
                          <span>Often enjoyed</span>
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                      {meta.description}
                    </p>
                  </div>
                </div>

                {/* 3-way preference control */}
                <div
                  className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white p-1 ring-1 ring-gray-200/70"
                  role="group"
                  aria-label={`${meta.label} preference`}
                >
                  <button
                    type="button"
                    onClick={() => handleSetMode(kind, 'auto')}
                    aria-pressed={currentMode === 'auto'}
                    className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      currentMode === 'auto'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetMode(kind, 'favorite')}
                    aria-pressed={currentMode === 'favorite'}
                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition ${
                      currentMode === 'favorite'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Star size={11} />
                    <span>Favorite</span>
                  </button>
                  <button
                    type="button"
                    disabled={isLastVisible}
                    onClick={() => handleSetMode(kind, 'hidden')}
                    aria-pressed={currentMode === 'hidden'}
                    title={
                      isLastVisible ? 'Keep at least one puzzle variety enabled' : undefined
                    }
                    className={`inline-flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      currentMode === 'hidden'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <EyeOff size={11} />
                    <span>Hide</span>
                  </button>
                </div>
              </div>
            );
          })}

          {enabledCount <= 1 && (
            <p className="px-1 text-[11px] text-gray-400">
              At least one puzzle variety stays active so your daily feed is never empty.
            </p>
          )}
        </div>

        {/* Footer */}
        <div
          className="border-t border-gray-100 bg-gray-50/80 px-4 pt-3"
          style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftOverrides({
                  fiveClues: 'auto',
                  rebus: 'auto',
                  wordScramble: 'auto',
                  riddle: 'auto',
                });
                onReset();
              }}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-200/70 hover:text-gray-800"
            >
              <RotateCcw size={12} />
              <span>Reset learning</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => onSave(draftOverrides, false)}
                className="rounded-full bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 ring-1 ring-gray-200 transition hover:bg-gray-100 disabled:opacity-60"
              >
                Save mix
              </button>
              <button
                type="button"
                disabled={isRefreshing}
                onClick={() => onSave(draftOverrides, true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {isRefreshing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                <span>Apply today</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
