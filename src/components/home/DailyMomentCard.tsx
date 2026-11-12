import { useEffect, useState } from 'react';
import { Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';
import { getTodayDateId, subscribeToDailyDigest } from '../../services/dailyDigests/dailyDigestsService';
import type { DailyDigest } from '../../models/dailyDigest';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import { useReminders } from '../../hooks/useReminders';
import { saveReminder } from '../../services/reminders/reminderService';
import MomentPreferenceCard from '../../features/health/components/MomentPreferenceCard';

interface DailyMomentCardProps {
  userId: string;
  profileId: string;
}

export default function DailyMomentCard({ userId, profileId }: DailyMomentCardProps) {
  const [moment, setMoment] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { reminders } = useReminders(userId, profileId);

  const momentPreference = reminders.find((r) => r.id === 'daily-moment');
  const isEnabled = momentPreference ? momentPreference.isActive !== false : true;

  useEffect(() => {
    const dateId = getTodayDateId();
    const unsubscribe = subscribeToDailyDigest(userId, profileId, dateId, (nextDigest) => {
      if (nextDigest) {
        setMoment(nextDigest);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [userId, profileId]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let mounted = true;

    const fetchMoment = async () => {
      try {
        // Check if the user has provided their own API key in their profile
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);

        const fetchedMoment = await generateAndSaveDailyDigestForToday(userId, profileId, apiKey || undefined);
        if (mounted) {
          setMoment(fetchedMoment);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load daily moment');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMoment();

    return () => {
      mounted = false;
    };
  }, [userId, profileId, isEnabled]);

  const handleEnable = async () => {
    await saveReminder(userId, profileId, {
      id: 'daily-moment',
      title: '✨ Today’s little wonder is ready',
      description: 'Here’s something amazing about you and your growing little one.',
      frequency: 'daily',
      times: undefined,
      isActive: true,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
      const refreshedMoment = await generateAndSaveDailyDigestForToday(
        userId,
        profileId,
        apiKey || undefined,
        false,
        ['category', 'header', 'card', 'emoji']
      );
      setMoment(refreshedMoment);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh daily moment');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="rounded-3xl bg-gradient-to-br from-[#f2fbf5] to-[#e4f7eb] p-5 shadow-sm ring-1 ring-green-200/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-green-100">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="text-green-600" size={14} />
                <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">
                  Daily Little Wonders
                </h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                Discover something new, fun, or meaningful about your pregnancy journey every day.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleEnable}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-green-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            <Sparkles size={13} />
            <span>Enable</span>
          </button>
        </div>
      </div>
    );
  }

  const hasMoment = Boolean(moment?.card?.title && moment?.card?.content);

  if ((isLoading || isRefreshing) && !hasMoment) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
        <span className="text-sm font-medium text-gray-500">Discovering today&apos;s moment...</span>
      </div>
    );
  }

  if ((error && !hasMoment) || !moment || !hasMoment) {
    // Fail silently so we don't break the user's dashboard view if AI fails
    return null;
  }

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-[#f2fbf5] to-[#e4f7eb] p-5 shadow-sm ring-1 ring-green-100/50">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="text-green-600" size={18} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">{moment.header}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full p-1.5 text-green-700 transition hover:bg-green-100/70 hover:text-green-900"
              aria-label="Daily little wonders preferences"
              title="Preferences"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              disabled={isRefreshing}
              className="rounded-full p-1.5 text-sm font-medium text-green-600 transition hover:bg-green-100/70 hover:text-green-700 disabled:opacity-50"
              onClick={handleRefresh}
              aria-label="Refresh daily moment"
              title="Refresh"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-gray-100">
            {moment.emoji || '✨'}
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-600">
              {moment.category.replace(/-/g, ' ')}
            </p>
            <h4 className="mb-1 text-base font-semibold text-gray-900">{moment.card.title}</h4>
            <p className="text-sm leading-relaxed text-gray-600">{moment.card.content}</p>
          </div>
        </div>
      </div>

      <MomentPreferenceCard
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
        profileId={profileId}
      />
    </>
  );
}