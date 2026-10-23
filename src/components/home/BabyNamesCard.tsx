import { useEffect, useState } from 'react';
import { Baby, Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';
import { getTodayDateId, subscribeToDailyDigest } from '../../services/dailyDigests/dailyDigestsService';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import type { BabyNameSuggestion, DailyDigest } from '../../models/dailyDigest';
import BabyNameSettingsDialog from '../profile/BabyNameSettingsDialog';

interface BabyNamesCardProps {
  userId: string;
  profileId: string;
  babyNameContext?: string;
  babyNameCount?: number;
}

export default function BabyNamesCard({
  userId,
  profileId,
  babyNameContext,
  babyNameCount,
}: BabyNamesCardProps) {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const isConfigured = Boolean(babyNameContext?.trim() && babyNameCount && babyNameCount > 0);

  useEffect(() => {
    const dateId = getTodayDateId();
    const unsubscribe = subscribeToDailyDigest(userId, profileId, dateId, (nextDigest) => {
      setDigest(nextDigest);
    });
    return () => unsubscribe();
  }, [userId, profileId]);

  useEffect(() => {
    if (!isConfigured) return;

    let mounted = true;
    const ensureBabyNamesGenerated = async () => {
      setIsGenerating(true);
      try {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        const generated = await generateAndSaveDailyDigestForToday(
          userId,
          profileId,
          apiKey || undefined,
          true
        );
        if (mounted) {
          setDigest(generated);
        }
      } catch {
        // Handled silently on dashboard
      } finally {
        if (mounted) {
          setIsGenerating(false);
        }
      }
    };

    ensureBabyNamesGenerated();

    return () => {
      mounted = false;
    };
  }, [userId, profileId, isConfigured, babyNameContext, babyNameCount]);

  const handleRefresh = async () => {
    setIsGenerating(true);
    try {
      const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
      const refreshed = await generateAndSaveDailyDigestForToday(
        userId,
        profileId,
        apiKey || undefined,
        false
      );
      setDigest(refreshed);
    } catch {
      // Handled silently on dashboard
    } finally {
      setIsGenerating(false);
    }
  };

  const babyNames: BabyNameSuggestion[] = digest?.babyNames ?? [];

  if (!isConfigured) {
    return (
      <>
        <div className="rounded-3xl bg-gradient-to-br from-[#fff7f9] to-[#fceef2] p-5 shadow-sm ring-1 ring-rose-100/60">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-100">
                <Baby size={22} />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                  Daily Baby Names
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Discover personalized baby name ideas every day tailored to your preferences.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="shrink-0 rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              Set up
            </button>
          </div>
        </div>
        <BabyNameSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={userId}
          profileId={profileId}
          initialContext={babyNameContext}
          initialCount={babyNameCount}
        />
      </>
    );
  }

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-[#fff7f9] to-[#fceef2] p-5 shadow-sm ring-1 ring-rose-100/60">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-rose-600" size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Today&apos;s Baby Name Ideas
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full p-1.5 text-rose-600 transition hover:bg-rose-100/60 hover:text-rose-700"
              aria-label="Baby name preferences"
              title="Customize baby name preferences"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isGenerating}
              className="rounded-full p-1.5 text-rose-600 transition hover:bg-rose-100/60 hover:text-rose-700 disabled:opacity-50"
              aria-label="Refresh baby names"
              title="Regenerate today's moment and baby names"
            >
              <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <p className="mb-4 line-clamp-2 rounded-2xl bg-white/70 px-3.5 py-2 text-xs text-gray-600 ring-1 ring-rose-100/50">
          <span className="font-semibold text-rose-700">Your vibe:</span> {babyNameContext}
        </p>

        {isGenerating && babyNames.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl bg-white/80 p-4">
            <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
            <span className="text-sm font-medium text-gray-500">
              Curating today&apos;s baby names...
            </span>
          </div>
        ) : babyNames.length > 0 ? (
          <div className="grid gap-3">
            {babyNames.map((item, idx) => (
              <div
                key={`${item.name}-${idx}`}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-rose-100/50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-bold text-gray-900">{item.name}</h4>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {item.origin && (
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200/60">
                        {item.origin}
                      </span>
                    )}
                    {item.gender && (
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200/60">
                        {item.gender}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{item.meaning}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-2xl bg-white/80 p-4 text-sm text-gray-500">
            <span>Tap refresh to generate today&apos;s {babyNameCount} baby name ideas.</span>
          </div>
        )}
      </div>

      <BabyNameSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
        profileId={profileId}
        initialContext={babyNameContext}
        initialCount={babyNameCount}
      />
    </>
  );
}
