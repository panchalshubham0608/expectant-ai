import {
  DEFAULT_VITAL_MEASUREMENTS,
  type Measurement,
  type VitalCategory,
} from '../../models/measurement';
import { DEFAULT_GEMINI_MODEL, getGeminiClient } from './geminiCore';
import {
  buildJournalChatContext,
  type JournalChatContextInput,
} from './journalChatContextBuilder';
import type {
  ChatSuggestedAppointment,
  ChatSuggestedReminder,
  ChatSuggestedVitalItem,
  ChatSuggestedVitals,
  JournalMessageExtraction,
  JournalChatTurnResult,
} from './journalChatService';

const normalizeExtraction = (
  value?: Partial<JournalMessageExtraction>
): JournalMessageExtraction => ({
  meals: value?.meals ?? [],
  hydration: value?.hydration ?? [],
  symptoms: value?.symptoms ?? [],
  mood: value?.mood,
  sleep: value?.sleep,
  activities: value?.activities ?? [],
  medications: value?.medications ?? [],
  notes: value?.notes ?? [],
  other: value?.other ?? [],
});

export const mergeJournalExtraction = (
  current: JournalMessageExtraction,
  next: JournalMessageExtraction
): JournalMessageExtraction => ({
  meals: [...(current.meals ?? []), ...(next.meals ?? [])],
  hydration: [...(current.hydration ?? []), ...(next.hydration ?? [])],
  symptoms: [...(current.symptoms ?? []), ...(next.symptoms ?? [])],
  activities: [...(current.activities ?? []), ...(next.activities ?? [])],
  medications: [...(current.medications ?? []), ...(next.medications ?? [])],
  mood: next.mood ?? current.mood,
  sleep: next.sleep ?? current.sleep,
  notes: [...(current.notes ?? []), ...(next.notes ?? [])],
  other: [...(current.other ?? []), ...(next.other ?? [])],
});

const EMPTY_EXTRACTION: JournalMessageExtraction = {
  meals: [],
  hydration: [],
  symptoms: [],
  activities: [],
  medications: [],
  notes: [],
  other: [],
};

