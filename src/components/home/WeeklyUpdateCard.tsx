import { useEffect, useState, useRef } from 'react';
import { Loader2, CalendarHeart, Sparkles, AlertCircle, Baby, Heart, Lightbulb, RefreshCw, Users, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { WeeklyUpdate } from '../../models/weeklyUpdate';

interface WeeklyUpdateCardProps {
  updates: WeeklyUpdate[];
  currentWeek: number | null;
  isLoading: boolean;
  error: string | null;
  onGenerate: () => Promise<void>;
  onRegenerate: (week: number) => Promise<void>;
}

export default function WeeklyUpdateCard({
  updates,
  currentWeek,
  isLoading,
  error,
  onGenerate,
  onRegenerate
}: WeeklyUpdateCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const hasAutoExpanded = useRef(false);

  useEffect(() => {
    if (updates.length > 0 && !hasAutoExpanded.current) {
      setExpandedId(updates[0].id);
      hasAutoExpanded.current = true;
    }
  }, [updates]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLocalError(null);
    try {
      await onGenerate();
    } catch (err: any) {
      setLocalError(err.message || 'Failed to generate weekly update');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async (e: React.MouseEvent, week: number) => {
    e.stopPropagation();
    setIsGenerating(true);
    setLocalError(null);
    try {
      await onRegenerate(week);
    } catch (err: any) {
      setLocalError(err.message || 'Failed to regenerate weekly update');
    } finally {
      setIsGenerating(false);
    }
  };

  const displayError = localError || error;

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
        <span className="text-sm font-medium text-gray-500">Checking for weekly insights...</span>
      </div>
    );
  }

  const hasCurrentWeekUpdate = currentWeek ? updates.some(u => String(u.id) === String(currentWeek) || String(u.pregnancyWeek) === String(currentWeek)) : false;

  return (
    <div className="space-y-4">
      {displayError && (
        <div className="rounded-3xl bg-red-50 p-6 text-center shadow-sm ring-1 ring-red-100/50">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-bold text-red-900">Oops, something went wrong</h3>
          <p className="mb-4 mt-1 text-xs text-red-700">{displayError}</p>
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Trying again...</span>
              </>
            ) : (
              <span>Try Again</span>
            )}
          </button>
        </div>
      )}

      {currentWeek && !hasCurrentWeekUpdate && !displayError && (
        <div className="rounded-3xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 text-center shadow-sm ring-1 ring-purple-100/50">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-600 shadow-sm ring-1 ring-gray-100">
            <CalendarHeart size={24} />
          </div>
          <h3 className="text-sm font-bold text-gray-900">Week {currentWeek} Insights are Ready</h3>
          <p className="mb-4 mt-1 text-xs text-gray-500">
            Discover what's happening with your little one, what's changing, and what's ahead.
          </p>
          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Curating insights...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Generate Week {currentWeek} Update</span>
              </>
            )}
          </button>
        </div>
      )}

      {updates.length === 0 && !currentWeek && !isLoading && !displayError && (
        <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">No weekly updates available yet.</p>
        </div>
      )}

      <div className="space-y-4">
        {updates.map((update) => {
          const isExpanded = expandedId === update.id;
          const displayWeek = update.id || update.pregnancyWeek || update.week;

          return (
            <div key={update.id} className={`relative overflow-hidden bg-white shadow-sm ring-1 ring-gray-100 transition-all duration-300 ${isExpanded ? 'rounded-[2.5rem]' : 'rounded-3xl hover:shadow-md hover:ring-gray-200'}`}>
              <div 
                onClick={() => setExpandedId(isExpanded ? null : update.id)}
                className={`flex items-center justify-between p-5 sm:p-6 cursor-pointer select-none transition-colors ${isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-2xl shadow-sm ring-1 ring-purple-100/50">
                    {update.sizeComparison?.emoji || update.emoji || '📏'}
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                        <CalendarHeart size={12} /> Week {displayWeek}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-gray-900">{update.header}</h3>
                  </div>
                </div>
                <div className="shrink-0 ml-4 flex items-center justify-center h-8 w-8 rounded-full bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 transition-colors">
                  {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
                  {update.visuals && update.visuals.length > 0 && update.visuals[0].url && (
                    <div className="relative h-48 w-full bg-gray-100 sm:h-64">
                      <img
                        src={update.visuals[0].url}
                        alt={update.visuals[0].title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>
                  )}

                  <div className="p-6 relative">
                    {String(displayWeek) === String(currentWeek) && (
                      <button
                        onClick={(e) => handleRegenerate(e, Number(displayWeek))}
                        disabled={isGenerating}
                        className="absolute right-6 top-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-purple-50 text-purple-600 shadow-sm ring-1 ring-purple-100 transition-all hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Regenerate missing visuals"
                      >
                        <RefreshCw size={18} className={isGenerating ? 'animate-spin' : ''} />
                      </button>
                    )}

                    <p className={`mb-6 text-lg font-medium text-gray-600 ${String(displayWeek) === String(currentWeek) ? 'pr-12' : ''}`}>{update.subtitle}</p>

                    {update.sizeComparison && (
                      <div className="mb-6 flex items-start gap-4 rounded-3xl bg-gradient-to-br from-fuchsia-50 to-purple-50 p-4 ring-1 ring-purple-100/50">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl shadow-sm">
                          {update.sizeComparison.emoji}
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-purple-600">Baby Size</p>
                          <p className="font-semibold text-gray-900">{update.sizeComparison.object}</p>
                          <p className="mt-1 text-sm text-gray-600">{update.sizeComparison.description}</p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6">
                      {update.baby && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                            <Baby size={18} className="text-blue-500" /> {update.baby.title}
                          </h4>
                          <p className="text-sm leading-relaxed text-gray-600">{update.baby.description}</p>
                        </div>
                      )}

                      {update.highlights && update.highlights.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
                            <Sparkles size={18} className="text-amber-500" /> Key Highlights
                          </h4>
                          <div className="space-y-3">
                            {update.highlights.map((h, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"></div>
                                <p className="text-sm leading-relaxed text-gray-600">
                                  <strong className="text-gray-900">{h.title}: </strong>
                                  {h.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {update.bodyChanges && update.bodyChanges.length > 0 && (
                        <div>
                          <h4 className="mb-3 flex items-center gap-2 text-base font-bold text-gray-900">
                            <Heart size={18} className="text-rose-500" /> Your Body
                          </h4>
                          <div className="space-y-3">
                            {update.bodyChanges.map((b, i) => (
                              <div key={i} className="flex gap-3">
                                <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400"></div>
                                <p className="text-sm leading-relaxed text-gray-600">
                                  <strong className="text-gray-900">{b.title}: </strong>
                                  {b.description}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {update.coupleMoment && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                            <Users size={18} className="text-teal-500" /> {update.coupleMoment.title}
                          </h4>
                          <p className="text-sm leading-relaxed text-gray-600">{update.coupleMoment.content}</p>
                        </div>
                      )}

                      {update.comingUp && (
                        <div>
                          <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                            <Calendar size={18} className="text-indigo-500" /> {update.comingUp.title}
                          </h4>
                          <p className="text-sm leading-relaxed text-gray-600">{update.comingUp.content}</p>
                        </div>
                      )}

                      {update.tip && (
                        <div className="rounded-3xl bg-amber-50 p-5 ring-1 ring-amber-100/50">
                          <div className="mb-2 flex items-center gap-2">
                            <Lightbulb size={18} className="text-amber-600" />
                            <h4 className="font-bold text-amber-900">{update.tip.title}</h4>
                          </div>
                          <p className="text-sm leading-relaxed text-amber-800">{update.tip.content}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}