import { useEffect, useState } from 'react';
import { HeartHandshake, Loader2, RefreshCw, SlidersHorizontal, Sparkles } from 'lucide-react';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';
import { getTodayDateId, subscribeToDailyDigest } from '../../services/dailyDigests/dailyDigestsService';
import type { DailyDigest } from '../../models/dailyDigest';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import BabyTalkSettingsDialog from '../profile/BabyTalkSettingsDialog';

interface BabyTalkCardProps {
  userId: string;
  profileId: string;
  babyTalkEnabled?: boolean;
  babyTalkContext?: string;
}

export default function BabyTalkCard({
  userId,
  profileId,
  babyTalkEnabled,
  babyTalkContext,
}: BabyTalkCardProps) {
  const isEnabled = Boolean(babyTalkEnabled);
  const trimmedContext = babyTalkContext?.trim() || '';

  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(isEnabled);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [scriptLang, setScriptLang] = useState<'english' | 'native'>('english');

  useEffect(() => {
    const dateId = getTodayDateId();
    const unsubscribe = subscribeToDailyDigest(userId, profileId, dateId, (nextDigest) => {
      if (nextDigest) {
        setDigest(nextDigest);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [userId, profileId]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    let mounted = true;

    const ensureBabyTalkGenerated = async () => {
      try {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        if (mounted) {
          setIsLoading(true);
          setError(null);
        }
        let fetchedDigest = await generateAndSaveDailyDigestForToday(
          userId,
          profileId,
          apiKey || undefined,
          true
        );
        if (fetchedDigest.babyTalk && fetchedDigest.babyTalk.nativeScript === undefined) {
          fetchedDigest = await generateAndSaveDailyDigestForToday(
            userId,
            profileId,
            apiKey || undefined,
            false,
            ['babyTalk']
          );
        }
        if (mounted) {
          setDigest(fetchedDigest);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load womb talk idea');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    ensureBabyTalkGenerated();

    return () => {
      mounted = false;
    };
  }, [userId, profileId, isEnabled, trimmedContext]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setError(null);
    try {
      const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
      const refreshedDigest = await generateAndSaveDailyDigestForToday(
        userId,
        profileId,
        apiKey || undefined,
        false,
        ['babyTalk']
      );
      setDigest(refreshedDigest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh womb talk idea');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isEnabled) {
    return (
      <>
        <div className="rounded-3xl bg-gradient-to-br from-[#fff1f2] via-[#ffe4e6]/50 to-[#fff7ed] p-5 shadow-sm ring-1 ring-rose-200/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-rose-100">
                🤰
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="text-rose-600" size={14} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                    Talking to the Womb
                  </h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Get a daily bonding prompt and a soothing message you can read aloud to your
                  little one.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
            >
              <Sparkles size={13} />
              <span>Enable</span>
            </button>
          </div>
        </div>

        <BabyTalkSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={userId}
          profileId={profileId}
          initialEnabled={babyTalkEnabled}
          initialContext={babyTalkContext}
        />
      </>
    );
  }

  const babyTalk = digest?.babyTalk;

  if ((isLoading || isRefreshing) && !babyTalk) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-rose-100">
        <Loader2 className="h-5 w-5 animate-spin text-rose-600" />
        <span className="text-sm font-medium text-gray-500">
          Preparing today&apos;s womb bonding idea...
        </span>
      </div>
    );
  }

  if (error && !babyTalk) {
    return null;
  }

  if (!babyTalk) {
    return null;
  }

  const hasNativeScript = Boolean(babyTalk.nativeScript?.trim());
  const nativeLabel = babyTalk.nativeLanguage?.trim() || 'Native';
  const displayedScript =
    hasNativeScript && scriptLang === 'native' ? babyTalk.nativeScript! : babyTalk.script;

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-[#fff1f2] via-[#ffe4e6]/50 to-[#fff7ed] p-5 shadow-sm ring-1 ring-rose-200/60">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <HeartHandshake className="text-rose-600" size={17} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Talking to the Womb
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full p-1.5 text-rose-700 transition hover:bg-rose-100/70 hover:text-rose-900"
              aria-label="Talking to the womb preferences"
              title="Preferences"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full p-1.5 text-rose-700 transition hover:bg-rose-100/70 hover:text-rose-900 disabled:opacity-50"
              aria-label="Refresh womb talk idea"
              title="Refresh"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <h4 className="text-base font-bold text-gray-900">{babyTalk.title}</h4>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{babyTalk.prompt}</p>

        <div className="mt-3.5 rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-rose-100/80">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="text-rose-600" size={13} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
                Say to Your Little One
              </p>
            </div>
            {hasNativeScript && (
              <div className="inline-flex rounded-full bg-rose-50 p-0.5 ring-1 ring-rose-200/70">
                <button
                  type="button"
                  onClick={() => setScriptLang('english')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    scriptLang === 'english'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setScriptLang('native')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition ${
                    scriptLang === 'native'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  {nativeLabel}
                </button>
              </div>
            )}
          </div>
          <p className="whitespace-pre-line text-sm italic leading-relaxed text-gray-800">
            &ldquo;{displayedScript}&rdquo;
          </p>
        </div>
      </div>

      <BabyTalkSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
        profileId={profileId}
        initialEnabled={babyTalkEnabled}
        initialContext={babyTalkContext}
      />
    </>
  );
}