const extractDateFromText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const match = text.match(
    /\bon\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})(?:,?\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM)))?/i
  );
  if (!match) return undefined;
  const datePart = match[1];
  const timePart = match[2] || '10:00 AM';
  const parsed = new Date(`${datePart} ${timePart}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const extractDoctorFromText = (text?: string): string | undefined => {
  if (!text) return undefined;
  const match = text.match(
    /\bwith\s+(Dr\.?\s+[A-Za-z][A-Za-z\s.]+?)(?:\s+on\b|\s+at\b|\s+for\b|[.,?]|$)/i
  );
  return match?.[1]?.trim();
};

const normalizeDoctorKey = (name?: string): string =>
  (name ?? '')
    .toLowerCase()
    .replace(/^dr\.?\s*/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const doctorsMatch = (a?: string, b?: string): boolean => {
  const keyA = normalizeDoctorKey(a);
  const keyB = normalizeDoctorKey(b);
  if (!keyA || !keyB) return false;
  return keyA === keyB || keyA.includes(keyB) || keyB.includes(keyA);
};

export const normalizeSuggestedAppointment = (
  raw: Partial<ChatSuggestedAppointment> | undefined,
  contextInput: Partial<JournalChatContextInput>,
  answerText?: string
): ChatSuggestedAppointment | undefined => {
  if (raw?.savedAppointmentId && raw.reason) {
    return raw as ChatSuggestedAppointment;
  }

  const mentionsFormInAnswer = Boolean(
    answerText &&
      /pre-filled appointment form|appointment form right below|review, edit, or confirm the pre-filled appointment/i.test(
        answerText
      )
  );

  const hasRawData = Boolean(
    raw &&
      (raw.reason?.trim() ||
        raw.scheduledAt?.trim() ||
        raw.doctorName?.trim() ||
        raw.hospital?.trim() ||
        raw.savedAppointmentId ||
        (Array.isArray(raw.questions) && raw.questions.length > 0))
  );

  if (!hasRawData && !mentionsFormInAnswer) {
    return undefined;
  }

  const sortedAppointments = [...(contextInput.appointments ?? [])]
    .filter((a) => a.status !== 'cancelled')
    .sort(
      (a, b) =>
        new Date(b.completedAt || b.scheduledAt).getTime() -
        new Date(a.completedAt || a.scheduledAt).getTime()
    );

  const isFollowUpVisit = Boolean(
    (raw?.reason && /follow[- ]?up/i.test(raw.reason)) ||
      (answerText && /follow[- ]?up/i.test(answerText))
  );

  const extractedDate = extractDateFromText(answerText);
  const targetDatePrefix = (extractedDate || raw?.scheduledAt || '').slice(0, 10);

  const appointmentWithMatchingFollowUp = targetDatePrefix
    ? sortedAppointments.find(
        (a) => a.followUpDate && a.followUpDate.slice(0, 10) === targetDatePrefix
      )
    : undefined;

  const appointmentWithFollowUp =
    appointmentWithMatchingFollowUp ??
    sortedAppointments.find((a) => Boolean(a.followUpDate));

  const candidateDoctor =
    extractDoctorFromText(answerText) ||
    raw?.doctorName?.trim() ||
    appointmentWithFollowUp?.doctorName?.trim() ||
    contextInput.profile?.careProvider?.trim() ||
    sortedAppointments[0]?.doctorName?.trim() ||
    '';

  const sameDoctorFollowUpAppts = candidateDoctor
    ? sortedAppointments.filter(
        (a) =>
          doctorsMatch(a.doctorName, candidateDoctor) &&
          (/follow[- ]?up/i.test(a.reason) || Boolean(a.followUpDate))
      )
    : [];

  const sameDoctorAppts = candidateDoctor
    ? sortedAppointments.filter((a) => doctorsMatch(a.doctorName, candidateDoctor))
    : [];

  const anyFollowUpAppts = sortedAppointments.filter(
    (a) => /follow[- ]?up/i.test(a.reason) || Boolean(a.followUpDate)
  );

  const prioritizedAppts = Array.from(
    new Set([
      ...(appointmentWithFollowUp ? [appointmentWithFollowUp] : []),
      ...sameDoctorFollowUpAppts,
      ...sameDoctorAppts,
      ...(isFollowUpVisit ? anyFollowUpAppts : []),
      ...sortedAppointments,
    ])
  );

  const canonicalDoctorFromHistory = [
    ...(appointmentWithFollowUp &&
    (!candidateDoctor || doctorsMatch(appointmentWithFollowUp.doctorName, candidateDoctor))
      ? [appointmentWithFollowUp]
      : []),
    ...sameDoctorFollowUpAppts,
    ...sameDoctorAppts,
  ]
    .map((a) => a.doctorName?.trim())
    .find(Boolean);

  const inferredDoctor =
    canonicalDoctorFromHistory ||
    candidateDoctor ||
    prioritizedAppts.map((a) => a.doctorName?.trim()).find(Boolean) ||
    '';

  const inferredSpecialty =
    prioritizedAppts.map((a) => a.specialty?.trim()).find(Boolean) ||
    raw?.specialty?.trim() ||
    'OB-GYN';

  const inferredHospital =
    prioritizedAppts.map((a) => a.hospital?.trim()).find(Boolean) ||
    raw?.hospital?.trim() ||
    contextInput.profile?.primaryHospital?.trim() ||
    '';

  const inferredScheduledAt =
    extractedDate ||
    (isFollowUpVisit && appointmentWithFollowUp?.followUpDate
      ? appointmentWithFollowUp.followUpDate.trim()
      : undefined) ||
    raw?.scheduledAt?.trim() ||
    appointmentWithFollowUp?.followUpDate?.trim() ||
    undefined;

  const rawQuestions = Array.isArray(raw?.questions)
    ? raw.questions.map((q) => String(q).trim()).filter(Boolean)
    : [];

  const fallbackQuestions =
    rawQuestions.length > 0
      ? rawQuestions
      : (contextInput.reports ?? [])
          .flatMap((r) => r.summary?.questionsForDoctor ?? [])
          .map((q) => q.trim())
          .filter(Boolean)
          .slice(0, 3);

  const pastFollowUpReason = isFollowUpVisit
    ? sameDoctorFollowUpAppts
        .map((a) => a.reason?.trim())
        .find((r) => r && /follow[- ]?up/i.test(r))
    : undefined;

  const fallbackReason = isFollowUpVisit
    ? pastFollowUpReason || 'Follow-Up Visit'
    : 'Prenatal Checkup';

  return {
    reason: raw?.reason?.trim() || fallbackReason,
    scheduledAt: inferredScheduledAt,
    doctorName: inferredDoctor,
    specialty: inferredSpecialty,
    hospital: inferredHospital,
    questions: fallbackQuestions,
    savedAppointmentId: raw?.savedAppointmentId,
    dismissed: raw?.dismissed,
  };
};

const normalizeTimeString = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();

  // Match 12-hour format e.g. "9:30 AM", "8 PM", "09:00 pm"
  const match12 = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = Number(match12[2] ?? '0');
    const period = match12[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return undefined;
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  // Match 24-hour format e.g. "08:00", "8:30", "21:00"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = Number(match24[1]);
    const minutes = Number(match24[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return undefined;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return undefined;
};

const extractTimesFromText = (text?: string): string[] => {
  if (!text) return [];
  const results: string[] = [];
  const regex = /\b(\d{1,2}(?::\d{2})?\s*(?:AM|PM)|\d{2}:\d{2})\b/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const normalized = normalizeTimeString(match[1]);
    if (normalized && !results.includes(normalized)) {
      results.push(normalized);
    }
  }
  return results;
};

export const normalizeSuggestedReminder = (
  raw: Partial<ChatSuggestedReminder> | undefined,
  contextInput: Partial<JournalChatContextInput>,
  answerText?: string
): ChatSuggestedReminder | undefined => {
  if (raw?.savedReminderId && raw.title) {
    return raw as ChatSuggestedReminder;
  }

  const mentionsReminderFormInAnswer = Boolean(
    answerText &&
      /pre-filled reminder form|reminder form right below|review, edit, or confirm the pre-filled reminder/i.test(
        answerText
      )
  );

  const hasRawData = Boolean(
    raw &&
      (raw.title?.trim() ||
        (Array.isArray(raw.times) && raw.times.length > 0) ||
        (typeof raw.interval === 'number' && raw.interval > 0) ||
        raw.savedReminderId)
  );

  if (!hasRawData && !mentionsReminderFormInAnswer) {
    return undefined;
  }

  const activeMeds = (contextInput.medications ?? []).filter((m) => !m.discontinued);
  const titleCandidate = raw?.title?.trim() || '';
  const searchSource = `${titleCandidate} ${answerText ?? ''}`.toLowerCase();

  const matchedMed = activeMeds.find(
    (med) => med.name && searchSource.includes(med.name.toLowerCase())
  );

  const inferredTitle =
    titleCandidate ||
    (matchedMed ? `Take ${matchedMed.name}` : 'Daily Reminder');

  const medDetails = matchedMed
    ? [matchedMed.dose, matchedMed.frequency, matchedMed.instructions]
        .map((s) => s?.trim())
        .filter(Boolean)
        .join(' • ')
    : undefined;

  const inferredDescription =
    raw?.description?.trim() || medDetails || undefined;

  const isIntervalMode =
    typeof raw?.interval === 'number' &&
    raw.interval > 0 &&
    (!raw.times || raw.times.length === 0);

  if (isIntervalMode) {
    return {
      title: inferredTitle,
      description: inferredDescription,
      frequency: 'daily',
      interval: Math.max(1, Math.round(raw.interval!)),
      intervalUnit: raw?.intervalUnit === 'minutes' ? 'minutes' : 'hours',
      startTime: normalizeTimeString(raw?.startTime) || '08:00',
      endTime: normalizeTimeString(raw?.endTime) || '20:00',
      savedReminderId: raw?.savedReminderId,
      dismissed: raw?.dismissed,
    };
  }

  const normalizedRawTimes = Array.isArray(raw?.times)
    ? raw.times
        .map((t) => normalizeTimeString(String(t)))
        .filter((t): t is string => Boolean(t))
    : [];

  const extractedTimes =
    normalizedRawTimes.length > 0
      ? normalizedRawTimes
      : extractTimesFromText(answerText);

  return {
    title: inferredTitle,
    description: inferredDescription,
    frequency: 'daily',
    times: extractedTimes.length > 0 ? extractedTimes : ['09:00'],
    savedReminderId: raw?.savedReminderId,
    dismissed: raw?.dismissed,
  };
};

interface CanonicalVitalMeta {
  id: string;
  label: string;
  category: VitalCategory;
  unit: string;
  normalRange?: string;
}

const resolveCanonicalVitalMeta = (
  rawId?: string,
  rawLabel?: string,
  rawUnit?: string,
  rawCategory?: VitalCategory,
  rawNormalRange?: string,
  existingHealthMeasurements?: Measurement[]
): CanonicalVitalMeta | null => {
  const cleanId = (rawId ?? '').trim().toLowerCase();
  const cleanLabel = (rawLabel ?? '').trim().toLowerCase();
  const combined = `${cleanId} ${cleanLabel}`.trim();

  if (!combined) return null;

  const findDefault = (id: string) =>
    DEFAULT_VITAL_MEASUREMENTS.find((d) => d.id === id)!;

  // Explicitly ignore expectant's / maternal heart rate (only Fetal Heart Rate is tracked)
  if (
    cleanId === 'heart-rate' ||
    cleanId === 'heart rate' ||
    cleanLabel === 'heart rate' ||
    /\b(maternal[- ]?heart[- ]?rate|mother'?s?[- ]?heart[- ]?rate|pulse[- ]?rate)\b/i.test(
      combined
    )
  ) {
    return null;
  }

  // 1. Baby Weight / Estimated Fetal Weight (EFW)
  if (
    /\b(baby[- ]?weight|fetal[- ]?weight|foetal[- ]?weight|estimated[- ]?fetal[- ]?weight|efw)\b/i.test(
      combined
    )
  ) {
    const def = findDefault('baby-weight');
    return {
      id: def.id,
      label: def.label,
      category: 'baby',
      unit: rawUnit?.trim() || def.unit || 'g',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 2. Maternal Weight (unifying "Weight" and "Maternal Weight")
  if (
    /\b(maternal[- ]?weight|mother'?s?[- ]?weight|mom'?s?[- ]?weight|body[- ]?weight)\b/i.test(
      combined
    ) ||
    cleanId === 'weight' ||
    cleanLabel === 'weight'
  ) {
    const def = findDefault('maternal-weight');
    return {
      id: def.id,
      label: def.label,
      category: 'maternal',
      unit: rawUnit?.trim() || def.unit || 'kg',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 3. Gestational Age (inferred from ultrasound reports or chat)
  if (
    /\b(gestational[- ]?age|pregnancy[- ]?week|ultrasound[- ]?ga|composite[- ]?ga|mean[- ]?ga|fetal[- ]?age|crl[- ]?ga|average[- ]?us[- ]?ga)\b/i.test(
      combined
    ) ||
    cleanId === 'ga' ||
    cleanLabel === 'ga'
  ) {
    const def = findDefault('gestational-age');
    return {
      id: def.id,
      label: def.label,
      category: 'baby',
      unit: rawUnit?.trim() || def.unit || 'weeks',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 4. Fetal Heart Rate (unifying "Baby Heart Rate", "FHR", and "Fetal Heart Rate")
  if (
    /\b(fetal[- ]?heart[- ]?rate|foetal[- ]?heart[- ]?rate|fhr|baby'?s?[- ]?heart[- ]?rate|fetal[- ]?hr|baby[- ]?hr)\b/i.test(
      combined
    )
  ) {
    const def = findDefault('fetal-heart-rate');
    return {
      id: def.id,
      label: def.label,
      category: 'baby',
      unit: rawUnit?.trim() || def.unit || 'bpm',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 5. Blood Pressure
  if (
    /\b(blood[- ]?pressure|maternal[- ]?bp)\b/i.test(combined) ||
    cleanId === 'bp' ||
    cleanLabel === 'bp'
  ) {
    const def = findDefault('blood-pressure');
    return {
      id: def.id,
      label: def.label,
      category: 'maternal',
      unit: rawUnit?.trim() || def.unit || 'mmHg',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 6. Blood Sugar / Glucose (exclude urine sugar/glucose)
  if (
    !/\burine\b/i.test(combined) &&
    /\b(blood[- ]?sugar|blood[- ]?glucose|fasting[- ]?blood[- ]?sugar|random[- ]?blood[- ]?sugar|post[- ]?prandial[- ]?blood[- ]?sugar|fasting[- ]?plasma[- ]?glucose|fbs|rbs|ppbs|ogtt|glucose[- ]?\(?fasting\)?|glucose[- ]?\(?random\)?)\b/i.test(
      combined
    )
  ) {
    const def = findDefault('blood-sugar');
    return {
      id: def.id,
      label: def.label,
      category: 'maternal',
      unit: rawUnit?.trim() || def.unit || 'mg/dL',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 7. Hemoglobin (exclude MCH, MCHC, HbA1c, glycosylated/urine)
  if (
    !/\b(mch|mchc|corpuscular|a1c|glycosylated|glycated|urine)\b/i.test(combined) &&
    /\b(ha?emoglobin|hb|hgb)\b/i.test(combined)
  ) {
    const def = findDefault('hemoglobin');
    return {
      id: def.id,
      label: def.label,
      category: 'maternal',
      unit: rawUnit?.trim() || def.unit || 'g/dL',
      normalRange: rawNormalRange?.trim() || def.normalRange,
    };
  }

  // 8. Also allow any custom vital that the user has explicitly added to their Health section
  if (Array.isArray(existingHealthMeasurements) && existingHealthMeasurements.length > 0) {
    const matchedCustom = existingHealthMeasurements.find((m) => {
      if (!m.isCustom) return false;
      const mId = m.id?.trim().toLowerCase();
      const mLabel = m.label?.trim().toLowerCase();
      return (
        (cleanId && (mId === cleanId || mLabel === cleanId)) ||
        (cleanLabel && (mLabel === cleanLabel || mId === cleanLabel))
      );
    });

    if (matchedCustom) {
      return {
        id: matchedCustom.id,
        label: matchedCustom.label,
        category: matchedCustom.category ?? rawCategory ?? 'custom',
        unit: rawUnit?.trim() || matchedCustom.unit || '',
        normalRange: rawNormalRange?.trim() || matchedCustom.normalRange,
      };
    }
  }

  return null;
};

const normalizeDateYMD = (value?: string, fallbackDate?: string): string => {
  const fallback = fallbackDate || new Date().toISOString().slice(0, 10);
  if (!value) return fallback;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return fallback;
};

const formatGestationalAgeValueAndUnit = (
  rawValue: string,
  _rawUnit?: string
): { value: string; unit: string } => {
  const trimmed = String(rawValue ?? '').trim();
  if (!trimmed) return { value: '', unit: 'weeks' };
  const weekMatch = trimmed.match(/(\d{1,2})/);
  if (weekMatch) {
    return { value: weekMatch[1], unit: 'weeks' };
  }
  return { value: trimmed, unit: 'weeks' };
};

const extractVitalsFromUserMessage = (
  message?: string,
  todayStr?: string
): ChatSuggestedVitalItem[] => {
  if (!message) return [];
  const trimmed = message.trim();
  if (!trimmed) return [];

  // Avoid extracting numbers from pure questions that don't state a reading
  const isPureQuestionWithoutReading =
    /^(what|how|why|when|can|should|is)\b/i.test(trimmed) &&
    !/\b(my|is|was|at|measured|logged|recorded|came back|today)\b.*\d/i.test(trimmed);
  if (isPureQuestionWithoutReading) return [];

  const measuredAt = todayStr || new Date().toISOString().slice(0, 10);
  const discovered: ChatSuggestedVitalItem[] = [];

  // 1. Blood pressure e.g. "BP is 118/76", "blood pressure 120/80 mmHg"
  const bpMatch = trimmed.match(
    /\b(?:blood\s*pressure|bp)\s*(?:is|was|at|of|:|=)?\s*(\d{2,3}\s*\/\s*\d{2,3})(?:\s*mmhg)?\b/i
  );
  if (bpMatch) {
    const meta = resolveCanonicalVitalMeta('blood-pressure', 'Blood Pressure')!;
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: bpMatch[1].replace(/\s+/g, ''),
      unit: meta.unit,
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  // 2. Baby weight / EFW e.g. "baby weight is 1250g", "baby's weight 1.4 kg", "EFW 950 g"
  const babyWeightMatch = trimmed.match(
    /\b(?:baby(?:'s)?\s*weight|fetal\s*weight|estimated\s*fetal\s*weight|efw)\s*(?:is|was|at|of|:|=)?\s*(\d+(?:\.\d+)?)\s*(g|gm|grams?|kg|kgs?)\b/i
  );
  if (babyWeightMatch) {
    const rawVal = Number(babyWeightMatch[1]);
    const rawUnit = babyWeightMatch[2].toLowerCase();
    const isKg = rawUnit.startsWith('k');
    const valueInGrams = isKg && rawVal < 10 ? String(Math.round(rawVal * 1000)) : babyWeightMatch[1];
    const meta = resolveCanonicalVitalMeta('baby-weight', 'Baby Weight', 'g')!;
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: valueInGrams,
      unit: 'g',
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  // 3. Gestational age e.g. "gestational age is 24w 3d", "gestational age 22 weeks 2 days"
  const gaMatch = trimmed.match(
    /\b(?:gestational\s*age|ultrasound\s*ga)\s*(?:is|was|at|of|:|=)?\s*(\d{1,2}\s*(?:weeks?|wks?|w)(?:\s*(?:and\s*|\+\s*)?\d\s*(?:days?|d))?|\d{1,2}(?:\.\d+)?)\b/i
  );
  if (gaMatch) {
    const meta = resolveCanonicalVitalMeta('gestational-age', 'Gestational Age')!;
    const formatted = formatGestationalAgeValueAndUnit(gaMatch[1], meta.unit);
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: formatted.value,
      unit: formatted.unit,
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  // 4. Maternal weight e.g. "my weight is 64.5 kg", "weight today 65 kg", "weigh 63.2 kg"
  const maternalWeightMatch = trimmed.match(
    /\b(?:my\s*weight|maternal\s*weight|current\s*weight|weight(?:\s*today|\s*now)?|i\s*weigh)\s*(?:is|was|at|of|:|=)?\s*(\d{2,3}(?:\.\d+)?)\s*(kg|kgs?|kilograms?|lbs?|pounds?)?\b/i
  );
  if (
    maternalWeightMatch &&
    !/\b(?:baby|fetal|foetal|efw)\s+weight/i.test(maternalWeightMatch[0])
  ) {
    const numVal = Number(maternalWeightMatch[1]);
    if (numVal >= 30 && numVal <= 250) {
      const unitRaw = (maternalWeightMatch[2] || 'kg').toLowerCase();
      const unit = unitRaw.startsWith('lb') || unitRaw.startsWith('pound') ? 'lbs' : 'kg';
      const meta = resolveCanonicalVitalMeta('maternal-weight', 'Maternal Weight', unit)!;
      discovered.push({
        id: meta.id,
        label: meta.label,
        value: maternalWeightMatch[1],
        unit,
        category: meta.category,
        normalRange: meta.normalRange,
        measuredAt,
        sourceReportTitle: 'Shared in Chat',
        selected: true,
      });
    }
  }

  // 5. Fetal heart rate e.g. "fetal heart rate 148 bpm", "FHR is 152", "baby's heart rate was 145 bpm"
  const fhrMatch = trimmed.match(
    /\b(?:fetal\s*heart\s*rate|baby(?:'s)?\s*heart\s*rate|baby(?:'s)?\s*heartbeat|fhr)\s*(?:is|was|at|of|:|=)?\s*(\d{2,3})(?:\s*bpm)?\b/i
  );
  if (fhrMatch) {
    const meta = resolveCanonicalVitalMeta('fetal-heart-rate', 'Fetal Heart Rate')!;
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: fhrMatch[1],
      unit: meta.unit,
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  // 6. Blood sugar / glucose e.g. "blood sugar is 92", "fasting glucose 88 mg/dL", "FBS 90"
  const sugarMatch = trimmed.match(
    /\b(?:fasting\s*blood\s*sugar|random\s*blood\s*sugar|blood\s*sugar|blood\s*glucose|fasting\s*glucose|sugar\s*level|glucose\s*level|fbs|rbs|ppbs)\s*(?:is|was|at|of|:|=)?\s*(\d{2,3}(?:\.\d+)?)(?:\s*mg\/dl)?\b/i
  );
  if (sugarMatch) {
    const meta = resolveCanonicalVitalMeta('blood-sugar', 'Blood Sugar')!;
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: sugarMatch[1],
      unit: meta.unit,
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  // 7. Hemoglobin e.g. "hemoglobin is 11.8", "Hb 12.1 g/dL"
  const hbMatch = trimmed.match(
    /\b(?:ha?emoglobin|hb|hgb)\s*(?:level)?\s*(?:is|was|at|of|:|=)?\s*(\d{1,2}(?:\.\d+)?)(?:\s*g\/dl)?\b/i
  );
  if (hbMatch) {
    const meta = resolveCanonicalVitalMeta('hemoglobin', 'Hemoglobin')!;
    discovered.push({
      id: meta.id,
      label: meta.label,
      value: hbMatch[1],
      unit: meta.unit,
      category: meta.category,
      normalRange: meta.normalRange,
      measuredAt,
      sourceReportTitle: 'Shared in Chat',
      selected: true,
    });
  }

  return discovered;
};

export const normalizeSuggestedVitals = (
  raw: Partial<ChatSuggestedVitals> | undefined,
  contextInput: Partial<JournalChatContextInput>,
  answerText?: string
): ChatSuggestedVitals | undefined => {
  const todayStr = new Date().toISOString().slice(0, 10);
  const userMessage = contextInput.message ?? '';
  const existingHealthMeasurements = contextInput.measurements ?? [];

  const isReportScanIntent = Boolean(
    /\b(scan|check|find|extract|pull|sync|update|discover|latest)\b.*\b(report|reports|vital|vitals|measurement|measurements)\b/i.test(
      userMessage
    ) ||
      /\b(report|reports)\b.*\b(vital|vitals|measurement|measurements|weight|bp|blood pressure|hemoglobin|heart rate|sugar|gestational)\b/i.test(
        userMessage
      ) ||
      (answerText &&
        /confirmation card right below|auto-update these vitals|discovered vitals from your reports/i.test(
          answerText
        ))
  );

  const rawItems = Array.isArray(raw?.items)
    ? raw.items.filter((item) => item && String(item.value ?? '').trim() !== '')
    : [];

  const normalizedAiItems: ChatSuggestedVitalItem[] = [];
  for (const item of rawItems) {
    const meta = resolveCanonicalVitalMeta(
      item.id,
      item.label,
      item.unit,
      item.category,
      item.normalRange,
      existingHealthMeasurements
    );
    if (!meta) continue;

    const rawVal = String(item.value ?? '').trim();
    if (meta.id === 'gestational-age') {
      const formatted = formatGestationalAgeValueAndUnit(rawVal, item.unit || meta.unit);
      normalizedAiItems.push({
        id: meta.id,
        label: meta.label,
        value: formatted.value,
        unit: formatted.unit,
        category: meta.category,
        normalRange: item.normalRange?.trim() || meta.normalRange,
        measuredAt: normalizeDateYMD(item.measuredAt, todayStr),
        sourceReportTitle: item.sourceReportTitle?.trim() || undefined,
        notes: item.notes?.trim() || undefined,
        selected: item.selected ?? true,
      });
      continue;
    }

    const cleanedVal =
      meta.unit &&
      rawVal.toLowerCase().endsWith(meta.unit.toLowerCase()) &&
      rawVal.length > meta.unit.length
        ? rawVal.slice(0, -meta.unit.length).trim()
        : rawVal;

    normalizedAiItems.push({
      id: meta.id,
      label: meta.label,
      value: cleanedVal,
      unit: item.unit?.trim() || meta.unit,
      category: meta.category,
      normalRange: item.normalRange?.trim() || meta.normalRange,
      measuredAt: normalizeDateYMD(item.measuredAt, todayStr),
      sourceReportTitle: item.sourceReportTitle?.trim() || undefined,
      notes: item.notes?.trim() || undefined,
      selected: item.selected ?? true,
    });
  }

  // Extract latest measurements from uploaded medical reports when scanning reports (only for Health section vitals)
  const reportItems: ChatSuggestedVitalItem[] = [];
  if (isReportScanIntent && Array.isArray(contextInput.reports)) {
    const sortedReports = [...contextInput.reports].sort(
      (a, b) =>
        new Date(b.reportDate || b.createdAt || 0).getTime() -
        new Date(a.reportDate || a.createdAt || 0).getTime()
    );

    for (const report of sortedReports) {
      const reportDate = normalizeDateYMD(
        report.reportDate || report.createdAt,
        todayStr
      );
      const reportMeasurements = report.measurements ?? [];
      let foundGaInReport = false;

      for (const m of reportMeasurements) {
        const valStr = String(m.value ?? '').trim();
        if (!valStr) continue;
        const meta = resolveCanonicalVitalMeta(
          m.id || m.type,
          m.label,
          m.unit,
          m.category,
          m.normalRange,
          existingHealthMeasurements
        );
        if (!meta) continue;

        if (meta.id === 'gestational-age') {
          foundGaInReport = true;
          const formatted = formatGestationalAgeValueAndUnit(valStr, m.unit || meta.unit);
          reportItems.push({
            id: meta.id,
            label: meta.label,
            value: formatted.value,
            unit: formatted.unit,
            category: meta.category,
            normalRange: m.normalRange?.trim() || meta.normalRange,
            measuredAt: reportDate,
            sourceReportTitle: report.title,
            notes: m.notes?.trim() || `From ${report.title}`,
            selected: true,
          });
          continue;
        }

        const cleanedVal =
          meta.unit &&
          valStr.toLowerCase().endsWith(meta.unit.toLowerCase()) &&
          valStr.length > meta.unit.length
            ? valStr.slice(0, -meta.unit.length).trim()
            : valStr;

        reportItems.push({
          id: meta.id,
          label: meta.label,
          value: cleanedVal,
          unit: m.unit?.trim() || meta.unit,
          category: meta.category,
          normalRange: m.normalRange?.trim() || meta.normalRange,
          measuredAt: reportDate,
          sourceReportTitle: report.title,
          notes: m.notes?.trim() || `From ${report.title}`,
          selected: true,
        });
      }

      // Also infer Gestational Age from ultrasound report metadata/summary if not already in report.measurements
      const isUltrasoundReport =
        report.reportType === 'ultrasound' ||
        /\b(ultrasound|sonography|scan|anomaly|growth|fetal|foetal|nt\s*scan|dating)\b/i.test(
          `${report.title ?? ''} ${report.summary?.plainEnglish ?? ''}`
        );

      if (!foundGaInReport && isUltrasoundReport) {
        const metaGa = resolveCanonicalVitalMeta(
          'gestational-age',
          'Gestational Age'
        )!;
        const metadataWeek = report.metadata?.pregnancyWeek?.trim();
        let inferredGa = metadataWeek || '';

        if (!inferredGa) {
          const searchPool = [
            ...(report.summary?.importantFindings ?? []),
            report.summary?.plainEnglish ?? '',
          ].join(' ');
          const gaTextMatch =
            searchPool.match(
              /\b(?:gestational\s*age|ultrasound\s*ga|composite\s*ga|mean\s*ga|fetal\s*age|maturity|fetus\s*of|pregnancy\s*of)\s*(?:is|of|at|:|~|approx\.?)?\s*(\d{1,2}\s*(?:weeks?|wks?|w)(?:\s*(?:and\s*|\+\s*)?\d\s*(?:days?|d))?)/i
            ) ||
            searchPool.match(
              /\b(\d{1,2}\s*(?:weeks?|wks?)\s*(?:and\s*)?\d\s*(?:days?)|\d{1,2}\s*w\s*\d\s*d)\b/i
            );
          if (gaTextMatch) {
            inferredGa = gaTextMatch[1].trim();
          }
        }

        if (inferredGa) {
          const formatted = formatGestationalAgeValueAndUnit(inferredGa, metaGa.unit);
          reportItems.push({
            id: metaGa.id,
            label: metaGa.label,
            value: formatted.value,
            unit: formatted.unit,
            category: metaGa.category,
            normalRange: metaGa.normalRange,
            measuredAt: reportDate,
            sourceReportTitle: report.title,
            notes: `From ${report.title}`,
            selected: true,
          });
        }
      }
    }
  }

  // Also check if user directly provided vital updates in their message
  const userMessageItems = extractVitalsFromUserMessage(userMessage, todayStr);

  // Merge items by canonical id:
  // When scanning reports, prioritize deterministic reportItems (which carry the exact report.reportDate)
  // so that AI fallback dates (todayStr) never override the real report date.
  const orderedCandidates = isReportScanIntent
    ? [...reportItems, ...normalizedAiItems, ...userMessageItems]
    : [...userMessageItems, ...normalizedAiItems, ...reportItems];

  const byId = new Map<string, ChatSuggestedVitalItem>();
  for (const candidate of orderedCandidates) {
    if (!candidate.value) continue;
    const existing = byId.get(candidate.id);
    if (!existing) {
      byId.set(candidate.id, candidate);
    } else if (!existing.sourceReportTitle && candidate.sourceReportTitle) {
      byId.set(candidate.id, {
        ...existing,
        sourceReportTitle: candidate.sourceReportTitle,
      });
    }
  }

  const finalItems = Array.from(byId.values());
  if (finalItems.length === 0) {
    return undefined;
  }

  return {
    items: finalItems,
    savedAt: raw?.savedAt,
    dismissed: raw?.dismissed,
  };
};

const JOURNAL_CHAT_SYSTEM_INSTRUCTION = `You are MIRA (Maternal Intelligence & Record Assistant), a warm, empathetic, and deeply knowledgeable pregnancy companion and daily journal assistant for an expectant parent.

You have full access to the expectant's context in the JSON payload:
- "profile": Name, age, blood group, location, current pregnancy week/day, trimester, expected due date, LMP, care provider, and primaryHospital.
- "medicalReports": Uploaded ultrasound, blood test, urine test, prescription, and consultation reports (including plain-English summaries, important findings, diagnoses, measurements, prescribed medicines, historical comparisons, and questions for the doctor).
- "appointments": Upcoming scheduled visits and past completed visits (doctor name, specialty, hospital, reason, observations, diagnoses, recommendations, prescribed medications, and follow-up dates).
- "healthMeasurements": Tracked vitals and measurements (maternal weight, baby weight, gestational age, fetal heart rate, blood pressure, blood sugar, hemoglobin, etc.) with previous values and normal ranges.
- "medications": Currently active medications (with dose, frequency, duration, instructions) and discontinued medications.
- "activeReminders": Daily/weekly reminders configured by the expectant.
- "recentDailyLogs" & "knownState": Recent daily journal logs (meals, hydration, symptoms, mood, sleep, activities, medications taken, notes).
- "recentConversation": The ongoing chat history.
- "currentMessage": The expectant's latest message or question.

YOUR RESPONSIBILITIES:
1. Personalized, Context-Aware Answers ("answer"):
   - Answer any question the expectant asks using their specific profile, reports, appointments, measurements, medications, and recent logs.
   - When asked about reports, measurements, medications, or appointments, cite the relevant dates, values, doctor names, and findings clearly and accurately in plain, reassuring language.
   - Use clean formatting in "answer": short paragraphs, bullet points ("- ") for lists, and **bold** for key terms, dates, or values when helpful.
   - Keep your tone warm, supportive, and conversational.
   - Maintain continuity with "recentConversation".

2. Medical Safety & Boundaries:
   - Never diagnose medical conditions or prescribe/alter medications.
   - When discussing lab values, symptoms, or medications, provide educational context and encourage discussing specifics with their care provider (use their doctor's name from "profile.careProvider" or recent appointments when available).
   - If the expectant describes urgent red-flag symptoms (e.g., severe abdominal pain, heavy vaginal bleeding, severe headache with vision changes, high fever, or noticeably reduced fetal movement), gently advise contacting their care provider or hospital right away.

3. Structured Daily Journal Extraction ("extracted"):
   - Extract ONLY newly mentioned journal facts from "currentMessage" (do NOT repeat items already present in "knownState" or "recentConversation").
   - If "currentMessage" is purely a question (e.g., asking about a report or appointment) and does not log any new meals, hydration, symptoms, mood, sleep, activities, or medications taken, return empty arrays in "extracted".

4. Optional Follow-Up ("followUpQuestion"):
   - Optionally include a single, natural, caring follow-up question in "followUpQuestion" if it helps continue the conversation or check in on them.

5. Chat-Integrated Appointment Scheduling ("suggestedAppointment"):
   - Populate "suggestedAppointment" ONLY when:
     a) The expectant asks to schedule, book, create, or set up an appointment, checkup, or scan, OR
     b) The expectant asks about a follow-up visit, upcoming milestone scan, or recent report/symptom that directly warrants scheduling a doctor visit.
   - Leave "suggestedAppointment" omitted/null for general conversation where scheduling a visit is not relevant.
   - When populating "suggestedAppointment", carefully analyze past and upcoming "appointments" first to infer accurate metadata:
     - "doctorName": Match the doctor from the user's message, the appointment with a "followUpDate", or past follow-up appointments (or "profile.careProvider").
     - "specialty": Infer from past appointments with that same doctor or past follow-up appointments (e.g., "OB-GYN").
     - "hospital": Infer from past appointments with that same doctor or past follow-up appointments (e.g., the specific clinic such as "Dr. Garima Jain Clinic" recorded on past visits with that doctor, falling back to "profile.primaryHospital" only if no appointment has a hospital).
     - "reason": Clear visit purpose matching past appointment conventions or the user's request (e.g., "Follow-Up Visit", "20-Week Anomaly Scan", "Routine Prenatal Checkup").
     - "scheduledAt": ISO 8601 local datetime string ("YYYY-MM-DDTHH:mm") resolved relative to "currentDate" if the user mentioned a day/time, or from a recent appointment's "followUpDate", or a sensible upcoming default.
     - "questions": 2 to 4 relevant questions for the doctor seeded from the user's message, recent medical reports ("questionsForDoctor" or key findings), past appointment recommendations/observations, and recent symptoms/logs.
   - When you include "suggestedAppointment", mention in "answer" that you've prepared a pre-filled appointment form right below so they can review or adjust the details and save it.

