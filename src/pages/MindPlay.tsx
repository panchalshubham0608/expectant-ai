import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flower2,
  Grid3X3,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Palette,
  Play,
  Puzzle,
  RefreshCw,
  Shuffle,
  Sparkles,
  Type,
  Wind,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import {
  countDailyMindPuzzles,
  sanitizeDailyMindPuzzles,
  type DailyMindPuzzles,
  type MindPuzzleKind,
} from '../models/mindPuzzle';
import { getGeminiApiKey } from '../services/profiles/profileService';
import {
  getTodayDateId,
  subscribeToDailyDigest,
} from '../services/dailyDigests/dailyDigestsService';
import {
  ensureTodayMindPuzzles,
  regenerateAllMindPuzzles,
} from '../services/dailyDigests/mindPuzzlesGeneratorService';
import { getFallbackDailyMindPuzzles } from '../utils/fallbackMindPuzzles';
import ConnectionsPuzzleCard from '../components/mindPlay/ConnectionsPuzzleCard';
import WordScrambleCard from '../components/mindPlay/WordScrambleCard';
import RiddlePuzzleCard from '../components/mindPlay/RiddlePuzzleCard';
import PuzzlePlayModal from '../components/mindPlay/PuzzlePlayModal';
import CalmSudokuActivity from '../components/mindPlay/CalmSudokuActivity';
import MemoryMatchActivity from '../components/mindPlay/MemoryMatchActivity';
import MandalaColoringActivity from '../components/mindPlay/MandalaColoringActivity';
import CalmBreathingActivity from '../components/mindPlay/CalmBreathingActivity';

type MainTab = 'ai' | 'builtin';
type PuzzleFilter = 'all' | MindPuzzleKind;
type BuiltInActivityKind = 'sudoku' | 'memory' | 'mandala' | 'breathing';

interface PuzzleCardEntry {
  kind: MindPuzzleKind;
  index: number;
  id: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  isSolved: boolean;
}

const PUZZLE_FILTERS: {
  key: PuzzleFilter;
  label: string;
  subtitle: string;
  icon: typeof LayoutGrid;
  iconClass: string;
  activeClass: string;
}[] = [
  {
    key: 'all',
    label: 'All Puzzles',
    subtitle: 'Calm daily mix',
    icon: LayoutGrid,
    iconClass: 'text-indigo-600',
    activeClass: 'bg-indigo-600 text-white shadow-sm',
  },
  {
    key: 'connections',
    label: 'Connections',
    subtitle: 'Group 4 related words',
    icon: Puzzle,
    iconClass: 'text-blue-600',
    activeClass: 'bg-blue-600 text-white shadow-sm',
  },
  {
    key: 'wordScramble',
    label: 'Word Scramble',
    subtitle: 'Themed word clues',
    icon: Type,
    iconClass: 'text-teal-600',
    activeClass: 'bg-teal-600 text-white shadow-sm',
  },
  {
    key: 'riddle',
    label: 'Brain Teasers',
    subtitle: 'Riddles & patterns',
    icon: Lightbulb,
    iconClass: 'text-violet-600',
    activeClass: 'bg-violet-600 text-white shadow-sm',
  },
];

const PUZZLE_KIND_STYLES: Record<
  MindPuzzleKind,
  {
    icon: typeof Puzzle;
    iconBox: string;
    badge: string;
    accentRing: string;
  }
> = {
  connections: {
    icon: Puzzle,
    iconBox: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    badge: 'bg-blue-50 text-blue-700',
    accentRing: 'hover:ring-blue-200',
  },
  wordScramble: {
    icon: Type,
    iconBox: 'bg-teal-50 text-teal-600 ring-1 ring-teal-100',
    badge: 'bg-teal-50 text-teal-700',
    accentRing: 'hover:ring-teal-200',
  },
  riddle: {
    icon: Lightbulb,
    iconBox: 'bg-violet-50 text-violet-600 ring-1 ring-violet-100',
    badge: 'bg-violet-50 text-violet-700',
    accentRing: 'hover:ring-violet-200',
  },
};

