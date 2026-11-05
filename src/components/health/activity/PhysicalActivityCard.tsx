import { useEffect, useMemo, useState } from 'react';
import {
  Activity as ActivityIcon,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Footprints,
  HeartPulse,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import type { Activity } from '../../../models/activity';
import type { DailyLog } from '../../../models/dailylLog';
import type { ExpectantProfile } from '../../../models/profile';
import { subscribeToRecentDailyLogs } from '../../../services/ai/journalChatPersistence';
import { subscribeToLatestHealthActivityInsight } from '../../../services/ai/healthInsightsService';
import {
  addManualActivityToDailyLog,
  removeActivityFromDailyLog,
  syncGoogleHealthActivity,
} from '../../../services/health/googleHealthService';

interface PhysicalActivityCardProps {
  profileId: string;
  profile?: Partial<ExpectantProfile> | null;
}

const DEFAULT_STEPS_GOAL = 6000;
const DEFAULT_ACTIVE_MINUTES_GOAL = 30;

const ACTIVITY_PRESETS = [
  'Walking',
  'Prenatal Yoga',
  'Swimming',
  'Stretching',
  'Stationary Cycling',
  'Pelvic Floor Exercises',
  'Light Strength Training',
];

const getLocalDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLast7DaysKeys = (): string[] => {
  const keys: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    keys.push(getLocalDateKey(d));
  }
  return keys;
};

const formatShortDayLabel = (dateKey: string, todayKey: string): string => {
  if (dateKey === todayKey) return 'Today';
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatFullDateLabel = (dateKey: string, todayKey: string): string => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  const formatted = parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return dateKey === todayKey ? `Today (${formatted})` : formatted;
};

