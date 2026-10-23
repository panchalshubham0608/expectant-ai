import { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  Baby,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Droplets,
  Edit3,
  HeartPulse,
  History,
  Loader2,
  Plus,
  Scale,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import MeasurementsChart, { type Series as ChartSeries } from './MeasurementsChart';
import {
  mergeMeasurementsWithDefaults,
  normalizeMeasurementHistory,
  recomputeMeasurementFromHistory,
  type Measurement,
  type MeasurementHistoryEntry,
  type VitalCategory,
} from '../../../models/measurement';

interface MeasurementsCardProps {
  measurements: Measurement[];
  onSave: (measurements: Measurement[]) => Promise<void>;
  onDelete?: (measurementId: string) => Promise<void>;
}

interface CustomVitalDraft {
  label: string;
  unit: string;
  category: VitalCategory;
  normalRange: string;
  value: string;
  notes: string;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-100';

const getTodayDateString = (): string => {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];
};

const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const isBloodPressureVital = (measurement: Pick<Measurement, 'id' | 'label'>): boolean =>
  measurement.id === 'blood-pressure' ||
  measurement.label.toLowerCase().includes('blood pressure');

const parseNumericForChart = (raw: string): number | null => {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // Support blood pressure like "118/76" by plotting systolic (118)
  const bpMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (bpMatch) {
    return parseFloat(bpMatch[1]);
  }
  const numMatch = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!numMatch) return null;
  const parsed = parseFloat(numMatch[0]);
  return Number.isNaN(parsed) ? null : parsed;
};

const calculateVitalDelta = (
  measurement: Measurement,
): { text: string; direction: 'up' | 'down' | 'neutral' } | null => {
  if (!measurement.value || !measurement.previousValue) return null;

  if (isBloodPressureVital(measurement)) {
    if (measurement.value === measurement.previousValue) return null;
    return {
      text: `Prev: ${measurement.previousValue}${measurement.unit ? ` ${measurement.unit}` : ''}`,
      direction: 'neutral',
    };
  }

  const currentNum = parseFloat(measurement.value);
  const prevNum = parseFloat(measurement.previousValue);

  if (Number.isNaN(currentNum) || Number.isNaN(prevNum) || prevNum === 0) {
    return null;
  }

  const diff = Number((currentNum - prevNum).toFixed(2));
  if (diff === 0) {
    return {
      text: `No change`,
      direction: 'neutral',
    };
  }

  const sign = diff > 0 ? '+' : '';
  return {
    text: `${sign}${diff}${measurement.unit ? ` ${measurement.unit}` : ''}`,
    direction: diff > 0 ? 'up' : 'down',
  };
};

const getVitalIcon = (measurement: Measurement) => {
  const id = measurement.id.toLowerCase();
  const label = measurement.label.toLowerCase();

  if (id === 'baby-weight' || label.includes('baby') || label.includes('fetal weight')) {
    return <Baby size={18} className="text-pink-600" />;
  }
  if (id === 'maternal-weight' || label.includes('weight')) {
    return <Scale size={18} className="text-purple-600" />;
  }
  if (id === 'blood-pressure' || label.includes('pressure')) {
    return <HeartPulse size={18} className="text-rose-600" />;
  }
  if (id === 'fetal-heart-rate' || label.includes('heart rate')) {
    return <Activity size={18} className="text-teal-600" />;
  }
  if (id === 'blood-sugar' || id === 'hemoglobin' || label.includes('blood') || label.includes('hemoglobin') || label.includes('glucose')) {
    return <Droplets size={18} className="text-amber-600" />;
  }
  return <Sparkles size={18} className="text-emerald-600" />;
};

const getCategoryBadge = (category?: VitalCategory) => {
  switch (category) {
    case 'baby':
      return {
        label: 'Baby',
        className: 'bg-pink-50 text-pink-700 ring-pink-200/60',
      };
    case 'custom':
      return {
        label: 'Custom',
        className: 'bg-teal-50 text-teal-700 ring-teal-200/60',
      };
    default:
      return {
        label: 'Maternal',
        className: 'bg-purple-50 text-purple-700 ring-purple-200/60',
      };
  }
};