const BUILTIN_ACTIVITIES: {
  key: BuiltInActivityKind;
  label: string;
  subtitle: string;
  icon: typeof Grid3X3;
  iconClass: string;
  activeClass: string;
}[] = [
  {
    key: 'sudoku',
    label: 'Mini Sudoku',
    subtitle: '4×4 & 6×6 calm logic',
    icon: Grid3X3,
    iconClass: 'text-indigo-600',
    activeClass: 'bg-indigo-600 text-white shadow-sm',
  },
  {
    key: 'memory',
    label: 'Memory Match',
    subtitle: 'Botanical pairs',
    icon: Flower2,
    iconClass: 'text-emerald-600',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
  },
  {
    key: 'mandala',
    label: 'Mandala Art',
    subtitle: 'Tap-to-color calm',
    icon: Palette,
    iconClass: 'text-violet-600',
    activeClass: 'bg-violet-600 text-white shadow-sm',
  },
  {
    key: 'breathing',
    label: 'Calm Breathing',
    subtitle: 'Guided 4–2–4 pacer',
    icon: Wind,
    iconClass: 'text-sky-600',
    activeClass: 'bg-sky-600 text-white shadow-sm',
  },
];

const getSolvedStorageKey = (profileId: string, dateId: string): string =>
  `mindPlaySolved:${profileId}:${dateId}`;

const loadSolvedIds = (profileId: string | undefined, dateId: string): Record<string, boolean> => {
  if (!profileId) return {};
  try {
    const raw = localStorage.getItem(getSolvedStorageKey(profileId, dateId));
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return {};
    const map: Record<string, boolean> = {};
    for (const entry of parsed.slice(0, 60)) {
      if (typeof entry === 'string' && entry.length > 0 && entry.length <= 64) {
        map[entry] = true;
      }
    }
    return map;
  } catch {
    return {};
  }
};

const saveSolvedIds = (profileId: string, dateId: string, solvedMap: Record<string, boolean>) => {
  try {
    const ids = Object.keys(solvedMap).filter((k) => solvedMap[k]).slice(0, 60);
    localStorage.setItem(getSolvedStorageKey(profileId, dateId), JSON.stringify(ids));
  } catch {
    // Ignore storage quota or private-mode errors
  }
};

