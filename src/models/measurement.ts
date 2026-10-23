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
    id: 'gestational-age',
    label: 'Gestational Age',
    category: 'baby',
    value: '',
    unit: 'weeks',
    normalRange: '1 – 40 weeks',
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

const matchSavedItemToDefaultId = (
  item: Measurement,
): string | 'IGNORE' | null => {
  const cleanId = (item.id ?? '').trim().toLowerCase();
  const cleanLabel = (item.label ?? '').trim().toLowerCase();
  const combined = `${cleanId} ${cleanLabel}`.trim();

  // 1. Baby Weight / Fetal Weight / EFW
  if (
    /\b(baby[- ]?weight|fetal[- ]?weight|foetal[- ]?weight|estimated[- ]?fetal[- ]?weight|efw)\b/i.test(
      combined,
    )
  ) {
    return 'baby-weight';
  }

  // 2. Maternal Weight (including legacy "Weight")
  if (
    /\b(maternal[- ]?weight|mother'?s?[- ]?weight|mom'?s?[- ]?weight|body[- ]?weight)\b/i.test(
      combined,
    ) ||
    cleanId === 'weight' ||
    cleanLabel === 'weight'
  ) {
    return 'maternal-weight';
  }

  // 3. Gestational Age
  if (
    /\b(gestational[- ]?age|pregnancy[- ]?week|ultrasound[- ]?ga|composite[- ]?ga|mean[- ]?ga)\b/i.test(
      combined,
    ) ||
    cleanId === 'ga' ||
    cleanLabel === 'ga'
  ) {
    return 'gestational-age';
  }

  // 4. Fetal Heart Rate (including "Baby Heart Rate" / "FHR")
  if (
    /\b(fetal[- ]?heart[- ]?rate|foetal[- ]?heart[- ]?rate|baby'?s?[- ]?heart[- ]?rate|fhr|fetal[- ]?hr|baby[- ]?hr)\b/i.test(
      combined,
    )
  ) {
    return 'fetal-heart-rate';
  }

  // Ignore expectant's / maternal heart rate (not tracked in pregnancy vitals)
  if (
    cleanId === 'heart-rate' ||
    cleanId === 'heart rate' ||
    cleanLabel === 'heart rate' ||
    /\b(maternal[- ]?heart[- ]?rate|mother'?s?[- ]?heart[- ]?rate|pulse[- ]?rate)\b/i.test(
      combined,
    )
  ) {
    return 'IGNORE';
  }

  // 5. Blood Pressure
  if (
    /\b(blood[- ]?pressure|maternal[- ]?bp)\b/i.test(combined) ||
    cleanId === 'bp' ||
    cleanLabel === 'bp'
  ) {
    return 'blood-pressure';
  }

  // 6. Blood Sugar / Glucose
  if (
    !/\burine\b/i.test(combined) &&
    /\b(blood[- ]?sugar|blood[- ]?glucose|fasting[- ]?blood[- ]?sugar|random[- ]?blood[- ]?sugar|fbs|rbs|ppbs|ogtt|glucose)\b/i.test(
      combined,
    )
  ) {
    return 'blood-sugar';
  }

  // 7. Hemoglobin
  if (
    !/\b(mch|mchc|corpuscular|a1c|glycosylated|glycated|urine)\b/i.test(
      combined,
    ) &&
    /\b(ha?emoglobin|hb|hgb)\b/i.test(combined)
  ) {
    return 'hemoglobin';
  }

  return null;
};

export const mergeMeasurementsWithDefaults = (
  saved: Measurement[] | null | undefined,
): Measurement[] => {
  const savedList = saved ?? [];
  const consumedSavedIds = new Set<string>();

  const mergedDefaults = DEFAULT_VITAL_MEASUREMENTS.map((defaultVital) => {
    const matchingItems = savedList.filter(
      (item) => matchSavedItemToDefaultId(item) === defaultVital.id,
    );

    if (matchingItems.length === 0) {
      return defaultVital;
    }

    matchingItems.forEach((m) => consumedSavedIds.add(m.id));

    // Combine and deduplicate history entries across all matching saved records (e.g. "Weight" + "Maternal Weight")
    const historyByDateAndVal = new Map<string, MeasurementHistoryEntry>();
    for (const matchItem of matchingItems) {
      for (const entry of normalizeMeasurementHistory(matchItem)) {
        const key = `${entry.measuredAt}::${entry.value.trim()}`;
        if (!historyByDateAndVal.has(key)) {
          historyByDateAndVal.set(key, entry);
        }
      }
    }

    const combinedHistory = Array.from(historyByDateAndVal.values());
    const primaryMatch =
      matchingItems.find((m) => m.id === defaultVital.id) ?? matchingItems[0];

    return recomputeMeasurementFromHistory(
      {
        ...defaultVital,
        ...primaryMatch,
        id: defaultVital.id,
        label: defaultVital.label,
        unit: defaultVital.unit || primaryMatch.unit,
        normalRange: defaultVital.normalRange || primaryMatch.normalRange,
        category: defaultVital.category,
        isCustom: false,
      },
      combinedHistory,
    );
  });

  // Mark ignored legacy items (like expectant's Heart Rate) as consumed so they don't appear
  for (const item of savedList) {
    if (matchSavedItemToDefaultId(item) === 'IGNORE') {
      consumedSavedIds.add(item.id);
    }
  }

  const additionalVitals = savedList
    .filter((item) => !consumedSavedIds.has(item.id))
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