6. Chat-Integrated Reminder Setup ("suggestedReminder"):
   - Populate "suggestedReminder" ONLY when:
     a) The expectant asks to create, set, add, or schedule a reminder or alarm (e.g., for taking a medication, drinking water/hydration, walking, kick counts, or checking vitals), OR
     b) The expectant mentions forgetting a medication or routine habit and asks for help remembering it.
   - Leave "suggestedReminder" omitted/null for general conversation where setting a reminder is not requested or relevant.
   - When populating "suggestedReminder", infer accurate details from the user's request, "medications.active", "medicalReports", and "activeReminders":
     - "title": Clear, concise reminder title (e.g., "Take Iron Supplement", "Hydration Check", "Evening Walk").
     - "description": Helpful instructions or dose details (e.g., "Take 1 tablet after lunch" inferred from "medications.active" or reports, or "Drink a full glass of water").
     - Choose EITHER specific times OR a repeating interval:
       - For specific daily times (e.g., once, twice, or three times a day): populate "times" with 24-hour "HH:mm" strings (e.g., ["09:00", "21:00"]). Infer appropriate times from the user's message or medication instructions (e.g., "after breakfast" -> "09:00", "after lunch" -> "13:30", "at bedtime/after dinner" -> "21:00").
       - For repeating interval reminders (e.g., "every 2 hours" for hydration): populate "interval" (number, e.g., 2), "intervalUnit" ("hours" or "minutes"), "startTime" ("HH:mm", default "08:00"), and "endTime" ("HH:mm", default "20:00"), and leave "times" empty.
   - When you include "suggestedReminder", mention in "answer" that you've prepared a pre-filled reminder form right below so they can review or adjust the schedule and save it.

