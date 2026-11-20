import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Play,
  Puzzle,
  RefreshCw,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Type,
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
import FiveCluesPuzzleCard from '../components/mindPlay/FiveCluesPuzzleCard';
import RebusPuzzleCard from '../components/mindPlay/RebusPuzzleCard';
import WordScrambleCard from '../components/mindPlay/WordScrambleCard';
import RiddlePuzzleCard from '../components/mindPlay/RiddlePuzzleCard';
import PuzzlePlayModal from '../components/mindPlay/PuzzlePlayModal';
import PuzzleMixModal from '../components/mindPlay/PuzzleMixModal';
import GameCollectionModal from '../components/mindPlay/GameCollectionModal';
import CalmSudokuActivity from '../components/mindPlay/CalmSudokuActivity';
import MemoryMatchActivity from '../components/mindPlay/MemoryMatchActivity';
import MandalaColoringActivity from '../components/mindPlay/MandalaColoringActivity';
import CalmBreathingActivity from '../components/mindPlay/CalmBreathingActivity';
import CalmStarlightPathsActivity from '../components/mindPlay/CalmStarlightPathsActivity';
import HerbalTeaPourActivity from '../components/mindPlay/HerbalTeaPourActivity';
import LullabyStarChimesActivity from '../components/mindPlay/LullabyStarChimesActivity';
import FourInARowActivity from '../components/mindPlay/FourInARowActivity';
import DotsAndBoxesActivity from '../components/mindPlay/DotsAndBoxesActivity';
import ReversiActivity from '../components/mindPlay/ReversiActivity';
import MancalaActivity from '../components/mindPlay/MancalaActivity';
import GomokuActivity from '../components/mindPlay/GomokuActivity';
import WordDuelActivity from '../components/mindPlay/WordDuelActivity';
import {
  BUILT_IN_ACTIVITIES_CATALOG,
  BUILT_IN_ACTIVITY_BY_ID,
  getTopPlayedActivities,
  type BuiltInActivityId,
} from '../utils/mindPlayCatalog';
import {
  loadMindPlayNavState,
  loadMindPlayPlayCounts,
  saveMindPlayNavState,
  saveMindPlayPlayCounts,
  type MindPlayPlayCounts,
  type MindPlayPuzzleFilter,
  type SavedMindPlayNavState,
} from '../utils/mindPlayStorage';
import {
  computeDailyMixAllocation,
  hasPersonalizedMix,
  loadMindPuzzlePreferences,
  recordPuzzleFilterInterestSignal,
  recordPuzzleSkippedSignal,
  recordPuzzleSolvedSignal,
  resetMindPuzzlePreferences,
  saveMindPuzzlePreferences,
  type MindPuzzlePreferences,
  type PuzzleKindPreferenceMode,
} from '../utils/mindPuzzlePreferences';

type PuzzleFilter = MindPlayPuzzleFilter;

const ALL_BUILT_IN_IDS: readonly BuiltInActivityId[] = BUILT_IN_ACTIVITIES_CATALOG.map(
  (item) => item.id
);

