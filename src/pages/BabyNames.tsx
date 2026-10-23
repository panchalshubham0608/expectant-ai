import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Baby,
  Bookmark,
  Loader2,
  RefreshCw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import { generateAndSaveDailyDigestForToday } from '../services/dailyDigests/dailyDigestsGeneratorService';
import {
  getTodayDateId,
  subscribeToDailyDigest,
} from '../services/dailyDigests/dailyDigestsService';
import {
  shortlistBabyName,
  subscribeToFavoriteBabyNames,
  toFavoriteNameId,
  unshortlistBabyName,
} from '../services/dailyDigests/favoriteBabyNamesService';
import { getGeminiApiKey } from '../services/profiles/profileService';
import type {
  BabyNameGender,
  BabyNameSuggestion,
  DailyDigest,
  FavoriteBabyName,
} from '../models/dailyDigest';
import BabyNameSettingsDialog from '../components/profile/BabyNameSettingsDialog';

const GENDERS: BabyNameGender[] = ['Boy', 'Girl', 'Unisex'];

const GENDER_STYLES: Record<
  BabyNameGender,
  {
    badge: string;
    cardBg: string;
    dot: string;
    headerText: string;
    activeFilterBtn: string;
    label: string;
  }
> = {
  Boy: {
    badge: 'bg-blue-100 text-blue-700 ring-1 ring-blue-200/60',
    cardBg: 'from-blue-50/80 via-sky-50/40 to-white ring-blue-200/70',
    dot: 'bg-blue-500',
    headerText: 'text-blue-700',
    activeFilterBtn: 'bg-blue-600 text-white shadow-sm',
    label: 'Boy Names',
  },
  Girl: {
    badge: 'bg-pink-100 text-pink-700 ring-1 ring-pink-200/60',
    cardBg: 'from-pink-50/80 via-rose-50/40 to-white ring-pink-200/70',
    dot: 'bg-pink-500',
    headerText: 'text-pink-700',
    activeFilterBtn: 'bg-pink-500 text-white shadow-sm',
    label: 'Girl Names',
  },
  Unisex: {
    badge: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200/60',
    cardBg: 'from-purple-50/70 via-fuchsia-50/30 to-white ring-purple-200/70',
    dot: 'bg-purple-500',
    headerText: 'text-purple-700',
    activeFilterBtn: 'bg-purple-600 text-white shadow-sm',
    label: 'Unisex Names',
  },
};

const normalizeGender = (gender?: string): BabyNameGender => {
  const g = (gender || '').trim().toLowerCase();
  if (g === 'boy' || g === 'male') return 'Boy';
  if (g === 'girl' || g === 'female') return 'Girl';
  return 'Unisex';
};