7. Chat-Integrated Vital Signs Discovery & Auto-Update ("suggestedVitals"):
   - Populate "suggestedVitals" ONLY for vitals that exist in the expectant's Health section ("healthMeasurements") in TWO scenarios:
     a) REPORT SCANNING FOR VITALS: When the expectant asks to scan, check, find, extract, or update their vital measurements from their uploaded medical reports (or asks what the latest vitals in their reports are). Scan across "medicalReports" (selecting the latest reading by "reportDate" for each tracked vital) and populate "suggestedVitals.items" ONLY for vitals tracked in "healthMeasurements":
        - Maternal Weight ("maternal-weight"): unify any "Weight" or "Maternal Weight" reading into "maternal-weight".
        - Baby Weight ("baby-weight"): unify any "Estimated Fetal Weight", "EFW", "Fetal Weight", or "Baby Weight" reading into "baby-weight".
        - Gestational Age ("gestational-age"): infer from the latest ultrasound report (from "measurements", "metadata.pregnancyWeek", or "summary.importantFindings") and keep the value in weeks only (e.g., "21" with unit "weeks" instead of "21 weeks 3 days").
        - Fetal Heart Rate ("fetal-heart-rate"): unify any "Fetal Heart Rate", "Baby Heart Rate", or "FHR" reading into "fetal-heart-rate". Do NOT include the expectant's own maternal heart rate / pulse.
        - Blood Pressure ("blood-pressure")
        - Blood Sugar ("blood-sugar")
        - Hemoglobin ("hemoglobin")
        Do NOT include unrelated routine lab rows (such as WBC, RBC, Neutrophils, Urine pH, BPD, FL, or maternal heart rate). Set "measuredAt" to the report's "reportDate" ("YYYY-MM-DD") and "sourceReportTitle" to the report's title.
     b) USER-PROVIDED VITAL UPDATES IN CHAT: When the expectant shares, logs, or mentions new readings for any of their tracked Health vitals directly in "currentMessage" (e.g., "My weight today is 64.5 kg", "BP was 118/76 and baby heart rate 148 bpm", "Baby weight is 1250g", "Gestational age is 21 weeks", "My fasting blood sugar is 90", "Hemoglobin came back at 11.8"). Extract every mentioned tracked vital reading into "suggestedVitals.items" with "measuredAt" set to "currentDate" (or the specific date mentioned in "YYYY-MM-DD" format) and "sourceReportTitle" set to "Shared in Chat".
   - Leave "suggestedVitals" omitted/null for general conversation where the expectant neither shares new vital readings nor asks to scan/extract vitals from reports.
   - Use ONLY the canonical IDs and labels from the Health section:
     - "maternal-weight": label "Maternal Weight", category "maternal", unit "kg", normalRange "Steady trimester gain"
     - "baby-weight": label "Baby Weight", category "baby", unit "g", normalRange "Varies by week"
     - "gestational-age": label "Gestational Age", category "baby", unit "weeks", normalRange "1 – 40" (value as integer weeks, e.g., "21")
     - "fetal-heart-rate": label "Fetal Heart Rate", category "baby", unit "bpm", normalRange "110 – 160"
     - "blood-pressure": label "Blood Pressure", category "maternal", unit "mmHg", normalRange "90/60 – 120/80"
     - "blood-sugar": label "Blood Sugar", category "maternal", unit "mg/dL", normalRange "70 – 95 (fasting)"
     - "hemoglobin": label "Hemoglobin", category "maternal", unit "g/dL", normalRange "11.0 – 14.0"
   - When you include "suggestedVitals", mention in "answer" that you've prepared a confirmation card right below so they can review and auto-update these vitals to their Health tracker.

