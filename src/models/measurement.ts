export type VitalCategory = 'maternal' | 'baby' | 'custom';

export interface MeasurementHistoryEntry {
  id: string;
  value: string;
  measuredAt: string;
  notes?: string;
}

export interface Measurement {
  id: string;
  reportId?: string;
  type?: string;
  label: string;
  category?: VitalCategory;

  value: string;
  previousValue?: string;
  unit?: string;
  normalRange?: string;
  measuredAt: string;
  notes?: string;
  history?: MeasurementHistoryEntry[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_VITAL_MEASUREMENTS: Measurement[] = [
  {
    id: 'maternal-weight',
    label: 'Maternal Weight',
    category: 'maternal',
    value: '',
    unit: 'kg',
    normalRange: 'Steady trimester gain',
    measuredAt: '',
    history: [],
  },
  {
    id: 'baby-weight',
    label: 'Baby Weight',
    category: 'baby',
    value: '',
    unit: 'g',
    normalRange: 'Varies by week',
    measuredAt: '',
    history: [],
  },
  {
    id: 'blood-pressure',
    label: 'Blood Pressure',
    category: 'maternal',
    value: '',
    unit: 'mmHg',
    normalRange: '90/60 – 120/80',
    measuredAt: '',
    history: [],
  },
  {
    id: 'fetal-heart-rate',
    label: 'Fetal Heart Rate',
    category: 'baby',
    value: '',
    unit: 'bpm',
    normalRange: '110 – 160',
    measuredAt: '',
    history: [],
  },
  {
    id: 'blood-sugar',
    label: 'Blood Sugar',
    category: 'maternal',
    value: '',
    unit: 'mg/dL',
    normalRange: '70 – 95 (fasting)',
    measuredAt: '',
    history: [],
  },
  {
    id: 'hemoglobin',
    label: 'Hemoglobin',
    category: 'maternal',
    value: '',
    unit: 'g/dL',
    normalRange: '11.0 – 14.0',
    measuredAt: '',
    history: [],
  },
];

export const normalizeMeasurementHistory = (
  measurement: Measurement,
): MeasurementHistoryEntry[] => {
  if (Array.isArray(measurement.history) && measurement.history.length > 0) {
    return [...measurement.history]
      .filter((entry) => entry && String(entry.value ?? '').trim() !== '')
      .sort((a, b) => (a.measuredAt || '').localeCompare(b.measuredAt || ''));
  }

  const trimmedValue = String(measurement.value ?? '').trim();
  if (!trimmedValue) {
    return [];
  }

  const measuredDate =
    measurement.measuredAt || new Date().toISOString().split('T')[0];
  const entries: MeasurementHistoryEntry[] = [];

  if (measurement.previousValue && String(measurement.previousValue).trim() !== '') {
    const baseDate = new Date(measuredDate);
    if (!Number.isNaN(baseDate.getTime())) {
      baseDate.setDate(baseDate.getDate() - 7);
    }
    const prevDateStr = !Number.isNaN(baseDate.getTime())
      ? baseDate.toISOString().split('T')[0]
      : measuredDate;
    entries.push({
      id: `${measurement.id}-prev`,
      value: String(measurement.previousValue).trim(),
      measuredAt: prevDateStr,
    });
  }

  entries.push({
    id: `${measurement.id}-latest`,
    value: trimmedValue,
    measuredAt: measuredDate,
    ...(measurement.notes ? { notes: measurement.notes } : {}),
  });

  return entries;
};

export const recomputeMeasurementFromHistory = (
  measurement: Measurement,
  rawHistory: MeasurementHistoryEntry[],
): Measurement => {
  const sorted = [...rawHistory]
    .filter((entry) => entry && String(entry.value ?? '').trim() !== '')
    .sort((a, b) => (a.measuredAt || '').localeCompare(b.measuredAt || ''));

  if (sorted.length === 0) {
    return {
      ...measurement,
      value: '',
      previousValue: undefined,
      measuredAt: '',
      notes: undefined,
      history: [],
    };
  }

  const latest = sorted[sorted.length - 1];
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : undefined;

  return {
    ...measurement,
    value: latest.value,
    previousValue: previous?.value,
    measuredAt: latest.measuredAt,
    notes: latest.notes,
    history: sorted,
  };
};

export const mergeMeasurementsWithDefaults = (
  saved: Measurement[] | null | undefined,
): Measurement[] => {
  const savedList = saved ?? [];
  const matchedIds = new Set<string>();

  const mergedDefaults = DEFAULT_VITAL_MEASUREMENTS.map((defaultVital) => {
    const match = savedList.find(
      (item) =>
        item.id === defaultVital.id ||
        item.label?.trim().toLowerCase() === defaultVital.label.toLowerCase(),
    );

    if (!match) {
      return defaultVital;
    }

    matchedIds.add(match.id);
    const history = normalizeMeasurementHistory(match);
    return recomputeMeasurementFromHistory(
      {
        ...defaultVital,
        ...match,
        id: match.id || defaultVital.id,
        label: match.label || defaultVital.label,
        unit: match.unit ?? defaultVital.unit,
        normalRange: match.normalRange ?? defaultVital.normalRange,
        category: match.category ?? defaultVital.category,
      },
      history,
    );
  });

  const additionalVitals = savedList
    .filter((item) => !matchedIds.has(item.id))
    .map((item) => {
      const history = normalizeMeasurementHistory(item);
      return recomputeMeasurementFromHistory(
        {
          ...item,
          category: item.category ?? 'custom',
          isCustom: item.isCustom ?? true,
        },
        history,
      );
    });

  return [...mergedDefaults, ...additionalVitals];
};