export default function BabyNames() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const { profile, isLoading: isProfileLoading } = useProfile(userId, id);
  const [todayDigest, setTodayDigest] = useState<DailyDigest | null>(null);
  const [favorites, setFavorites] = useState<FavoriteBabyName[]>([]);
  const [isLoadingDigest, setIsLoadingDigest] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'shortlisted'>('daily');
  const [genderFilter, setGenderFilter] = useState<'All' | BabyNameGender>('All');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});

  const todayId = getTodayDateId();
  const babyNameContext = profile?.babyNameContext;
  const babyNameCount = profile?.babyNameCount;
  const isConfigured = Boolean(babyNameContext?.trim() && babyNameCount && babyNameCount > 0);

  const favoriteIdsSet = new Set(favorites.map((f) => f.id));

  useEffect(() => {
    if (!userId || !id) return;
    let mounted = true;

    const unsubscribeDigest = subscribeToDailyDigest(
      userId,
      id,
      todayId,
      (fetchedDigest) => {
        if (mounted) {
          setTodayDigest(fetchedDigest);
          setIsLoadingDigest(false);
        }
      },
      (err) => {
        if (mounted) {
          setError(err.message || 'Failed to load baby names');
          setIsLoadingDigest(false);
        }
      }
    );

    const unsubscribeFavorites = subscribeToFavoriteBabyNames(userId, id, (fetchedFavorites) => {
      if (mounted) {
        setFavorites(fetchedFavorites);
      }
    });

    return () => {
      mounted = false;
      unsubscribeDigest();
      unsubscribeFavorites();
    };
  }, [userId, id, todayId]);

  useEffect(() => {
    if (!userId || !id || !isConfigured) return;

    let mounted = true;
    const ensureTodayGenerated = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
        const generated = await generateAndSaveDailyDigestForToday(
          userId,
          id,
          apiKey || undefined,
          true
        );
        if (mounted) {
          setTodayDigest(generated);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to generate baby names');
        }
      } finally {
        if (mounted) {
          setIsGenerating(false);
        }
      }
    };

    ensureTodayGenerated();

    return () => {
      mounted = false;
    };
  }, [userId, id, isConfigured, babyNameContext, babyNameCount]);

  const handleRegenerateToday = async () => {
    if (!userId || !id) return;
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
      const refreshed = await generateAndSaveDailyDigestForToday(
        userId,
        id,
        apiKey || undefined,
        false
      );
      setTodayDigest(refreshed);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate baby names');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleShortlist = async (item: BabyNameSuggestion) => {
    if (!userId || !id) return;
    const favId = toFavoriteNameId(item.name);
    if (pendingIds[favId]) return;

    setPendingIds((prev) => ({ ...prev, [favId]: true }));
    try {
      if (favoriteIdsSet.has(favId)) {
        await unshortlistBabyName(userId, id, item.name);
      } else {
        await shortlistBabyName(userId, id, {
          name: item.name,
          meaning: item.meaning,
          gender: normalizeGender(item.gender),
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update shortlist');
    } finally {
      setPendingIds((prev) => ({ ...prev, [favId]: false }));
    }
  };

  const renderCategorizedNames = (names: BabyNameSuggestion[]) => {
    const filtered =
      genderFilter === 'All'
        ? names
        : names.filter((n) => normalizeGender(n.gender) === genderFilter);

    if (filtered.length === 0) {
      return (
        <p className="py-4 text-center text-xs text-gray-400">
          No {genderFilter.toLowerCase()} names in this list.
        </p>
      );
    }

    const gendersToShow = genderFilter === 'All' ? GENDERS : [genderFilter];

    return (
      <div className="space-y-5">
        {gendersToShow.map((genderKey) => {
          const group = filtered.filter((n) => normalizeGender(n.gender) === genderKey);
          if (group.length === 0) return null;
          const style = GENDER_STYLES[genderKey];

          return (
            <div key={genderKey} className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                <h4 className={`text-xs font-bold uppercase tracking-wider ${style.headerText}`}>
                  {style.label} ({group.length})
                </h4>
              </div>

              <div className="grid gap-2.5">
                {group.map((item, idx) => {
                  const favId = toFavoriteNameId(item.name);
                  const isShortlisted = favoriteIdsSet.has(favId);
                  const isPending = Boolean(pendingIds[favId]);

                  return (
                    <div
                      key={`${item.name}-${idx}`}
                      className={`rounded-2xl bg-gradient-to-br ${style.cardBg} p-4 ring-1 transition`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h5 className="text-base font-bold text-gray-900">{item.name}</h5>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
                          >
                            {genderKey}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleShortlist(item)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                            isShortlisted
                              ? 'bg-teal-600 text-white shadow-sm hover:bg-teal-700'
                              : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-teal-50 hover:text-teal-700 hover:ring-teal-200'
                          }`}
                          aria-label={
                            isShortlisted
                              ? `Remove ${item.name} from shortlist`
                              : `Shortlist ${item.name}`
                          }
                        >
                          <Bookmark
                            size={13}
                            className={isShortlisted ? 'fill-current' : ''}
                          />
                          <span>{isShortlisted ? 'Shortlisted' : 'Shortlist'}</span>
                        </button>
                      </div>

                      <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                        {item.meaning}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const todayNames = todayDigest?.babyNames ?? [];

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-teal-600 to-emerald-700 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Baby Name Ideas</h1>
            <p className="max-w-[260px] text-sm leading-relaxed text-teal-50/90">
              Personalized names and meanings curated daily for your little one.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30"
          >
            <SlidersHorizontal size={15} />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 space-y-4 px-4">
        {/* View Tabs (Daily vs Shortlisted) & Gender Filter */}
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === 'daily'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles size={14} />
              <span>Today&apos;s Picks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('shortlisted')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                activeTab === 'shortlisted'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bookmark size={14} />
              <span>Shortlisted ({favorites.length})</span>
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 px-1">
            {(['All', ...GENDERS] as const).map((filter) => {
              const isSelected = genderFilter === filter;
              const activeClass =
                filter === 'All'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : GENDER_STYLES[filter].activeFilterBtn;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setGenderFilter(filter)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    isSelected ? activeClass : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>
        </div>

        {isProfileLoading || isLoadingDigest ? (
          <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
            <span className="text-sm font-medium text-gray-500">Loading baby names...</span>
          </div>
        ) : activeTab === 'shortlisted' ? (
          <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            {favorites.length === 0 ? (
              <div className="py-6 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                  <Bookmark size={22} />
                </div>
                <h3 className="text-sm font-bold text-gray-900">No Shortlisted Names Yet</h3>
                <p className="mx-auto mt-1 max-w-xs text-xs text-gray-500">
                  Tap &ldquo;Shortlist&rdquo; on any daily baby name suggestion to save your
                  favorites here.
                </p>
              </div>
            ) : (
              renderCategorizedNames(favorites)
            )}
          </div>
        ) : !isConfigured ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
              <Baby size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Personalize Your Baby Name Ideas</h3>
            <p className="mx-auto mb-5 mt-1.5 max-w-xs text-xs leading-relaxed text-gray-500">
              Tell us the themes or inspirations you love and how many names you want to discover
              each day.
            </p>
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700"
            >
              <Sparkles size={16} />
              <span>Set Up Preferences</span>
            </button>
          </div>
        ) : (
          <>
            {/* Fancy "Your Vibe" Card */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#f0fdfa] via-white to-[#ecfdf5] p-5 shadow-sm ring-1 ring-teal-100/80">
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-teal-200/25 blur-2xl" />

              <div className="relative z-10 flex items-center gap-2">
                <Sparkles className="text-teal-600" size={16} />
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                  Your Vibe
                </span>
              </div>

              <p className="relative z-10 mt-2 text-sm leading-relaxed text-gray-700">
                {babyNameContext}
              </p>
            </div>

            {error && (
              <div className="rounded-3xl bg-red-50 p-4 text-xs text-red-700 ring-1 ring-red-100">
                {error}
              </div>
            )}

            {/* Direct Today's Names Card */}
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="text-teal-600" size={18} />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    Today&apos;s Generated Names
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleRegenerateToday}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 ring-1 ring-teal-100 transition hover:bg-teal-100/70 disabled:opacity-50"
                  title="Regenerate today's names"
                >
                  <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              {isGenerating && todayNames.length === 0 ? (
                <div className="flex items-center gap-3 py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-teal-600" />
                  <span className="text-sm font-medium text-gray-500">
                    Curating today&apos;s baby names...
                  </span>
                </div>
              ) : todayNames.length > 0 ? (
                renderCategorizedNames(todayNames)
              ) : (
                <div className="py-6 text-center text-sm text-gray-500">
                  Tap refresh to generate today&apos;s {babyNameCount} baby name ideas.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {userId && id && (
        <BabyNameSettingsDialog
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          userId={userId}
          profileId={id}
          initialContext={babyNameContext}
          initialCount={babyNameCount}
        />
      )}
    </div>
  );
}
