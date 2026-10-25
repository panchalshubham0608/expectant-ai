import { useEffect, useState } from 'react';
import { BookOpen, Loader2, RefreshCw, SlidersHorizontal, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { generateAndSaveDailyDigestForToday } from '../../services/dailyDigests/dailyDigestsGeneratorService';
import { getTodayDateId, subscribeToDailyDigest } from '../../services/dailyDigests/dailyDigestsService';
import type { DailyDigest } from '../../models/dailyDigest';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import SpiritualSlokaSettingsDialog from '../profile/SpiritualSlokaSettingsDialog';

interface SpiritualSlokaCardProps {
  userId: string;
  profileId: string;
  spiritualSlokaContext?: string;
}

export default function SpiritualSlokaCard({
  userId,
  profileId,
  spiritualSlokaContext,
}: SpiritualSlokaCardProps) {
  const trimmedContext = spiritualSlokaContext?.trim() || '';
  const isConfigured = Boolean(trimmedContext);

  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [isLoading, setIsLoading] = useState(isConfigured);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useEffect(() => {
    if (!isSpeechSupported) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [isSpeechSupported]);

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
    if (!isConfigured) {
      return;
    }

    let mounted = true;

    const ensureSlokaGenerated = async () => {
      try {
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        if (mounted) {
          setIsLoading(true);
          setError(null);
        }
        const fetchedDigest = await generateAndSaveDailyDigestForToday(
          userId,
          profileId,
          apiKey || undefined,
          true
        );
        if (mounted) {
          setDigest(fetchedDigest);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load spiritual sloka');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    ensureSlokaGenerated();

    return () => {
      mounted = false;
    };
  }, [userId, profileId, isConfigured, trimmedContext]);

  const stopSpeaking = () => {
    if (isSpeechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const handleToggleSpeak = () => {
    const sloka = digest?.spiritualSloka;
    if (!isSpeechSupported || !sloka) return;

    if (isSpeaking) {
      stopSpeaking();
      return;
    }

    window.speechSynthesis.cancel();

    const availableVoices =
      voices.length > 0 ? voices : window.speechSynthesis.getVoices();
    const normalizeLang = (lang: string) => lang.toLowerCase().replace(/_/g, '-');

    const saVoice = availableVoices.find((v) => {
      const l = normalizeLang(v.lang);
      return l === 'sa' || l.startsWith('sa-');
    });
    const hiVoice = availableVoices.find((v) => {
      const l = normalizeLang(v.lang);
      return l === 'hi' || l.startsWith('hi-');
    });
    const enInVoice = availableVoices.find((v) => normalizeLang(v.lang) === 'en-in');
    const enVoice = availableVoices.find((v) => {
      const l = normalizeLang(v.lang);
      return l === 'en' || l.startsWith('en-');
    });

    const hasDevanagari = /[\u0900-\u097F]/.test(sloka.originalScript);
    const cleanedVerseText = sloka.originalScript.replace(/[।॥]/g, '. ');

    const verseUtterance = new SpeechSynthesisUtterance(cleanedVerseText);

    if (hasDevanagari) {
      const selectedIndicVoice = saVoice || hiVoice;
      if (selectedIndicVoice) {
        verseUtterance.voice = selectedIndicVoice;
        verseUtterance.lang = selectedIndicVoice.lang;
      } else {
        // Fallback to hi-IN locale tag so the OS synthesizer speaks Devanagari instead of English
        verseUtterance.lang = 'hi-IN';
      }
    } else {
      const selectedVoice = saVoice || hiVoice || enInVoice || enVoice;
      if (selectedVoice) {
        verseUtterance.voice = selectedVoice;
        verseUtterance.lang = selectedVoice.lang;
      } else {
        verseUtterance.lang = 'en-IN';
      }
    }

    verseUtterance.rate = 0.85;

    verseUtterance.onend = () => setIsSpeaking(false);
    verseUtterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(verseUtterance);
  };

  const handleRefresh = async () => {
    stopSpeaking();
    setIsRefreshing(true);
    setError(null);
    try {
      const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
      const refreshedDigest = await generateAndSaveDailyDigestForToday(
        userId,
        profileId,
        apiKey || undefined,
        false,
        ['spiritualSloka']
      );
      setDigest(refreshedDigest);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to refresh spiritual sloka');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!isConfigured) {
    return (
      <>
        <div className="rounded-3xl bg-gradient-to-br from-[#fffbeb] via-[#fff7ed] to-[#fef3c7]/60 p-5 shadow-sm ring-1 ring-amber-200/60">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-xl shadow-sm ring-1 ring-amber-100">
                🪷
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="text-amber-600" size={14} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    Daily Spiritual Sloka
                  </h3>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  Receive a daily comforting verse, meaning, and pregnancy reflection tailored to
                  your spiritual traditions and themes.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-700"
            >
              <Sparkles size={13} />
              <span>Set Up</span>
            </button>
          </div>
        </div>

        <SpiritualSlokaSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={userId}
          profileId={profileId}
          initialContext={spiritualSlokaContext}
        />
      </>
    );
  }

  const sloka = digest?.spiritualSloka;

  if ((isLoading || isRefreshing) && !sloka) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
        <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
        <span className="text-sm font-medium text-gray-500">
          Preparing today&apos;s spiritual sloka...
        </span>
      </div>
    );
  }

  if (error && !sloka) {
    return null;
  }

  if (!sloka) {
    return null;
  }

  return (
    <>
      <div className="rounded-3xl bg-gradient-to-br from-[#fffbeb] via-[#fff7ed] to-[#fef3c7]/60 p-5 shadow-sm ring-1 ring-amber-200/60">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BookOpen className="text-amber-700" size={17} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
              Daily Spiritual Sloka
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            {isSpeechSupported && (
              <button
                type="button"
                onClick={handleToggleSpeak}
                className={`rounded-full p-1.5 transition ${
                  isSpeaking
                    ? 'bg-amber-600 text-white shadow-sm hover:bg-amber-700'
                    : 'text-amber-700 hover:bg-amber-100/70 hover:text-amber-900'
                }`}
                aria-label={isSpeaking ? 'Stop reading sloka' : 'Read sloka aloud'}
                title={isSpeaking ? 'Stop reading' : 'Read aloud'}
              >
                {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="rounded-full p-1.5 text-amber-700 transition hover:bg-amber-100/70 hover:text-amber-900"
              aria-label="Spiritual sloka preferences"
              title="Spiritual sloka preferences"
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="rounded-full p-1.5 text-amber-700 transition hover:bg-amber-100/70 hover:text-amber-900 disabled:opacity-50"
              aria-label="Refresh spiritual sloka"
              title="Refresh spiritual sloka"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        <div className="mb-3">
          <span className="inline-block rounded-full bg-amber-100/80 px-3 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200/60">
            {sloka.source}
          </span>
        </div>

        <div className="rounded-2xl bg-white/85 p-4 shadow-sm ring-1 ring-amber-100/80">
          <p className="whitespace-pre-line text-base font-semibold leading-relaxed text-gray-900">
            {sloka.originalScript}
          </p>
          <p className="mt-2 whitespace-pre-line text-xs italic leading-relaxed text-amber-900/80">
            {sloka.transliteration}
          </p>
        </div>

        <div className="mt-3.5 space-y-2.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Translation
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-gray-700">{sloka.translation}</p>
          </div>

          <div className="rounded-2xl bg-amber-100/40 p-3.5 ring-1 ring-amber-200/50">
            <div className="mb-1 flex items-center gap-1.5">
              <Sparkles className="text-amber-700" size={13} />
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                Pregnancy Reflection
              </p>
            </div>
            <p className="text-xs leading-relaxed text-gray-700">{sloka.reflection}</p>
          </div>
        </div>
      </div>

      <SpiritualSlokaSettingsDialog
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        userId={userId}
        profileId={profileId}
        initialContext={spiritualSlokaContext}
      />
    </>
  );
}