const formatTimeLabel = (isoTimestamp?: string): string => {
  if (!isoTimestamp) return '';
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function PhysicalActivityCard({
  profileId,
  profile,
}: PhysicalActivityCardProps) {
  const { user } = useAuth();
  const todayKey = useMemo(() => getLocalDateKey(new Date()), []);
  const last7DaysKeys = useMemo(() => getLast7DaysKeys(), []);

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [aiStepsGoal, setAiStepsGoal] = useState<number | null>(null);
  const [aiActiveMinsGoal, setAiActiveMinsGoal] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'steps' | 'activeMinutes'>('steps');

  // Manual Activity Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isSavingManual, setIsSavingManual] = useState<boolean>(false);
  const [manualType, setManualType] = useState<string>('Walking');
  const [manualDuration, setManualDuration] = useState<string>('30');
  const [manualIntensity, setManualIntensity] = useState<'low' | 'moderate' | 'high'>(
    'moderate',
  );
  const [manualSteps, setManualSteps] = useState<string>('');
  const [manualCalories, setManualCalories] = useState<string>('');
  const [manualNotes, setManualNotes] = useState<string>('');
  const [deletingActivityId, setDeletingActivityId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !profileId) {
      setIsLoadingLogs(false);
      return;
    }

    const unsubscribeLogs = subscribeToRecentDailyLogs(
      user.uid,
      profileId,
      (logs) => {
        setDailyLogs(logs);
        setIsLoadingLogs(false);
      },
      14,
    );

    const unsubscribeInsight = subscribeToLatestHealthActivityInsight(
      user.uid,
      profileId,
      (insight) => {
        if (insight) {
          setAiStepsGoal(insight.recommendedDailySteps);
          setAiActiveMinsGoal(insight.recommendedActiveMinutes);
        }
      },
    );

    return () => {
      unsubscribeLogs();
      unsubscribeInsight();
    };
  }, [user?.uid, profileId]);

  const dailyStepsGoal = aiStepsGoal ?? DEFAULT_STEPS_GOAL;
  const dailyActiveMinutesGoal = aiActiveMinsGoal ?? DEFAULT_ACTIVE_MINUTES_GOAL;

  const logsByDate = useMemo(() => {
    const map = new Map<string, DailyLog>();
    for (const log of dailyLogs) {
      if (log.date) {
        map.set(log.date, log);
      }
    }
    return map;
  }, [dailyLogs]);

  const dayMetricsList = useMemo(() => {
    return last7DaysKeys.map((dateKey) => {
      const log = logsByDate.get(dateKey);
      const summary = log?.activitySummary;
      const activities = log?.activities ?? [];

      const manualMinutes = activities
        .filter((a) => a.source !== 'google_health')
        .reduce((acc, a) => acc + (a.durationMinutes ?? 0), 0);
      const manualSteps = activities
        .filter((a) => a.source !== 'google_health')
        .reduce((acc, a) => acc + (a.steps ?? 0), 0);
      const manualCalories = activities
        .filter((a) => a.source !== 'google_health')
        .reduce((acc, a) => acc + (a.caloriesKcal ?? 0), 0);

      const steps = (summary?.steps ?? 0) + manualSteps;
      const activeMinutes = (summary?.activeMinutes ?? 0) + manualMinutes;
      const distanceKm = summary?.distanceKm ?? 0;
      const activeCaloriesKcal = (summary?.activeCaloriesKcal ?? 0) + manualCalories;

      return {
        date: dateKey,
        shortLabel: formatShortDayLabel(dateKey, todayKey),
        steps,
        activeMinutes,
        distanceKm,
        activeCaloriesKcal,
        activities,
        syncedAt: summary?.syncedAt,
      };
    });
  }, [last7DaysKeys, logsByDate, todayKey]);

  const selectedDayData = useMemo(() => {
    return (
      dayMetricsList.find((d) => d.date === selectedDate) ??
      dayMetricsList[dayMetricsList.length - 1]
    );
  }, [dayMetricsList, selectedDate]);

  const latestSyncTime = useMemo(() => {
    let latest = '';
    for (const day of dayMetricsList) {
      if (day.syncedAt && day.syncedAt > latest) {
        latest = day.syncedAt;
      }
    }
    return latest;
  }, [dayMetricsList]);

  const maxChartValue = useMemo(() => {
    const values = dayMetricsList.map((d) =>
      chartMetric === 'steps' ? d.steps : d.activeMinutes,
    );
    const defaultGoal =
      chartMetric === 'steps' ? dailyStepsGoal : dailyActiveMinutesGoal;
    return Math.max(defaultGoal, ...values, 1);
  }, [dayMetricsList, chartMetric, dailyStepsGoal, dailyActiveMinutesGoal]);

  const handleSyncGoogleHealth = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid || !profileId || isSyncing) return;

    setIsExpanded(true);
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccessMessage(null);

    try {
      await syncGoogleHealthActivity(user.uid, profileId, {
        days: 7,
        profile,
      });
      setSyncSuccessMessage('Synced past 7 days of activity from Google Health.');
      setTimeout(() => setSyncSuccessMessage(null), 5000);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Failed to sync physical activity from Google Health.';
      setSyncError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveManualActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !profileId || !manualType.trim()) return;

    setIsSavingManual(true);
    try {
      const durationNum = parseInt(manualDuration, 10);
      const stepsNum = parseInt(manualSteps, 10);
      const caloriesNum = parseInt(manualCalories, 10);

      await addManualActivityToDailyLog(
        user.uid,
        profileId,
        selectedDate,
        {
          type: manualType.trim(),
          durationMinutes: !Number.isNaN(durationNum) && durationNum > 0 ? durationNum : undefined,
          intensity: manualIntensity,
          timestamp: new Date().toISOString(),
          steps: !Number.isNaN(stepsNum) && stepsNum > 0 ? stepsNum : undefined,
          caloriesKcal:
            !Number.isNaN(caloriesNum) && caloriesNum > 0 ? caloriesNum : undefined,
          notes: manualNotes.trim() || undefined,
        },
        profile,
      );

      setIsAddModalOpen(false);
      setManualNotes('');
      setManualSteps('');
      setManualCalories('');
    } catch {
      setSyncError('Could not save activity entry. Please try again.');
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleDeleteActivity = async (activity: Activity) => {
    if (!user?.uid || !profileId || deletingActivityId) return;
    setDeletingActivityId(activity.id);
    try {
      await removeActivityFromDailyLog(user.uid, profileId, selectedDate, activity.id);
    } catch {
      setSyncError('Failed to remove activity entry.');
    } finally {
      setDeletingActivityId(null);
    }
  };

  const stepsPercent = Math.min(
    100,
    Math.round(((selectedDayData?.steps ?? 0) / dailyStepsGoal) * 100),
  );
  const activeMinsPercent = Math.min(
    100,
    Math.round(
      ((selectedDayData?.activeMinutes ?? 0) / dailyActiveMinutesGoal) * 100,
    ),
  );

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      {/* Card Header */}
      <div
        className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Footprints className="text-purple-500" size={20} />
            Physical Activity &amp; Google Health
          </h3>
          {latestSyncTime && (
            <p className="mt-0.5 text-xs text-gray-400">
              Last synced {formatTimeLabel(latestSyncTime)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncGoogleHealth}
            disabled={isSyncing || isLoadingLogs}
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-fuchsia-700 disabled:opacity-60"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Syncing…' : 'Sync Google Health'}</span>
          </button>

          {isSyncing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsSyncing(false);
              }}
              className="rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
              title="Cancel waiting for popup"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition hover:bg-purple-100"
          >
            <Plus size={14} />
            <span>Log</span>
          </button>

          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Sync Status / Error Banners (visible whether expanded or collapsed) */}
      {syncError && (
        <div className="mt-4 flex items-start justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
          <span>{syncError}</span>
          <button
            type="button"
            onClick={() => setSyncError(null)}
            className="shrink-0 text-red-400 hover:text-red-600"
            aria-label="Dismiss error"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {syncSuccessMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-700">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{syncSuccessMessage}</span>
        </div>
      )}

      {/* Collapsed Quick Summary */}
      {!isExpanded && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {isLoadingLogs ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 font-medium text-slate-500">
              <Loader2 size={12} className="animate-spin text-purple-500" />
              Loading activity…
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-3 py-1 font-medium text-purple-700">
                <Footprints size={13} />
                {(selectedDayData?.steps ?? 0).toLocaleString()} steps today
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
                <Clock size={13} />
                {selectedDayData?.activeMinutes ?? 0} active mins
              </span>
              {selectedDayData?.distanceKm ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 font-medium text-sky-700">
                  <MapPin size={13} />
                  {selectedDayData.distanceKm} km
                </span>
              ) : null}
            </>
          )}
        </div>
      )}

      {/* Expanded Body */}
      {isExpanded && (
        <div className="mt-5 space-y-5">

          {/* Selected Date Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <Calendar size={14} className="text-purple-500" />
              <span>{formatFullDateLabel(selectedDate, todayKey)}</span>
            </div>
            {selectedDate !== todayKey && (
              <button
                type="button"
                onClick={() => setSelectedDate(todayKey)}
                className="text-xs font-medium text-purple-600 hover:text-purple-800"
              >
                Jump to Today
              </button>
            )}
          </div>

          {/* 4 Metric Tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Steps Tile */}
            <div className="rounded-2xl border border-purple-100/80 bg-purple-50/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-purple-700">
                <span>Steps</span>
                <Footprints size={15} className="text-purple-500" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {(selectedDayData?.steps ?? 0).toLocaleString()}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-purple-100">
                <div
                  className="h-full rounded-full bg-purple-600 transition-all duration-300"
                  style={{ width: `${stepsPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {stepsPercent}% of {dailyStepsGoal.toLocaleString()}{' '}
                {aiStepsGoal ? 'AI goal' : 'goal'}
              </p>
            </div>

            {/* Active Minutes Tile */}
            <div className="rounded-2xl border border-emerald-100/80 bg-emerald-50/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-emerald-700">
                <span>Active Mins</span>
                <Clock size={15} className="text-emerald-500" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {selectedDayData?.activeMinutes ?? 0}
                <span className="ml-1 text-xs font-normal text-gray-500">min</span>
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-emerald-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${activeMinsPercent}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-gray-500">
                {aiActiveMinsGoal ? 'AI target' : 'ACOG target'}: {dailyActiveMinutesGoal}m/day
              </p>
            </div>

            {/* Distance Tile */}
            <div className="rounded-2xl border border-sky-100/80 bg-sky-50/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-sky-700">
                <span>Distance</span>
                <MapPin size={15} className="text-sky-500" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {selectedDayData?.distanceKm ?? 0}
                <span className="ml-1 text-xs font-normal text-gray-500">km</span>
              </p>
              <p className="mt-3 text-[11px] text-gray-500">
                Daily movement distance
              </p>
            </div>

            {/* Active Calories Tile */}
            <div className="rounded-2xl border border-amber-100/80 bg-amber-50/40 p-3.5">
              <div className="flex items-center justify-between text-xs font-medium text-amber-700">
                <span>Active Energy</span>
                <Flame size={15} className="text-amber-500" />
              </div>
              <p className="mt-1.5 text-xl font-bold text-gray-900">
                {(selectedDayData?.activeCaloriesKcal ?? 0).toLocaleString()}
                <span className="ml-1 text-xs font-normal text-gray-500">kcal</span>
              </p>
              <p className="mt-3 text-[11px] text-gray-500">
                Active calories burned
              </p>
            </div>
          </div>

          {/* 7-Day Trend Bar Chart */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700">
                Last 7 Days Trend (tap a day to inspect)
              </span>
              <div className="inline-flex rounded-full bg-white p-0.5 shadow-2xs ring-1 ring-gray-200">
                <button
                  type="button"
                  onClick={() => setChartMetric('steps')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    chartMetric === 'steps'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Steps
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric('activeMinutes')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
                    chartMetric === 'activeMinutes'
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active Mins
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2">
              {dayMetricsList.map((day) => {
                const value =
                  chartMetric === 'steps' ? day.steps : day.activeMinutes;
                const heightPercent = Math.max(
                  8,
                  Math.min(100, Math.round((value / maxChartValue) * 100)),
                );
                const isSelected = day.date === selectedDate;

                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDate(day.date)}
                    className={`flex flex-col items-center rounded-xl p-1.5 transition ${
                      isSelected
                        ? 'bg-purple-100/70 ring-1 ring-purple-300'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <span className="mb-1 text-[10px] font-medium text-gray-500">
                      {chartMetric === 'steps'
                        ? value >= 1000
                          ? `${(value / 1000).toFixed(1)}k`
                          : value
                        : `${value}m`}
                    </span>
                    <div className="flex h-20 w-full items-end justify-center rounded-lg bg-white/80 p-1">
                      <div
                        className={`w-full max-w-[18px] rounded-t-md transition-all duration-300 ${
                          isSelected
                            ? 'bg-gradient-to-t from-purple-600 to-fuchsia-500'
                            : value > 0
                              ? 'bg-purple-300'
                              : 'bg-gray-200'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span
                      className={`mt-1.5 text-[11px] ${
                        isSelected
                          ? 'font-bold text-purple-700'
                          : 'font-medium text-gray-600'
                      }`}
                    >
                      {day.shortLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workouts & Activity Sessions List */}
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Workouts &amp; Sessions ({selectedDayData?.activities.length ?? 0})
              </h4>
            </div>

            {isLoadingLogs ? (
              <div className="flex items-center justify-center py-6 text-sm text-gray-400">
                <Loader2 size={18} className="mr-2 animate-spin text-purple-500" />
                Loading activity logs…
              </div>
            ) : !selectedDayData || selectedDayData.activities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-5 text-center">
                <ActivityIcon size={22} className="mx-auto mb-1.5 text-gray-300" />
                <p className="text-xs font-medium text-gray-600">
                  No workouts logged for {formatShortDayLabel(selectedDate, todayKey)}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">
                  Click &ldquo;Sync Google Health&rdquo; to pull workouts from your Fitbit/Pixel Watch/Google Health account, or log an activity manually.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedDayData.activities.map((act) => {
                  const isGoogleHealth =
                    act.source === 'google_health' || act.id.startsWith('gh-');
                  return (
                    <div
                      key={act.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {act.type}
                          </span>
                          {isGoogleHealth ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
                              <Sparkles size={10} />
                              Google Health
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-200/70 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                              Manual
                            </span>
                          )}
                          {act.intensity && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                                act.intensity === 'high'
                                  ? 'bg-rose-50 text-rose-700'
                                  : act.intensity === 'moderate'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {act.intensity}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {act.durationMinutes ? (
                            <span className="inline-flex items-center gap-1">
                              <Clock size={12} />
                              {act.durationMinutes} min
                            </span>
                          ) : null}
                          {act.steps ? (
                            <span className="inline-flex items-center gap-1">
                              <Footprints size={12} />
                              {act.steps.toLocaleString()} steps
                            </span>
                          ) : null}
                          {act.distanceKm ? (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />
                              {act.distanceKm} km
                            </span>
                          ) : null}
                          {act.caloriesKcal ? (
                            <span className="inline-flex items-center gap-1">
                              <Flame size={12} />
                              {act.caloriesKcal} kcal
                            </span>
                          ) : null}
                          {act.averageHeartRateBpm ? (
                            <span className="inline-flex items-center gap-1">
                              <HeartPulse size={12} className="text-rose-500" />
                              {act.averageHeartRateBpm} bpm
                            </span>
                          ) : null}
                          {act.timestamp ? (
                            <span className="text-gray-400">
                              {formatTimeLabel(act.timestamp)}
                            </span>
                          ) : null}
                        </div>

                        {act.notes && (
                          <p className="mt-1 text-xs text-gray-600">{act.notes}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act)}
                        disabled={deletingActivityId === act.id}
                        className="rounded-full p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        title="Remove activity"
                      >
                        {deletingActivityId === act.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Activity Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Log Physical Activity
                </h3>
                <p className="text-xs text-gray-500">
                  Recording for {formatFullDateLabel(selectedDate, todayKey)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveManualActivity} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Activity Type
                </label>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {ACTIVITY_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setManualType(preset)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        manualType === preset
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={manualType}
                  onChange={(e) => setManualType(e.target.value)}
                  placeholder="e.g., Prenatal Yoga, Evening Walk"
                  required
                  maxLength={60}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={manualDuration}
                    onChange={(e) => setManualDuration(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Intensity
                  </label>
                  <select
                    value={manualIntensity}
                    onChange={(e) =>
                      setManualIntensity(
                        e.target.value as 'low' | 'moderate' | 'high',
                      )
                    }
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                  >
                    <option value="low">Low (Gentle)</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High (Vigorous)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Steps (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={manualSteps}
                    onChange={(e) => setManualSteps(e.target.value)}
                    placeholder="e.g., 2500"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Calories (optional)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value)}
                    placeholder="e.g., 120"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  Notes (optional)
                </label>
                <input
                  type="text"
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  maxLength={200}
                  placeholder="How did you feel during this activity?"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm outline-none focus:border-purple-600 focus:bg-white focus:ring-2 focus:ring-purple-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingManual || !manualType.trim()}
                  className="flex items-center gap-1.5 rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
                >
                  {isSavingManual && <Loader2 size={15} className="animate-spin" />}
                  <span>Save Activity</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