const getPlaceholderForVital = (measurement: Measurement): string => {
  switch (measurement.id) {
    case 'maternal-weight':
      return 'e.g., 64.5';
    case 'baby-weight':
      return 'e.g., 1250';
    case 'blood-pressure':
      return 'e.g., 118/76';
    case 'fetal-heart-rate':
      return 'e.g., 145';
    case 'blood-sugar':
      return 'e.g., 88';
    case 'hemoglobin':
      return 'e.g., 12.1';
    default:
      return 'Enter reading';
  }
};

export default function MeasurementsCard({
  measurements,
  onSave,
  onDelete,
}: MeasurementsCardProps) {
  const logModalTitleId = useId();
  const detailModalTitleId = useId();

  const allVitals = useMemo(
    () => mergeMeasurementsWithDefaults(measurements),
    [measurements],
  );

  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | VitalCategory>('all');
  const [chartConfig, setChartConfig] = useState<{
    isOpen: boolean;
    selectedId?: string;
  }>({ isOpen: false });

  // Batch Log / Manage Vitals Dialog State
  const [isLogDialogOpen, setIsLogDialogOpen] = useState(false);
  const [logDate, setLogDate] = useState<string>(getTodayDateString);
  const [readingInputs, setReadingInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [customDrafts, setCustomDrafts] = useState<CustomVitalDraft[]>([]);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchError, setBatchError] = useState('');

  // Single Vital Detail & History Modal State
  const [selectedVitalId, setSelectedVitalId] = useState<string | null>(null);
  const [singleValue, setSingleValue] = useState('');
  const [singleDate, setSingleDate] = useState<string>(getTodayDateString);
  const [singleNotes, setSingleNotes] = useState('');
  const [isSavingSingle, setIsSavingSingle] = useState(false);
  const [singleError, setSingleError] = useState('');

  const selectedVital = useMemo(
    () => allVitals.find((v) => v.id === selectedVitalId) ?? null,
    [allVitals, selectedVitalId],
  );

  useEffect(() => {
    if (selectedVital) {
      setSingleValue('');
      setSingleDate(getTodayDateString());
      setSingleNotes('');
      setSingleError('');
    }
  }, [selectedVital?.id]);

  const loggedVitalsCount = useMemo(
    () => allVitals.filter((v) => String(v.value ?? '').trim() !== '').length,
    [allVitals],
  );

  const filteredVitals = useMemo(() => {
    if (categoryFilter === 'all') return allVitals;
    return allVitals.filter((v) => (v.category ?? 'maternal') === categoryFilter);
  }, [allVitals, categoryFilter]);

  const chartSeries: ChartSeries[] = useMemo(() => {
    return allVitals.map((vital) => {
      const history = normalizeMeasurementHistory(vital);
      const points = history
        .map((entry) => {
          const numeric = parseNumericForChart(entry.value);
          if (numeric === null) return null;
          return {
            date: entry.measuredAt,
            value: Number(numeric.toFixed(2)),
            displayValue: entry.value,
            notes: entry.notes,
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      return {
        id: vital.id,
        label: vital.label,
        unit: vital.unit || '',
        category: vital.category,
        normalRange: vital.normalRange,
        points,
      };
    });
  }, [allVitals]);

  const openBatchLogDialog = () => {
    setLogDate(getTodayDateString());
    setReadingInputs({});
    setNoteInputs({});
    setCustomDrafts([]);
    setBatchError('');
    setIsLogDialogOpen(true);
  };

  const handleAddCustomDraft = () => {
    setCustomDrafts((prev) => [
      ...prev,
      {
        label: '',
        unit: '',
        category: 'custom',
        normalRange: '',
        value: '',
        notes: '',
      },
    ]);
  };

  const handleCustomDraftChange = (
    index: number,
    field: keyof CustomVitalDraft,
    value: string,
  ) => {
    setCustomDrafts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveCustomDraft = (index: number) => {
    setCustomDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const appendOrUpdateHistoryEntry = (
    vital: Measurement,
    newValue: string,
    measuredAt: string,
    notes?: string,
  ): Measurement => {
    const existingHistory = normalizeMeasurementHistory(vital);
    const trimmedValue = newValue.trim();
    const trimmedNotes = notes?.trim();

    const newEntry: MeasurementHistoryEntry = {
      id: `${vital.id}-${measuredAt}-${Date.now()}`,
      value: trimmedValue,
      measuredAt,
      ...(trimmedNotes ? { notes: trimmedNotes } : {}),
    };

    // Replace entry if one already exists on the exact same date, otherwise append
    const existingDateIdx = existingHistory.findIndex((h) => h.measuredAt === measuredAt);
    const updatedHistory =
      existingDateIdx >= 0
        ? existingHistory.map((h, idx) => (idx === existingDateIdx ? newEntry : h))
        : [...existingHistory, newEntry];

    return recomputeMeasurementFromHistory(vital, updatedHistory);
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError('');
    setIsSavingBatch(true);

    try {
      const targetDate = logDate || getTodayDateString();
      const updatedExisting = allVitals.map((vital) => {
        const enteredValue = readingInputs[vital.id]?.trim();
        if (!enteredValue) {
          return vital;
        }
        const enteredNote = noteInputs[vital.id]?.trim();
        return appendOrUpdateHistoryEntry(vital, enteredValue, targetDate, enteredNote);
      });

      const createdCustomVitals: Measurement[] = customDrafts
        .filter((draft) => draft.label.trim() !== '')
        .map((draft) => {
          const slug = draft.label
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          const id = `custom-${slug || 'vital'}-${Date.now().toString(36)}`;
          const baseVital: Measurement = {
            id,
            label: draft.label.trim(),
            unit: draft.unit.trim() || undefined,
            category: draft.category,
            normalRange: draft.normalRange.trim() || undefined,
            value: '',
            measuredAt: '',
            history: [],
            isCustom: true,
            createdAt: new Date().toISOString(),
          };

          if (draft.value.trim()) {
            return appendOrUpdateHistoryEntry(
              baseVital,
              draft.value.trim(),
              targetDate,
              draft.notes.trim() || undefined,
            );
          }
          return baseVital;
        });

      const toPersist = [...updatedExisting, ...createdCustomVitals].filter(
        (m) => String(m.value ?? '').trim() !== '' || m.isCustom,
      );

      await onSave(toPersist);
      setIsLogDialogOpen(false);
    } catch (err) {
      setBatchError(
        err instanceof Error ? err.message : 'Unable to save vital measurements.',
      );
    } finally {
      setIsSavingBatch(false);
    }
  };

  const handleSingleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVital || !singleValue.trim()) return;

    setSingleError('');
    setIsSavingSingle(true);
    try {
      const updatedVital = appendOrUpdateHistoryEntry(
        selectedVital,
        singleValue.trim(),
        singleDate || getTodayDateString(),
        singleNotes.trim() || undefined,
      );

      const nextList = allVitals
        .map((v) => (v.id === selectedVital.id ? updatedVital : v))
        .filter((m) => String(m.value ?? '').trim() !== '' || m.isCustom);

      await onSave(nextList);
      setSingleValue('');
      setSingleNotes('');
    } catch (err) {
      setSingleError(
        err instanceof Error ? err.message : 'Failed to log reading.',
      );
    } finally {
      setIsSavingSingle(false);
    }
  };

  const handleDeleteHistoryEntry = async (entryId: string) => {
    if (!selectedVital) return;
    setSingleError('');
    setIsSavingSingle(true);
    try {
      const currentHistory = normalizeMeasurementHistory(selectedVital);
      const remainingHistory = currentHistory.filter((h) => h.id !== entryId);
      const updatedVital = recomputeMeasurementFromHistory(selectedVital, remainingHistory);

      const nextList = allVitals
        .map((v) => (v.id === selectedVital.id ? updatedVital : v))
        .filter(
          (m) =>
            m.id === selectedVital.id ||
            String(m.value ?? '').trim() !== '' ||
            m.isCustom,
        );

      await onSave(nextList);
    } catch (err) {
      setSingleError(
        err instanceof Error ? err.message : 'Failed to remove history entry.',
      );
    } finally {
      setIsSavingSingle(false);
    }
  };

  const handleDeleteCustomVital = async (vital: Measurement) => {
    if (!onDelete) return;
    setSingleError('');
    setIsSavingSingle(true);
    try {
      await onDelete(vital.id);
      setSelectedVitalId(null);
    } catch (err) {
      setSingleError(
        err instanceof Error ? err.message : 'Failed to delete custom vital.',
      );
    } finally {
      setIsSavingSingle(false);
    }
  };

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      {/* Collapsible Card Header */}
      <div
        className="flex cursor-pointer select-none items-center justify-between gap-3"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <HeartPulse className="shrink-0 text-purple-500" size={20} />
          <span>Vital Health Factors</span>
        </h3>

        <div className="flex shrink-0 items-center gap-3">
          {isExpanded && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openBatchLogDialog();
              }}
              className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
            >
              <Edit3 size={16} />
              <span>Log</span>
            </button>
          )}

          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {/* Expanded Body */}
      {isExpanded && (
        <div className="mt-5 space-y-4">
          {/* Category Filter Pills & Trends Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'maternal', label: 'Maternal' },
                  { id: 'baby', label: 'Baby' },
                  ...(allVitals.some((v) => v.category === 'custom' || v.isCustom)
                    ? [{ id: 'custom', label: 'Custom' }]
                    : []),
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id as 'all' | VitalCategory)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    categoryFilter === tab.id
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700">
                {loggedVitalsCount}/{allVitals.length}
              </span>
              <button
                type="button"
                onClick={() => setChartConfig({ isOpen: true })}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                title="View Vitals Trends"
              >
                <Activity size={13} className="text-purple-600" />
                <span>Trends</span>
              </button>
            </div>
          </div>

          {/* Stacked Full-Width Vital Cards (matching ActiveMedicationsCard) */}
          <div className="space-y-3">
            {filteredVitals.map((vital) => {
              const hasValue = String(vital.value ?? '').trim() !== '';
              const delta = calculateVitalDelta(vital);
              const historyCount = normalizeMeasurementHistory(vital).length;
              const badge = getCategoryBadge(vital.category);

              return (
                <div
                  key={vital.id}
                  onClick={() => setSelectedVitalId(vital.id)}
                  className="group relative flex cursor-pointer flex-col gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50/50 to-white p-4 ring-1 ring-purple-100/60 transition hover:shadow-sm hover:ring-purple-200"
                >
                  {/* Top Row: Icon + Name + Badge on Left, Value / Log Action on Right */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-slate-100">
                        {getVitalIcon(vital)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="font-semibold text-gray-900 leading-snug">
                            {vital.label}
                          </h4>
                          <span
                            className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.className}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        {vital.normalRange && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            Ref: {vital.normalRange}
                            {vital.unit ? ` ${vital.unit}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Latest Value or Log Button */}
                    <div className="shrink-0 text-right">
                      {hasValue ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="text-lg font-bold tracking-tight text-slate-900">
                              {vital.value}
                            </span>
                            {vital.unit && (
                              <span className="text-xs font-semibold text-slate-500">
                                {vital.unit}
                              </span>
                            )}
                          </div>
                          {delta && (
                            <span
                              className={`mt-0.5 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                delta.direction === 'up'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : delta.direction === 'down'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {delta.direction === 'up' && <TrendingUp size={11} />}
                              {delta.direction === 'down' && <TrendingDown size={11} />}
                              {delta.text}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-200/60 transition group-hover:bg-purple-100">
                          <Plus size={13} />
                          <span>Log</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Optional Note */}
                  {vital.notes && (
                    <div className="rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600 ring-1 ring-inset ring-slate-200/50">
                      {vital.notes}
                    </div>
                  )}

                  {/* Bottom Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-purple-100/50 pt-2 text-xs text-slate-500">
                    {hasValue && vital.measuredAt ? (
                      <span className="inline-flex items-center gap-1 text-slate-500">
                        <Clock size={12} className="shrink-0 text-slate-400" />
                        <span>Recorded {formatDisplayDate(vital.measuredAt)}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">No readings logged yet</span>
                    )}

                    <div className="flex items-center gap-2">
                      {historyCount > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setChartConfig({ isOpen: true, selectedId: vital.id });
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 shadow-2xs ring-1 ring-slate-200/80 transition hover:bg-purple-50 hover:text-purple-700"
                          title="View trend chart"
                        >
                          <History size={11} />
                          <span>
                            {historyCount} {historyCount === 1 ? 'log' : 'logs'}
                          </span>
                        </button>
                      )}
                      {hasValue && (
                        <span className="inline-flex items-center gap-0.5 font-semibold text-purple-700 group-hover:text-purple-900">
                          <Plus size={13} />
                          <span>Add</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trends Chart Modal */}
      {chartConfig.isOpen && (
        <MeasurementsChart
          series={chartSeries}
          initialSelectedId={chartConfig.selectedId}
          onClose={() => setChartConfig({ isOpen: false })}
        />
      )}

      {/* Single Vital Detail & History Modal */}
      {selectedVital && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={detailModalTitleId}
          onMouseDown={(e) => e.target === e.currentTarget && setSelectedVitalId(null)}
        >
          <div className="max-h-[86dvh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs ring-1 ring-slate-100">
                  {getVitalIcon(selectedVital)}
                </div>
                <div>
                  <h2 id={detailModalTitleId} className="text-xl font-semibold text-gray-900">
                    {selectedVital.label}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {selectedVital.unit ? `Unit: ${selectedVital.unit}` : 'Vital metric'}
                    {selectedVital.normalRange ? ` • Ref: ${selectedVital.normalRange}` : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVitalId(null)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              {/* Log New Entry Form */}
              <form
                onSubmit={handleSingleLogSubmit}
                className="rounded-2xl border border-purple-100 bg-white p-4 shadow-xs"
              >
                <h4 className="mb-3 text-sm font-semibold text-gray-800">
                  Log New {selectedVital.label} Reading
                </h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Reading {selectedVital.unit ? `(${selectedVital.unit})` : ''}
                    </label>
                    <input
                      type={isBloodPressureVital(selectedVital) ? 'text' : 'number'}
                      step="any"
                      required
                      value={singleValue}
                      onChange={(e) => setSingleValue(e.target.value)}
                      placeholder={getPlaceholderForVital(selectedVital)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Date Recorded
                    </label>
                    <input
                      type="date"
                      required
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={singleNotes}
                      onChange={(e) => setSingleNotes(e.target.value)}
                      placeholder="Optional note (e.g., Morning fasting, 20-week scan)"
                      className={inputClass}
                    />
                  </div>
                </div>

                {singleError && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">
                    {singleError}
                  </p>
                )}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const vitalId = selectedVital.id;
                      setSelectedVitalId(null);
                      setChartConfig({ isOpen: true, selectedId: vitalId });
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900"
                  >
                    <Activity size={14} />
                    <span>Open Trend Chart</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingSingle || !singleValue.trim()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-50"
                  >
                    {isSavingSingle ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Plus size={14} />
                    )}
                    <span>Save Reading</span>
                  </button>
                </div>
              </form>

              {/* Historical Readings List */}
              <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-gray-100">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Reading History
                  </h4>
                  <span className="text-xs text-slate-400">
                    {normalizeMeasurementHistory(selectedVital).length} entries
                  </span>
                </div>

                {normalizeMeasurementHistory(selectedVital).length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {[...normalizeMeasurementHistory(selectedVital)]
                      .reverse()
                      .map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-bold text-slate-900">
                                {entry.value}
                              </span>
                              {selectedVital.unit && (
                                <span className="text-xs font-medium text-slate-500">
                                  {selectedVital.unit}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                              <Calendar size={11} className="text-slate-400" />
                              {formatDisplayDate(entry.measuredAt)}
                            </p>
                            {entry.notes && (
                              <p className="mt-0.5 text-xs text-slate-600">{entry.notes}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isSavingSingle}
                            onClick={() => handleDeleteHistoryEntry(entry.id)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            title="Delete reading"
                            aria-label="Delete reading"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-slate-400">
                    No readings recorded for {selectedVital.label} yet.
                  </p>
                )}
              </div>

              {/* Delete Custom Vital Option */}
              {selectedVital.isCustom && onDelete && (
                <div className="flex justify-end border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    disabled={isSavingSingle}
                    onClick={() => handleDeleteCustomVital(selectedVital)}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                    <span>Remove Custom Vital</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Batch Log & Manage Vitals Dialog */}
      {isLogDialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={logModalTitleId}
          onMouseDown={(e) => e.target === e.currentTarget && setIsLogDialogOpen(false)}
        >
          <div className="max-h-[86dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
              <div>
                <h2 id={logModalTitleId} className="text-2xl font-semibold text-gray-900">
                  Log Vital Health Factors
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Enter new readings for any vital factor below or add a custom vital to track.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogDialogOpen(false)}
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBatchSubmit} className="p-5 sm:p-6">
              {/* Date Picker */}
              <div className="mb-5 rounded-2xl border border-purple-100 bg-white p-4 shadow-xs">
                <label className="mb-1.5 block text-sm font-semibold text-gray-800">
                  Measurement Date
                </label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  Only vitals where you enter a new value below will be logged for this date.
                </p>
              </div>

              {/* Tracked Vitals Inputs */}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {allVitals.map((vital) => {
                  const badge = getCategoryBadge(vital.category);
                  return (
                    <div
                      key={vital.id}
                      className="rounded-2xl border border-purple-100/80 bg-white p-4 shadow-xs"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <label className="text-sm font-semibold text-gray-800">
                          {vital.label}{' '}
                          {vital.unit && (
                            <span className="font-normal text-gray-500">
                              ({vital.unit})
                            </span>
                          )}
                        </label>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {vital.value && (
                        <p className="mb-2 text-xs text-slate-500">
                          Latest: <strong>{vital.value}</strong> {vital.unit || ''}{' '}
                          {vital.measuredAt ? `(${formatDisplayDate(vital.measuredAt)})` : ''}
                        </p>
                      )}

                      <input
                        type={isBloodPressureVital(vital) ? 'text' : 'number'}
                        step="any"
                        value={readingInputs[vital.id] ?? ''}
                        onChange={(e) =>
                          setReadingInputs((prev) => ({
                            ...prev,
                            [vital.id]: e.target.value,
                          }))
                        }
                        placeholder={getPlaceholderForVital(vital)}
                        className={inputClass}
                      />

                      <input
                        type="text"
                        value={noteInputs[vital.id] ?? ''}
                        onChange={(e) =>
                          setNoteInputs((prev) => ({
                            ...prev,
                            [vital.id]: e.target.value,
                          }))
                        }
                        placeholder="Optional note"
                        className="mt-2 w-full rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2 text-xs outline-none transition placeholder:text-gray-400 focus:border-purple-400 focus:bg-white"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Custom Vitals Section */}
              {customDrafts.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                    New Custom Vitals
                  </h4>
                  {customDrafts.map((draft, index) => (
                    <div
                      key={index}
                      className="relative rounded-2xl border border-teal-100 bg-white p-4 shadow-xs"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h5 className="text-sm font-semibold text-gray-800">
                          Custom Vital {index + 1}
                        </h5>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomDraft(index)}
                          className="rounded-lg p-1.5 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove custom vital"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          required
                          value={draft.label}
                          onChange={(e) =>
                            handleCustomDraftChange(index, 'label', e.target.value)
                          }
                          placeholder="Vital Name (e.g., Fundal Height, Thyroid TSH)"
                          className={inputClass}
                        />
                        <input
                          value={draft.unit}
                          onChange={(e) =>
                            handleCustomDraftChange(index, 'unit', e.target.value)
                          }
                          placeholder="Unit (e.g., cm, mIU/L, °F)"
                          className={inputClass}
                        />
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            handleCustomDraftChange(
                              index,
                              'category',
                              e.target.value as VitalCategory,
                            )
                          }
                          className={inputClass}
                        >
                          <option value="maternal">Maternal Vital</option>
                          <option value="baby">Baby Growth / Fetal Vital</option>
                          <option value="custom">Other / Custom Vital</option>
                        </select>
                        <input
                          value={draft.normalRange}
                          onChange={(e) =>
                            handleCustomDraftChange(index, 'normalRange', e.target.value)
                          }
                          placeholder="Normal Range (optional, e.g., 20 - 24 cm)"
                          className={inputClass}
                        />
                        <input
                          value={draft.value}
                          onChange={(e) =>
                            handleCustomDraftChange(index, 'value', e.target.value)
                          }
                          placeholder="Initial Reading (optional)"
                          className={inputClass}
                        />
                        <input
                          value={draft.notes}
                          onChange={(e) =>
                            handleCustomDraftChange(index, 'notes', e.target.value)
                          }
                          placeholder="Notes (optional)"
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={handleAddCustomDraft}
                className="mt-5 flex items-center gap-2 text-sm font-semibold text-purple-700 transition-colors hover:text-purple-900"
              >
                <Plus size={18} /> Add Custom Vital Factor
              </button>

              {batchError && (
                <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {batchError}
                </p>
              )}

              <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsLogDialogOpen(false)}
                  disabled={isSavingBatch}
                  className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingBatch}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:opacity-60"
                >
                  {isSavingBatch && <Loader2 size={16} className="animate-spin" />}
                  <span>Save Vital Readings</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