const shuffleBuiltInGames = (excludeFirst?: BuiltInActivityId): BuiltInActivityId[] => {
  const arr: BuiltInActivityId[] = [...ALL_BUILT_IN_IDS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  if (excludeFirst && arr.length > 1 && arr[0] === excludeFirst) {
    const swapIdx = 1 + Math.floor(Math.random() * (arr.length - 1));
    const tmp = arr[0];
    arr[0] = arr[swapIdx];
    arr[swapIdx] = tmp;
  }
  return arr;
};

interface PuzzleCardEntry {
  kind: MindPuzzleKind;
  index: number;
  id: string;
  title: string;
  subtitle: string;
  badgeLabel: string;
  isSolved: boolean;
}

const PUZZLE_VARIETY_FILTERS: {
  key: MindPuzzleKind;
  label: string;
  subtitle: string;
  icon: typeof Search;
  iconClass: string;
  activeClass: string;
}[] = [
  {
    key: 'fiveClues',
    label: '5-Clue Mystery',
    subtitle: 'Progressive clues',
    icon: Search,
    iconClass: 'text-amber-700',
    activeClass: 'bg-amber-600 text-white shadow-sm',
  },
  {
    key: 'rebus',
    label: 'Word Picture',
    subtitle: 'Visual wordplay',
    icon: Eye,
    iconClass: 'text-sky-600',
    activeClass: 'bg-sky-600 text-white shadow-sm',
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
    icon: typeof Search;
    iconBox: string;
    badge: string;
    accentRing: string;
  }
> = {
  fiveClues: {
    icon: Search,
    iconBox: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
    badge: 'bg-amber-50 text-amber-800',
    accentRing: 'hover:ring-amber-200',
  },
  rebus: {
    icon: Eye,
    iconBox: 'bg-sky-50 text-sky-600 ring-1 ring-sky-100',
    badge: 'bg-sky-50 text-sky-700',
    accentRing: 'hover:ring-sky-200',
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

const getSolvedStorageKey = (profileId: string, dateId: string): string =>
  `mindPlaySolved:${profileId}:${dateId}`;

const pruneOldSolvedIds = (profileId: string, todayDateId: string): void => {
  try {
    const prefix = `mindPlaySolved:${profileId}:`;
    const todayKey = `${prefix}${todayDateId}`;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix) && k !== todayKey) {
        keysToRemove.push(k);
      }
    }
    for (const k of keysToRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // Ignore storage errors
  }
};

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

  const [navOverridesByProfile, setNavOverridesByProfile] = useState<
    Record<string, Partial<SavedMindPlayNavState>>
  >({});
  const [playCountsByProfile, setPlayCountsByProfile] = useState<
    Record<string, MindPlayPlayCounts>
  >({});
  const [puzzlePrefsByProfile, setPuzzlePrefsByProfile] = useState<
    Record<string, MindPuzzlePreferences>
  >({});
  const [isCollectionOpen, setIsCollectionOpen] = useState(false);
  const [isMixModalOpen, setIsMixModalOpen] = useState(false);
  const [activeModalSlot, setActiveModalSlot] = useState<{
    kind: MindPuzzleKind;
    index: number;
  } | null>(null);
  const openedPuzzleRef = useRef<{
    id: string;
    kind: MindPuzzleKind;
    wasSolvedOnOpen: boolean;
    solvedDuringOpen: boolean;
  } | null>(null);

  const navState = useMemo<SavedMindPlayNavState>(() => {
    const persisted = loadMindPlayNavState(id);
    const override = id ? navOverridesByProfile[id] : undefined;
    return override ? { ...persisted, ...override } : persisted;
  }, [id, navOverridesByProfile]);

  const { activeTab, puzzleFilter, activeBuiltIn } = navState;

  const puzzlePrefs = useMemo<MindPuzzlePreferences>(() => {
    const override = id ? puzzlePrefsByProfile[id] : undefined;
    return override ?? loadMindPuzzlePreferences(id);
  }, [id, puzzlePrefsByProfile]);

  const isMixPersonalized = useMemo(() => hasPersonalizedMix(puzzlePrefs), [puzzlePrefs]);

  const visibleVarietyFilters = useMemo(
    () => PUZZLE_VARIETY_FILTERS.filter((f) => puzzlePrefs.overrides[f.key] !== 'hidden'),
    [puzzlePrefs]
  );

  const effectivePuzzleFilter: PuzzleFilter =
    puzzleFilter !== 'all' && puzzlePrefs.overrides[puzzleFilter] === 'hidden'
      ? 'all'
      : puzzleFilter;

  const playCounts = useMemo<MindPlayPlayCounts>(() => {
    const persisted = loadMindPlayPlayCounts(id);
    const override = id ? playCountsByProfile[id] : undefined;
    return override ? { ...persisted, ...override } : persisted;
  }, [id, playCountsByProfile]);

  const topFourActivities = useMemo(() => getTopPlayedActivities(playCounts, 4), [playCounts]);
  const hasPlayHistory = useMemo(
    () =>
      Object.entries(playCounts).some(
        ([key, count]) => key !== 'breathing' && (count ?? 0) > 0
      ),
    [playCounts]
  );

  const updateNavState = (patch: Partial<SavedMindPlayNavState>) => {
    const next: SavedMindPlayNavState = { ...navState, ...patch };
    if (id) {
      saveMindPlayNavState(id, next);
      setNavOverridesByProfile((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? {}), ...patch },
      }));
    }
  };

  const handleSelectPuzzleFilter = (nextFilter: PuzzleFilter) => {
    const resolved: PuzzleFilter =
      nextFilter !== 'all' && effectivePuzzleFilter === nextFilter ? 'all' : nextFilter;
    if (resolved !== 'all' && resolved !== effectivePuzzleFilter && id) {
      const updated = recordPuzzleFilterInterestSignal(id, resolved);
      setPuzzlePrefsByProfile((prev) => ({ ...prev, [id]: updated }));
    }
    updateNavState({ puzzleFilter: resolved });
  };

  const handleSelectBuiltIn = (targetId: BuiltInActivityId) => {
    const isChangingActivity = targetId !== activeBuiltIn || activeTab !== 'builtin';
    if (isChangingActivity && targetId !== 'breathing' && id) {
      const nextCounts: MindPlayPlayCounts = {
        ...playCounts,
        [targetId]: (playCounts[targetId] ?? 0) + 1,
      };
      saveMindPlayPlayCounts(id, nextCounts);
      setPlayCountsByProfile((prev) => ({
        ...prev,
        [id]: nextCounts,
      }));
    }
    updateNavState({ activeTab: 'builtin', activeBuiltIn: targetId });
  };

  const [surpriseSolvedCount, setSurpriseSolvedCount] = useState(0);
  const surpriseBagRef = useRef<BuiltInActivityId[]>([]);

  const handleSurpriseBoardSolved = useCallback(() => {
    setSurpriseSolvedCount((count) => count + 1);
  }, []);

  const surpriseLevelLabel =
    surpriseSolvedCount < 2
      ? 'Level 1 · Gentle'
      : surpriseSolvedCount < 4
        ? 'Level 2 · Soft'
        : surpriseSolvedCount < 6
          ? 'Level 3 · Cozy'
          : surpriseSolvedCount < 9
            ? 'Level 4 · Deep'
            : 'Level 5 · Master';

  const handleLaunchSurpriseGame = () => {
    if (surpriseBagRef.current.length === 0) {
      surpriseBagRef.current = shuffleBuiltInGames(activeBuiltIn);
    }
    let picked = surpriseBagRef.current.shift();
    if (picked === activeBuiltIn && ALL_BUILT_IN_IDS.length > 1) {
      if (surpriseBagRef.current.length === 0) {
        surpriseBagRef.current = shuffleBuiltInGames(activeBuiltIn);
      }
      picked = surpriseBagRef.current.shift();
    }
    if (!picked) {
      picked = ALL_BUILT_IN_IDS[0];
    }
    handleSelectBuiltIn(picked);
  };

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

  useEffect(() => {
    if (id) {
      pruneOldSolvedIds(id, todayId);
    }
  }, [id, todayId]);

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

  const recordSkipIfUnsolved = () => {
    const opened = openedPuzzleRef.current;
    openedPuzzleRef.current = null;
    if (!opened || !id) return;
    if (!opened.wasSolvedOnOpen && !opened.solvedDuringOpen && !solvedPuzzleIds[opened.id]) {
      const updated = recordPuzzleSkippedSignal(id, opened.kind);
      setPuzzlePrefsByProfile((prev) => ({ ...prev, [id]: updated }));
    }
  };

  const handleOpenPuzzleCard = (card: PuzzleCardEntry) => {
    setAiError(null);
    openedPuzzleRef.current = {
      id: card.id,
      kind: card.kind,
      wasSolvedOnOpen: card.isSolved,
      solvedDuringOpen: false,
    };
    setActiveModalSlot({ kind: card.kind, index: card.index });
  };

  const handleClosePuzzleModal = () => {
    recordSkipIfUnsolved();
    setActiveModalSlot(null);
  };

  const handleRegenerateAll = async (prefsOverride?: MindPuzzlePreferences) => {
    if (!userId || !id || regeneratingTarget !== null) return;
    setRegeneratingTarget('all');
    setAiError(null);

    try {
      const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
      const allocation = computeDailyMixAllocation(prefsOverride ?? puzzlePrefs);
      const refreshed = await regenerateAllMindPuzzles(
        userId,
        id,
        apiKey || undefined,
        allocation
      );
      setPuzzles(refreshed);
      openedPuzzleRef.current = null;
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
    const allocation = computeDailyMixAllocation(puzzlePrefs);
    setPuzzles(getFallbackDailyMindPuzzles(allocation));
    openedPuzzleRef.current = null;
    setActiveModalSlot(null);
    setIsUsingOfflineFallback(true);
    setAiError(null);
  };

  const handleSavePuzzleMix = async (
    nextOverrides: Record<MindPuzzleKind, PuzzleKindPreferenceMode>,
    refreshToday: boolean
  ) => {
    if (!id) return;
    const saved = saveMindPuzzlePreferences(id, {
      ...puzzlePrefs,
      overrides: nextOverrides,
    });
    setPuzzlePrefsByProfile((prev) => ({ ...prev, [id]: saved }));
    if (puzzleFilter !== 'all' && saved.overrides[puzzleFilter] === 'hidden') {
      updateNavState({ puzzleFilter: 'all' });
    }
    setIsMixModalOpen(false);

    if (refreshToday) {
      if (isUsingOfflineFallback) {
        setPuzzles(getFallbackDailyMindPuzzles(computeDailyMixAllocation(saved)));
      } else {
        await handleRegenerateAll(saved);
      }
    }
  };

  const handleResetPuzzleMix = () => {
    if (!id) return;
    const reset = resetMindPuzzlePreferences(id);
    setPuzzlePrefsByProfile((prev) => ({ ...prev, [id]: reset }));
  };

  const markSolved = (puzzleId: string | undefined, kind: MindPuzzleKind) => {
    if (!puzzleId || !id || !solvedStorageKey) return;
    if (openedPuzzleRef.current?.id === puzzleId) {
      openedPuzzleRef.current.solvedDuringOpen = true;
    }
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
    const updatedPrefs = recordPuzzleSolvedSignal(id, kind);
    setPuzzlePrefsByProfile((prev) => ({ ...prev, [id]: updatedPrefs }));
  };

  // Interleave enabled varieties when viewing All so the feed stays lively and varied
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
      puzzles.fiveClues.length,
      puzzles.rebus.length,
      puzzles.wordScramble.length,
      puzzles.riddle.length
    );

    for (let i = 0; i < maxLen; i++) {
      if (puzzlePrefs.overrides.fiveClues !== 'hidden') {
        const mystery = puzzles.fiveClues[i];
        if (mystery) {
          entries.push({
            kind: 'fiveClues',
            index: i,
            id: mystery.id,
            title: mystery.title,
            subtitle: mystery.clues[0],
            badgeLabel: mystery.category || '5-Clue Mystery',
            isSolved: Boolean(solvedPuzzleIds[mystery.id]),
          });
        }
      }

      if (puzzlePrefs.overrides.rebus !== 'hidden') {
        const rebus = puzzles.rebus[i];
        if (rebus) {
          entries.push({
            kind: 'rebus',
            index: i,
            id: rebus.id,
            title: rebus.title,
            subtitle: 'Decode the visual word arrangement to spot the hidden phrase.',
            badgeLabel: rebus.category || 'Word Picture',
            isSolved: Boolean(solvedPuzzleIds[rebus.id]),
          });
        }
      }

      if (puzzlePrefs.overrides.wordScramble !== 'hidden') {
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
      }

      if (puzzlePrefs.overrides.riddle !== 'hidden') {
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
    }

    const filtered =
      effectivePuzzleFilter === 'all'
        ? entries
        : entries.filter((e) => e.kind === effectivePuzzleFilter);

    return {
      allEntries: entries,
      allUnsolvedCards: entries.filter((e) => !e.isSolved),
      unsolvedCards: filtered.filter((e) => !e.isSolved),
      solvedCards: filtered.filter((e) => e.isSolved),
    };
  }, [puzzles, effectivePuzzleFilter, puzzlePrefs.overrides, solvedPuzzleIds]);

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

  const modalFiveClues =
    activeModalSlot?.kind === 'fiveClues'
      ? puzzles?.fiveClues[activeModalSlot.index]
      : undefined;
  const modalRebus =
    activeModalSlot?.kind === 'rebus' ? puzzles?.rebus[activeModalSlot.index] : undefined;
  const modalWordScramble =
    activeModalSlot?.kind === 'wordScramble'
      ? puzzles?.wordScramble[activeModalSlot.index]
      : undefined;
  const modalRiddle =
    activeModalSlot?.kind === 'riddle' ? puzzles?.riddle[activeModalSlot.index] : undefined;

  const modalPuzzleId =
    modalFiveClues?.id || modalRebus?.id || modalWordScramble?.id || modalRiddle?.id;
  const modalTitle =
    modalFiveClues?.title ||
    modalRebus?.title ||
    modalWordScramble?.title ||
    modalRiddle?.title ||
    'Play puzzle';

  const isModalOpen = Boolean(modalFiveClues || modalRebus || modalWordScramble || modalRiddle);
  const isModalPuzzleSolved = Boolean(modalPuzzleId && solvedPuzzleIds[modalPuzzleId]);

  const filteredUnsolvedOthers = unsolvedCards.filter((card) => card.id !== modalPuzzleId);
  const allUnsolvedOthers = allUnsolvedCards.filter((card) => card.id !== modalPuzzleId);
  const nextUnsolvedPool =
    filteredUnsolvedOthers.length > 0 ? filteredUnsolvedOthers : allUnsolvedOthers;
  const hasNextUnsolved = nextUnsolvedPool.length > 0;

  const handlePlayNext = () => {
    if (!hasNextUnsolved) return;
    recordSkipIfUnsolved();
    const picked = nextUnsolvedPool[Math.floor(Math.random() * nextUnsolvedPool.length)];
    handleOpenPuzzleCard(picked);
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
    handleOpenPuzzleCard(picked);
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
              onClick={() => handleRegenerateAll()}
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
              onClick={() => updateNavState({ activeTab: 'ai' })}
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
              onClick={() => updateNavState({ activeTab: 'builtin' })}
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
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2 px-0.5">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectPuzzleFilter('all')}
                    aria-pressed={effectivePuzzleFilter === 'all'}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                      effectivePuzzleFilter === 'all'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <LayoutGrid size={11} />
                    <span>All</span>
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    {isMixPersonalized ? 'Personalized mix' : "Today's mix"}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMixModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-200/70 transition hover:bg-indigo-100 active:scale-95"
                >
                  <SlidersHorizontal size={11} />
                  <span>Customize mix</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {visibleVarietyFilters.map(
                  ({ key, label, subtitle, icon: Icon, iconClass, activeClass }) => {
                    const isSelected = effectivePuzzleFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleSelectPuzzleFilter(key)}
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
            </div>
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  {hasPlayHistory ? 'Most played' : 'Quick access'}
                </span>
                <span className="text-[10px] font-medium text-gray-400">
                  {BUILT_IN_ACTIVITIES_CATALOG.length} games available
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {topFourActivities.map(
                  ({ id: actId, label, subtitle, icon: Icon, iconClass, activeClass }) => {
                    const isSelected = activeBuiltIn === actId;
                    return (
                      <button
                        key={actId}
                        type="button"
                        onClick={() => handleSelectBuiltIn(actId)}
                        aria-pressed={isSelected}
                        className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition ${
                          isSelected
                            ? activeClass
                            : 'bg-gray-50 text-gray-700 ring-1 ring-gray-200/70 hover:bg-gray-100'
                        }`}
                      >
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : `bg-white ${iconClass} shadow-sm`
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

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectionOpen(true)}
                  className="flex items-center gap-2.5 rounded-2xl bg-gray-50 px-3 py-2.5 text-left text-gray-800 ring-1 ring-gray-200/80 transition hover:bg-indigo-50/60 hover:ring-indigo-200 active:scale-[0.99]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-xs">
                    <LayoutGrid size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-gray-900">Collection</p>
                    <p className="truncate text-[10px] text-gray-500">
                      Browse all {BUILT_IN_ACTIVITIES_CATALOG.length}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleLaunchSurpriseGame}
                  className="flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-50/95 via-purple-50/80 to-teal-50/95 px-3 py-2.5 text-left text-indigo-950 ring-1 ring-indigo-200/70 transition hover:from-indigo-100/80 hover:to-teal-100/80 active:scale-[0.99]"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-xs">
                    <Shuffle size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">Surprise me</p>
                    <p className="truncate text-[10px] text-indigo-700/80">Random game</p>
                  </div>
                </button>
              </div>
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
                        onClick={() => handleRegenerateAll()}
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
                          onOpen={() => handleOpenPuzzleCard(card)}
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
                        onClick={() => handleRegenerateAll()}
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
                          onOpen={() => handleOpenPuzzleCard(card)}
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
          <div className="space-y-2.5">
            {BUILT_IN_ACTIVITY_BY_ID[activeBuiltIn]?.isProgressive && (
              <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  <Sparkles size={12} />
                  <span>{surpriseLevelLabel}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLaunchSurpriseGame}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-xs ring-1 ring-indigo-200/80 transition hover:bg-indigo-50 active:scale-95"
                >
                  <Shuffle size={12} />
                  <span>Try another game</span>
                </button>
              </div>
            )}

            {activeBuiltIn === 'sudoku' && <CalmSudokuActivity key={id} profileId={id} />}
            {activeBuiltIn === 'memory' && <MemoryMatchActivity key={id} profileId={id} />}
            {activeBuiltIn === 'mandala' && <MandalaColoringActivity key={id} profileId={id} />}
            {activeBuiltIn === 'breathing' && <CalmBreathingActivity key={id} profileId={id} />}
            {activeBuiltIn === 'starlight-paths' && (
              <CalmStarlightPathsActivity
                key={`${id}-starlight`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'tea-pour' && (
              <HerbalTeaPourActivity
                key={`${id}-teapour`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'lullaby-chimes' && (
              <LullabyStarChimesActivity key={`${id}-lullaby`} />
            )}
            {activeBuiltIn === 'four-in-a-row' && (
              <FourInARowActivity
                key={`${id}-four-in-a-row`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'dots-and-boxes' && (
              <DotsAndBoxesActivity
                key={`${id}-dots-and-boxes`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'reversi' && (
              <ReversiActivity
                key={`${id}-reversi`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'mancala' && (
              <MancalaActivity
                key={`${id}-mancala`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'gomoku' && (
              <GomokuActivity
                key={`${id}-gomoku`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
            {activeBuiltIn === 'word-duel' && (
              <WordDuelActivity
                key={`${id}-word-duel`}
                sessionSolvedCount={surpriseSolvedCount}
                onBoardSolved={handleSurpriseBoardSolved}
              />
            )}
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
        onClose={handleClosePuzzleModal}
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

        {modalFiveClues && (
          <FiveCluesPuzzleCard
            key={modalFiveClues.id}
            puzzle={modalFiveClues}
            embedded
            onSolved={() => markSolved(modalFiveClues.id, 'fiveClues')}
          />
        )}

        {modalRebus && (
          <RebusPuzzleCard
            key={modalRebus.id}
            puzzle={modalRebus}
            embedded
            onSolved={() => markSolved(modalRebus.id, 'rebus')}
          />
        )}

        {modalWordScramble && (
          <WordScrambleCard
            key={modalWordScramble.id}
            puzzle={modalWordScramble}
            embedded
            onSolved={() => markSolved(modalWordScramble.id, 'wordScramble')}
          />
        )}

        {modalRiddle && (
          <RiddlePuzzleCard
            key={modalRiddle.id}
            puzzle={modalRiddle}
            embedded
            onSolved={() => markSolved(modalRiddle.id, 'riddle')}
          />
        )}
      </PuzzlePlayModal>

      {/* Customize Daily Puzzle Mix Modal */}
      {isMixModalOpen && (
        <PuzzleMixModal
          isOpen={isMixModalOpen}
          preferences={puzzlePrefs}
          isRefreshing={regeneratingTarget === 'all'}
          onSave={handleSavePuzzleMix}
          onReset={handleResetPuzzleMix}
          onClose={() => setIsMixModalOpen(false)}
        />
      )}

      {/* Built-In Game Collection Modal */}
      <GameCollectionModal
        isOpen={isCollectionOpen}
        activeActivityId={activeBuiltIn}
        playCounts={playCounts}
        onSelect={handleSelectBuiltIn}
        onSurprise={handleLaunchSurpriseGame}
        onClose={() => setIsCollectionOpen(false)}
      />
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
