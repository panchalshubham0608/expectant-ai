import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, LayoutGrid, Shuffle, Sparkles, Star, X } from 'lucide-react';
import {
  BUILT_IN_ACTIVITIES_CATALOG,
  BUILT_IN_CATEGORIES,
  PINNED_QUICK_BAR_ACTIVITY_ID,
  getTopRankedGameIds,
  type BuiltInActivityId,
  type BuiltInCategoryKey,
} from '../../utils/mindPlayCatalog';

interface GameCollectionModalProps {
  isOpen: boolean;
  activeActivityId: BuiltInActivityId;
  playCounts: Partial<Record<BuiltInActivityId, number>>;
  onSelect: (id: BuiltInActivityId) => void;
  onSurprise: () => void;
  onClose: () => void;
}

export default function GameCollectionModal({
  isOpen,
  activeActivityId,
  playCounts,
  onSelect,
  onSurprise,
  onClose,
}: GameCollectionModalProps) {
  const [category, setCategory] = useState<BuiltInCategoryKey>('all');

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

  // Show only #1, #2, #3 favorites (excluding pinned Calm Breathing) with zero play counts
  const rankByActivityId = useMemo(
    () => getTopRankedGameIds(playCounts, 3),
    [playCounts]
  );

  const filteredGames = useMemo(() => {
    const list =
      category === 'all'
        ? [...BUILT_IN_ACTIVITIES_CATALOG]
        : BUILT_IN_ACTIVITIES_CATALOG.filter((item) => item.category === category);

    return list.sort((a, b) => {
      const aRank = rankByActivityId.get(a.id);
      const bRank = rankByActivityId.get(b.id);
      if (aRank !== undefined && bRank !== undefined) return aRank - bRank;
      if (aRank !== undefined) return -1;
      if (bRank !== undefined) return 1;
      return 0;
    });
  }, [category, rankByActivityId]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 backdrop-blur-xs sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Built-in game collection"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="border-b border-gray-100 px-5 pb-3.5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                <LayoutGrid size={14} />
                <span>Game Collection</span>
              </div>
              <h2 className="mt-0.5 text-base font-bold text-gray-900">
                Browse all {BUILT_IN_ACTIVITIES_CATALOG.length} calm activities
              </h2>
              <p className="mt-0.5 text-[11px] text-gray-500">
                Your #1, #2, and #3 favorites appear in the quick bar alongside Calm Breathing.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close game collection"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 hover:text-gray-800"
            >
              <X size={16} />
            </button>
          </div>

          {/* Category Filter Chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5" role="tablist">
            {BUILT_IN_CATEGORIES.map((cat) => {
              const isSelected = category === cat.key;
              const count =
                cat.key === 'all'
                  ? BUILT_IN_ACTIVITIES_CATALOG.length
                  : BUILT_IN_ACTIVITIES_CATALOG.filter((g) => g.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setCategory(cat.key)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Game Cards */}
        <div
          className="flex-1 space-y-2 overflow-y-auto px-4 py-3.5"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {filteredGames.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === activeActivityId;
            const rank = rankByActivityId.get(item.id);
            const isPinned = item.id === PINNED_QUICK_BAR_ACTIVITY_ID;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelect(item.id);
                  onClose();
                }}
                className={`flex w-full items-start gap-3 rounded-2xl p-3 text-left transition active:scale-[0.99] ${
                  isActive
                    ? 'bg-indigo-50/80 ring-2 ring-indigo-500'
                    : 'bg-gray-50/80 ring-1 ring-gray-200/70 hover:bg-indigo-50/40 hover:ring-indigo-200'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : `bg-white ${item.iconClass} shadow-xs`
                  }`}
                >
                  <Icon size={18} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-900">{item.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.badgeClass}`}
                    >
                      {item.modeTag}
                    </span>
                    {rank !== undefined && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          rank === 1
                            ? 'bg-amber-50 text-amber-800 ring-1 ring-amber-200/80'
                            : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70'
                        }`}
                      >
                        {rank === 1 && <Star size={9} className="fill-amber-400 text-amber-500" />}
                        <span>{rank === 1 ? '#1 Favorite' : `#${rank}`}</span>
                      </span>
                    )}
                    {isPinned && (
                      <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700 ring-1 ring-sky-200/70">
                        Always pinned
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                    {item.description}
                  </p>
                </div>

                {isActive && (
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                    <Check size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sticky Footer with Quick Surprise Button */}
        <div
          className="border-t border-gray-100 bg-gray-50/80 px-4 py-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={() => {
              onSurprise();
              onClose();
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99]"
          >
            <Shuffle size={13} />
            <span>Pick a random surprise game for me</span>
            <Sparkles size={13} />
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