Return valid JSON matching the schema exactly.`;

export const generateJournalChatReply = async (
  contextInput: JournalChatContextInput,
  userApiKey?: string
): Promise<JournalChatTurnResult> => {
  const ai = getGeminiClient(userApiKey);
  const env =
    typeof process !== 'undefined' && process.env
      ? process.env
      : (import.meta as any).env;
  const model = env?.VITE_GEMINI_MODEL || DEFAULT_GEMINI_MODEL;

  const context = buildJournalChatContext(contextInput);

  const response = await ai.models.generateContent({
    model,
    contents: JSON.stringify(context, null, 2),
    config: {
      systemInstruction: JOURNAL_CHAT_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          extracted: {
            type: 'OBJECT',
            properties: {
              meals: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    mealType: {
                      type: 'STRING',
                      enum: ['breakfast', 'lunch', 'dinner', 'snack'],
                    },
                    consumedAt: { type: 'STRING' },
                    foods: {
                      type: 'ARRAY',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          name: { type: 'STRING' },
                          quantity: { type: 'STRING' },
                          confidence: { type: 'NUMBER' },
                        },
                        required: ['name', 'confidence'],
                      },
                    },
                    notes: { type: 'STRING' },
                  },
                  required: ['mealType', 'foods'],
                },
              },
              hydration: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    amountMl: { type: 'NUMBER' },
                    type: {
                      type: 'STRING',
                      enum: ['water', 'milk', 'juice', 'coconut-water', 'other'],
                    },
                    timestamp: { type: 'STRING' },
                  },
                  required: ['amountMl', 'type'],
                },
              },
              symptoms: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: { type: 'STRING' },
                    severity: {
                      type: 'STRING',
                      enum: ['mild', 'moderate', 'severe'],
                    },
                    startedAt: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                  required: ['type', 'severity'],
                },
              },
              mood: {
                type: 'OBJECT',
                properties: {
                  mood: {
                    type: 'STRING',
                    enum: [
                      'happy',
                      'calm',
                      'tired',
                      'anxious',
                      'stressed',
                      'sad',
                      'other',
                    ],
                  },
                  notes: { type: 'STRING' },
                  time: { type: 'STRING' },
                },
              },
              sleep: {
                type: 'OBJECT',
                properties: {
                  bedtime: { type: 'STRING' },
                  wakeTime: { type: 'STRING' },
                  quality: { type: 'NUMBER' },
                  naps: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        start: { type: 'STRING' },
                        end: { type: 'STRING' },
                      },
                    },
                  },
                },
              },
              activities: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    type: { type: 'STRING' },
                    durationMinutes: { type: 'NUMBER' },
                    intensity: {
                      type: 'STRING',
                      enum: ['low', 'moderate', 'high'],
                    },
                    timestamp: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                },
              },
              medications: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    medicineName: { type: 'STRING' },
                    scheduledTime: { type: 'STRING' },
                    takenTime: { type: 'STRING' },
                    dose: { type: 'STRING' },
                    taken: { type: 'BOOLEAN' },
                  },
                  required: ['medicineName', 'taken'],
                },
              },
              notes: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              other: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: [
              'meals',
              'hydration',
              'symptoms',
              'activities',
              'medications',
              'notes',
              'other',
            ],
          },
          answer: { type: 'STRING' },
          followUpQuestion: { type: 'STRING' },
          summary: { type: 'STRING' },
          suggestedAppointment: {
            type: 'OBJECT',
            properties: {
              reason: { type: 'STRING' },
              scheduledAt: { type: 'STRING' },
              doctorName: { type: 'STRING' },
              specialty: { type: 'STRING' },
              hospital: { type: 'STRING' },
              questions: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
            },
            required: ['reason'],
          },
          suggestedReminder: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              times: {
                type: 'ARRAY',
                items: { type: 'STRING' },
              },
              interval: { type: 'NUMBER' },
              intervalUnit: {
                type: 'STRING',
                enum: ['hours', 'minutes'],
              },
              startTime: { type: 'STRING' },
              endTime: { type: 'STRING' },
            },
            required: ['title'],
          },
          suggestedVitals: {
            type: 'OBJECT',
            properties: {
              items: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    id: { type: 'STRING' },
                    label: { type: 'STRING' },
                    value: { type: 'STRING' },
                    unit: { type: 'STRING' },
                    category: {
                      type: 'STRING',
                      enum: ['maternal', 'baby', 'custom'],
                    },
                    normalRange: { type: 'STRING' },
                    measuredAt: { type: 'STRING' },
                    sourceReportTitle: { type: 'STRING' },
                    notes: { type: 'STRING' },
                  },
                  required: ['label', 'value'],
                },
              },
            },
            required: ['items'],
          },
        },
        required: ['extracted', 'answer'],
      },
    },
  });

  if (!response.text) {
    throw new Error('Gemini returned an empty response for the journal chat.');
  }

  const parsed = JSON.parse(response.text) as Partial<{
    extracted?: Partial<JournalMessageExtraction>;
    answer?: string;
    followUpQuestion?: string;
    summary?: string;
    suggestedAppointment?: Partial<ChatSuggestedAppointment>;
    suggestedReminder?: Partial<ChatSuggestedReminder>;
    suggestedVitals?: Partial<ChatSuggestedVitals>;
  }>;

  const extracted = normalizeExtraction(parsed.extracted ?? EMPTY_EXTRACTION);
  const merged = contextInput.knownState
    ? mergeJournalExtraction(contextInput.knownState, extracted)
    : extracted;

  const suggestedAppointment = normalizeSuggestedAppointment(
    parsed.suggestedAppointment,
    contextInput,
    parsed.answer
  );

  const suggestedReminder = normalizeSuggestedReminder(
    parsed.suggestedReminder,
    contextInput,
    parsed.answer
  );

  const suggestedVitals = normalizeSuggestedVitals(
    parsed.suggestedVitals,
    contextInput,
    parsed.answer
  );

  return {
    extracted: merged,
    reply: {
      answer:
        parsed.answer ||
        'I have noted that. Tell me a little more about how you are feeling today.',
      followUpQuestion: parsed.followUpQuestion,
      summary: parsed.summary,
      suggestedAppointment,
      suggestedReminder,
      suggestedVitals,
    },
  };
};