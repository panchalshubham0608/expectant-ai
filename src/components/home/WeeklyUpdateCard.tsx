import { useEffect, useState } from 'react';
import { Loader2, CalendarHeart, Sparkles, AlertCircle, Baby, Heart, Lightbulb } from 'lucide-react';
import { generateAndSaveWeeklyUpdate, getWeeklyUpdateForCurrentWeek } from '../../services/weeklyUpdates/weeklyUpdatesGeneratorService';
import type { WeeklyUpdate } from '../../models/weeklyUpdate';
import { getGeminiApiKey } from '../../services/profiles/profileService';

interface WeeklyUpdateCardProps {
  userId: string;
  profileId: string;
}

export default function WeeklyUpdateCard({ userId, profileId }: WeeklyUpdateCardProps) {
  const [update, setUpdate] = useState<WeeklyUpdate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUpdate = async () => {
      try {
        const fetchedUpdate = await getWeeklyUpdateForCurrentWeek(userId, profileId);
        if (mounted) {
          setUpdate(fetchedUpdate);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to check weekly update');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchUpdate();

    return () => {
      mounted = false;
    };
  }, [userId, profileId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
      const generatedUpdate = await generateAndSaveWeeklyUpdate(userId, profileId, apiKey || undefined);
      setUpdate(generatedUpdate);
    } catch (err: any) {
      setError(err.message || 'Failed to generate weekly update');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
        <span className="text-sm font-medium text-gray-500">Checking for weekly insights...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl bg-red-50 p-6 text-center shadow-sm ring-1 ring-red-100/50">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600">
          <AlertCircle size={20} />
        </div>
        <h3 className="text-sm font-bold text-red-900">Oops, something went wrong</h3>
        <p className="mb-4 mt-1 text-xs text-red-700">{error}</p>
        <button
          onClick={handleGenerate}
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
    );
  }

  if (!update) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 text-center shadow-sm ring-1 ring-purple-100/50">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-purple-600 shadow-sm ring-1 ring-gray-100">
          <CalendarHeart size={24} />
        </div>
        <h3 className="text-sm font-bold text-gray-900">✨ Your week, beautifully unfolding</h3>
        <p className="mb-4 mt-1 text-xs text-gray-500">
          Discover what's happening with your little one, what's changing, and what's ahead.
        </p>
        <button
          onClick={handleGenerate}
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
              <span>Discover This Week</span>
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2.5rem] bg-white shadow-sm ring-1 ring-gray-100">
      {/* Cover Image (if available) */}
      {update.visuals && update.visuals.length > 0 && update.visuals[0].url && (
        <div className="relative h-48 w-full bg-gray-100 sm:h-64">
          <img
            src={update.visuals[0].url}
            alt={update.visuals[0].title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur-md">
                <CalendarHeart size={14} /> Week {update.pregnancyWeek || update.week}
              </span>
            </div>
            <h3 className="text-2xl font-bold">{update.header}</h3>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Fallback header if no image */}
        {(!update.visuals || !update.visuals.length || !update.visuals[0].url) && (
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-800">
                <CalendarHeart size={14} /> Week {update.pregnancyWeek || update.week}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">{update.header}</h3>
            <p className="mt-1 text-gray-500">{update.subtitle}</p>
          </div>
        )}

        {/* Subtitle if image is present */}
        {update.visuals && update.visuals.length > 0 && update.visuals[0].url && (
          <p className="mb-6 text-lg font-medium text-gray-600">{update.subtitle}</p>
        )}

        {/* Size Comparison */}
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
          {/* Baby Development */}
          {update.baby && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-base font-bold text-gray-900">
                <Baby size={18} className="text-blue-500" /> {update.baby.title}
              </h4>
              <p className="text-sm leading-relaxed text-gray-600">{update.baby.description}</p>
            </div>
          )}

          {/* Highlights */}
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

          {/* Body Changes */}
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

          {/* Tip */}
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
  );
}