export default function MindPlay() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const { profile, isLoading: isProfileLoading, error: profileError } = useProfile(userId, id);
  const todayId = getTodayDateId();

  const [activeTab, setActiveTab] = useState<MainTab>('ai');
  const [puzzleFilter, setPuzzleFilter] = useState<PuzzleFilter>('all');
  const [activeModalSlot, setActiveModalSlot] = useState<{
    kind: MindPuzzleKind;
    index: number;
  } | null>(null);
  const [activeBuiltIn, setActiveBuiltIn] = useState<BuiltInActivityKind>('sudoku');

  const [puzzles, setPuzzles] = useState<DailyMindPuzzles | null>(null);
  const [isUsingOfflineFallback, setIsUsingOfflineFallback] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isEnsuringAi, setIsEnsuringAi] = useState(false);
  const [regeneratingTarget, setRegeneratingTarget] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [sessionSolvedByKey, setSessionSolvedByKey] = useState<
    Record<string, Record<string, boolean>>
  >({});

  const solvedStorageKey = id ? getSolvedStorageKey(id, todayId) : '';

  const solvedPuzzleIds = useMemo(() => {
    const persisted = loadSolvedIds(id, todayId);
    const session = solvedStorageKey ? sessionSolvedByKey[solvedStorageKey] : undefined;
    return session ? { ...persisted, ...session } : persisted;
  }, [id, todayId, solvedStorageKey, sessionSolvedByKey]);

  useEffect(() => {
    if (!userId || !id) return;
    let mounted = true;

    const unsubscribe = subscribeToDailyDigest(
      userId,
      id,
      todayId,
      (digest) => {
        if (!mounted) return;
        const sanitized = sanitizeDailyMindPuzzles(digest?.mindPuzzles);
        if (sanitized) {
          setPuzzles(sanitized);
          setIsUsingOfflineFallback(false);
        }
        setIsLoadingInitial(false);
      },
      () => {
        if (!mounted) return;
        setIsLoadingInitial(false);
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId, id, todayId]);

  const hasProfile = Boolean(profile);

  useEffect(() => {
    if (!userId || !id || !hasProfile) return;
    let mounted = true;

    const loadTodayPuzzles = async () => {
      setIsEnsuringAi(true);
      setAiError(null);
      try {
        const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
        const ensured = await ensureTodayMindPuzzles(userId, id, apiKey || undefined);
        if (mounted) {
          setPuzzles(ensured);
          setIsUsingOfflineFallback(false);
        }
      } catch (err: unknown) {
        if (mounted) {
          const message =
            err instanceof Error
              ? err.message
              : 'Could not load AI puzzles right now. You can still enjoy built-in activities.';
          setAiError(message);
        }
      } finally {
        if (mounted) {
          setIsEnsuringAi(false);
        }
      }
    };

    loadTodayPuzzles();

    return () => {
      mounted = false;
    };
  }, [userId, id, hasProfile]);

  const handleRegenerateAll = async () => {
    if (!userId || !id || regeneratingTarget !== null) return;
    setRegeneratingTarget('all');
    setAiError(null);

    try {
      const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
      const refreshed = await regenerateAllMindPuzzles(userId, id, apiKey || undefined);
      setPuzzles(refreshed);
      setActiveModalSlot(null);
      setIsUsingOfflineFallback(false);
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Could not refresh today’s puzzles right now. Please try again.'
      );
    } finally {
      setRegeneratingTarget(null);
    }
  };

  const handleUseOfflineSamples = () => {
    setPuzzles(getFallbackDailyMindPuzzles());
    setActiveModalSlot(null);
    setIsUsingOfflineFallback(true);
    setAiError(null);
  };

  const markSolved = (puzzleId?: string) => {
    if (!puzzleId || !id || !solvedStorageKey) return;
    if (solvedPuzzleIds[puzzleId]) return;
    const nextForDay = { ...solvedPuzzleIds, [puzzleId]: true };
    saveSolvedIds(id, todayId, nextForDay);
    setSessionSolvedByKey((prev) => ({
      ...prev,
      [solvedStorageKey]: {
        ...(prev[solvedStorageKey] ?? {}),
        [puzzleId]: true,
      },
    }));
  };

  // Interleave categories when viewing All so the feed stays lively and varied
  const { allEntries, allUnsolvedCards, unsolvedCards, solvedCards } = useMemo(() => {
    if (!puzzles) {
      return {
        allEntries: [] as PuzzleCardEntry[],
        allUnsolvedCards: [] as PuzzleCardEntry[],
        unsolvedCards: [] as PuzzleCardEntry[],
        solvedCards: [] as PuzzleCardEntry[],
      };
    }

    const entries: PuzzleCardEntry[] = [];
    const maxLen = Math.max(
      puzzles.connections.length,
      puzzles.wordScramble.length,
      puzzles.riddle.length
    );

    for (let i = 0; i < maxLen; i++) {
      const conn = puzzles.connections[i];
      if (conn) {
        entries.push({
          kind: 'connections',
          index: i,
          id: conn.id,
          title: conn.title,
          subtitle: conn.themeHint,
          badgeLabel: 'Word Connections',
          isSolved: Boolean(solvedPuzzleIds[conn.id]),
        });
      }

      const scramble = puzzles.wordScramble[i];
      if (scramble) {
        entries.push({
          kind: 'wordScramble',
          index: i,
          id: scramble.id,
          title: scramble.title,
          subtitle: `Theme: ${scramble.theme}`,
          badgeLabel: 'Word Scramble',
          isSolved: Boolean(solvedPuzzleIds[scramble.id]),
        });
      }

      const riddle = puzzles.riddle[i];
      if (riddle) {
        entries.push({
          kind: 'riddle',
          index: i,
          id: riddle.id,
          title: riddle.title,
          subtitle: riddle.question,
          badgeLabel: riddle.category || 'Brain Teaser',
          isSolved: Boolean(solvedPuzzleIds[riddle.id]),
        });
      }
    }

    const filtered =
      puzzleFilter === 'all' ? entries : entries.filter((e) => e.kind === puzzleFilter);

    return {
      allEntries: entries,
      allUnsolvedCards: entries.filter((e) => !e.isSolved),
      unsolvedCards: filtered.filter((e) => !e.isSolved),
      solvedCards: filtered.filter((e) => e.isSolved),
    };
  }, [puzzles, puzzleFilter, solvedPuzzleIds]);

  const totalAiPuzzles = countDailyMindPuzzles(puzzles);

  if (isProfileLoading) {
    return (
      <div className="rounded-3xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        Loading Mindful Play…
      </div>
    );
  }

  if (!profile || !userId || !id) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <p className="text-lg font-semibold text-gray-900">Profile not found</p>
        <p className="mt-2 text-sm text-gray-500">
          {profileError || 'This profile may have been removed or is unavailable.'}
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-flex rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Back to profiles
        </Link>
      </div>
    );
  }

  const isBusyLoadingAi = (isLoadingInitial || isEnsuringAi) && totalAiPuzzles === 0;

  const modalConnections =
    activeModalSlot?.kind === 'connections'
      ? puzzles?.connections[activeModalSlot.index]
      : undefined;
  const modalWordScramble =
    activeModalSlot?.kind === 'wordScramble'
      ? puzzles?.wordScramble[activeModalSlot.index]
      : undefined;
  const modalRiddle =
    activeModalSlot?.kind === 'riddle' ? puzzles?.riddle[activeModalSlot.index] : undefined;

  const modalPuzzleId = modalConnections?.id || modalWordScramble?.id || modalRiddle?.id;
  const modalTitle =
    modalConnections?.title || modalWordScramble?.title || modalRiddle?.title || 'Play puzzle';

  const isModalOpen = Boolean(modalConnections || modalWordScramble || modalRiddle);
  const isModalPuzzleSolved = Boolean(modalPuzzleId && solvedPuzzleIds[modalPuzzleId]);

  const filteredUnsolvedOthers = unsolvedCards.filter((card) => card.id !== modalPuzzleId);
  const allUnsolvedOthers = allUnsolvedCards.filter((card) => card.id !== modalPuzzleId);
  const nextUnsolvedPool =
    filteredUnsolvedOthers.length > 0 ? filteredUnsolvedOthers : allUnsolvedOthers;
  const hasNextUnsolved = nextUnsolvedPool.length > 0;

  const handlePlayNext = () => {
    if (!hasNextUnsolved) return;
    const picked = nextUnsolvedPool[Math.floor(Math.random() * nextUnsolvedPool.length)];
    setAiError(null);
    setActiveModalSlot({ kind: picked.kind, index: picked.index });
  };

  const handleSurpriseMe = () => {
    const pool =
      unsolvedCards.length > 0
        ? unsolvedCards
        : allUnsolvedCards.length > 0
          ? allUnsolvedCards
          : allEntries;

    if (pool.length === 0) return;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    setAiError(null);
    setActiveModalSlot({ kind: picked.kind, index: picked.index });
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-indigo-50 backdrop-blur-sm">
              <Sparkles size={12} />
              <span>Calm Focus &amp; Joy</span>
            </div>
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-white">Mindful Play</h1>
            <p className="max-w-[260px] text-sm leading-relaxed text-indigo-100/90">
              Drop in anytime today for gentle daily puzzles, calm sudoku, mandala coloring, and
              mindful breathing.
            </p>
          </div>

          {activeTab === 'ai' && (
            <button
              type="button"
              onClick={handleRegenerateAll}
              disabled={regeneratingTarget !== null || isEnsuringAi}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-md transition hover:bg-white/30 disabled:opacity-60"
            >
              {regeneratingTarget === 'all' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <RefreshCw size={13} />
              )}
              <span>Refresh puzzles</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 space-y-4 px-4">
        {/* Main Mode Tabs */}
        <div className="rounded-3xl bg-white p-3 shadow-sm ring-1 ring-gray-100">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
                activeTab === 'ai'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Sparkles size={14} />
              <span>Today&apos;s Puzzles</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('builtin')}
              className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition ${
                activeTab === 'builtin'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Puzzle size={14} />
              <span>Built-In Activities</span>
            </button>
          </div>

          {/* Sub-filters */}
          {activeTab === 'ai' ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {PUZZLE_FILTERS.map(
                ({ key, label, subtitle, icon: Icon, iconClass, activeClass }) => {
                  const isSelected = puzzleFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPuzzleFilter(key)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition ${
                        isSelected
                          ? activeClass
                          : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-white/20 text-white' : `bg-white ${iconClass} shadow-sm`
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{label}</p>
                        <p
                          className={`truncate text-[10px] ${
                            isSelected ? 'text-white/85' : 'text-gray-500'
                          }`}
                        >
                          {subtitle}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {BUILTIN_ACTIVITIES.map(
                ({ key, label, subtitle, icon: Icon, iconClass, activeClass }) => {
                  const isSelected = activeBuiltIn === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveBuiltIn(key)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition ${
                        isSelected
                          ? activeClass
                          : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                          isSelected ? 'bg-white/20 text-white' : `bg-white ${iconClass} shadow-sm`
                        }`}
                      >
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold">{label}</p>
                        <p
                          className={`truncate text-[10px] ${
                            isSelected ? 'text-white/85' : 'text-gray-500'
                          }`}
                        >
                          {subtitle}
                        </p>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* AI Puzzles Card Feed (Unsolved -> Solved) */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            {aiError && (
              <div className="rounded-3xl bg-amber-50 p-4 text-xs text-amber-900 ring-1 ring-amber-200/80">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="flex-1">
                    <p className="font-semibold">Couldn&apos;t reach Gemini for fresh puzzles</p>
                    <p className="mt-0.5 leading-relaxed text-amber-800/90">{aiError}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleRegenerateAll}
                        disabled={regeneratingTarget !== null}
                        className="rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                      >
                        Try again
                      </button>
                      {totalAiPuzzles === 0 && (
                        <button
                          type="button"
                          onClick={handleUseOfflineSamples}
                          className="rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-300 transition hover:bg-amber-100"
                        >
                          Play sample puzzles offline
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isUsingOfflineFallback && (
              <div className="rounded-2xl bg-indigo-50/70 px-4 py-2.5 text-xs font-medium text-indigo-800 ring-1 ring-indigo-100">
                Playing curated offline sample puzzles. Tap <strong>Refresh puzzles</strong> anytime
                when Gemini is ready.
              </div>
            )}

            {isBusyLoadingAi ? (
              <div className="flex items-center gap-3 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Preparing today&apos;s gentle puzzles…
                  </p>
                  <p className="text-xs text-gray-500">
                    Or switch to Built-In Activities anytime for instant offline play.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Unsolved / Ready to Play section */}
                <section className="space-y-2.5" aria-label="Unsolved puzzles">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-indigo-600" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-gray-600">
                        Ready to Play
                      </h2>
                    </div>
                    {unsolvedCards.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSurpriseMe}
                        className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200/70 transition hover:bg-indigo-100 active:scale-95"
                      >
                        <Shuffle size={12} />
                        <span>Surprise me</span>
                      </button>
                    )}
                  </div>

                  {unsolvedCards.length > 0 ? (
                    <div className="space-y-2.5">
                      {unsolvedCards.map((card) => (
                        <PuzzleMetadataCard
                          key={card.id}
                          card={card}
                          onOpen={() =>
                            setActiveModalSlot({ kind: card.kind, index: card.index })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-gradient-to-br from-emerald-50/80 via-white to-indigo-50/60 p-5 text-center shadow-sm ring-1 ring-emerald-200/60">
                      <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
                      <p className="mt-2 text-sm font-bold text-gray-900">
                        All caught up here!
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">
                        You&apos;ve solved these puzzles for now. Revisit any solved card below,
                        try Built-In Activities, or refresh for a fresh set.
                      </p>
                      <button
                        type="button"
                        onClick={handleRegenerateAll}
                        disabled={regeneratingTarget !== null}
                        className="mt-3.5 inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                      >
                        {regeneratingTarget === 'all' ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <RefreshCw size={13} />
                        )}
                        <span>Refresh puzzles</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Solved section (automatically moves down) */}
                {solvedCards.length > 0 && (
                  <section className="space-y-2.5 pt-1" aria-label="Solved puzzles">
                    <div className="flex items-center gap-2 px-1">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                        Solved
                      </h2>
                    </div>

                    <div className="space-y-2.5">
                      {solvedCards.map((card) => (
                        <PuzzleMetadataCard
                          key={card.id}
                          card={card}
                          onOpen={() =>
                            setActiveModalSlot({ kind: card.kind, index: card.index })
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {/* Built-In Activities View */}
        {activeTab === 'builtin' && (
          <div>
            {activeBuiltIn === 'sudoku' && <CalmSudokuActivity key={id} profileId={id} />}
            {activeBuiltIn === 'memory' && <MemoryMatchActivity key={id} profileId={id} />}
            {activeBuiltIn === 'mandala' && <MandalaColoringActivity key={id} profileId={id} />}
            {activeBuiltIn === 'breathing' && <CalmBreathingActivity key={id} profileId={id} />}
          </div>
        )}

        {/* Warm Wellness Note */}
        <p className="px-2 pt-1 text-center text-[11px] leading-relaxed text-gray-400">
          Designed for peaceful relaxation and joyful mental breaks during pregnancy—take every
          activity at your own unhurried pace.
        </p>
      </div>

      {/* Interactive Puzzle Modal */}
      <PuzzlePlayModal
        isOpen={isModalOpen}
        onClose={() => setActiveModalSlot(null)}
        ariaLabel={modalTitle}
        scrollResetKey={modalPuzzleId}
        footer={
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handlePlayNext}
              disabled={!hasNextUnsolved}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none disabled:ring-0 ${
                isModalPuzzleSolved
                  ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                  : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/80 hover:bg-indigo-100'
              }`}
            >
              <span>Next puzzle</span>
              <ArrowRight size={14} />
            </button>
          </div>
        }
      >
        {aiError && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200/80">
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="leading-relaxed">{aiError}</p>
          </div>
        )}

        {modalConnections && (
          <ConnectionsPuzzleCard
            key={modalConnections.id}
            puzzle={modalConnections}
            embedded
            onSolved={() => markSolved(modalConnections.id)}
          />
        )}

        {modalWordScramble && (
          <WordScrambleCard
            key={modalWordScramble.id}
            puzzle={modalWordScramble}
            embedded
            onSolved={() => markSolved(modalWordScramble.id)}
          />
        )}

        {modalRiddle && (
          <RiddlePuzzleCard
            key={modalRiddle.id}
            puzzle={modalRiddle}
            embedded
            onSolved={() => markSolved(modalRiddle.id)}
          />
        )}
      </PuzzlePlayModal>
    </div>
  );
}

function PuzzleMetadataCard({
  card,
  onOpen,
}: {
  card: PuzzleCardEntry;
  onOpen: () => void;
}) {
  const style = PUZZLE_KIND_STYLES[card.kind];
  const Icon = style.icon;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex w-full items-center gap-3.5 rounded-3xl p-4 text-left shadow-sm transition active:scale-[0.99] ${
        card.isSolved
          ? 'bg-emerald-50/45 ring-1 ring-emerald-200/70 hover:bg-emerald-50/75'
          : `bg-white ring-1 ring-gray-100 hover:shadow-md ${style.accentRing}`
      }`}
    >
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
          card.isSolved ? 'bg-emerald-100 text-emerald-700' : style.iconBox
        }`}
      >
        {card.isSolved ? <CheckCircle2 size={20} /> : <Icon size={20} />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
              card.isSolved ? 'bg-emerald-100 text-emerald-800' : style.badge
            }`}
          >
            {card.badgeLabel}
          </span>
          {card.isSolved && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
              Solved
            </span>
          )}
        </div>
        <h3
          className={`mt-1 truncate text-sm font-bold ${
            card.isSolved ? 'text-gray-700' : 'text-gray-900'
          }`}
        >
          {card.title}
        </h3>
        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-gray-500">
          {card.subtitle}
        </p>
      </div>

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition ${
          card.isSolved
            ? 'bg-emerald-100/80 text-emerald-700 group-hover:bg-emerald-200/80'
            : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-600 group-hover:text-white'
        }`}
        aria-hidden="true"
      >
        {card.isSolved ? <ChevronRight size={16} /> : <Play size={14} className="ml-0.5" />}
      </div>
    </button>
  );
}
