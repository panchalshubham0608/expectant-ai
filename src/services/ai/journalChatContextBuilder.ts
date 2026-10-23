import type { Appointment } from '../../models/appointment';
import type { ConversationMessage } from '../../models/chat';
import type { DailyLog } from '../../models/dailylLog';
import type { Measurement } from '../../models/measurement';
import type { Medication } from '../../models/medication';
import type { ExpectantProfile } from '../../models/profile';
import type { Reminder } from '../../models/reminder';
import type { Report } from '../../models/report';
import { getPregnancyAge } from '../../utils/pregnancyUtils';
import type { JournalMessageExtraction } from './journalChatService';

const calculateAgeYears = (dateOfBirth?: string): number | undefined => {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : undefined;
};

export interface JournalChatContextInput {
  message: string;
  profile?: Partial<ExpectantProfile> | null;
  reports?: Report[] | null;
  appointments?: Appointment[] | null;
  measurements?: Measurement[] | null;
  medications?: Medication[] | null;
  reminders?: Reminder[] | null;
  recentDailyLogs?: DailyLog[] | null;
  history?: ConversationMessage[];
  knownState?: JournalMessageExtraction;
}

export interface JournalChatContext {
  currentDate: string;
  profile: {
    name: string;
    dateOfBirth?: string;
    ageYears?: number;
    bloodGroup?: string;
    location?: string;
    pregnancyWeek?: number;
    pregnancyDay?: number;
    trimester?: string;
    dueDate?: string;
    lastMenstrualPeriod?: string;
    ultrasoundLastMenstrualPeriod?: string;
    careProvider?: string;
    primaryHospital?: string;
    primaryHospitalLocation?: string;
  };
  medicalReports: Array<{
    title: string;
    reportType: string;
    reportDate: string;
    pregnancyWeek?: string | null;
    doctor?: string | null;
    hospital?: string | null;
    plainEnglishSummary?: string;
    importantFindings: string[];
    diagnoses: string[];
    recommendations: string[];
    questionsForDoctor: string[];
    measurements: Array<{
      label: string;
      value: string;
      unit?: string;
      measuredAt?: string;
    }>;
    medicines: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
    }>;
    historicalComparison?: Report['historicalComparison'];
    nextVisit?: string;
  }>;
  appointments: {
    upcoming: Array<{
      scheduledAt: string;
      doctorName: string;
      specialty?: string;
      hospital?: string;
      reason: string;
      questions: string[];
    }>;
    past: Array<{
      scheduledAt: string;
      completedAt?: string;
      doctorName: string;
      specialty?: string;
      hospital?: string;
      reason: string;
      observations: string[];
      diagnoses: string[];
      recommendations: string[];
      prescribedMedications: Array<{
        name: string;
        dose?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
      }>;
      followUpDate?: string;
    }>;
  };
  healthMeasurements: Array<{
    label: string;
    value: string;
    unit?: string;
    previousValue?: string;
    normalRange?: string;
    measuredAt: string;
  }>;
  medications: {
    active: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      duration?: string;
      instructions?: string;
      startedAt?: string;
      continuedAt?: string;
    }>;
    discontinued: Array<{
      name: string;
      dose?: string;
      frequency?: string;
      discontinuedAt?: string;
    }>;
  };
  activeReminders: Array<{
    title: string;
    description?: string;
    frequency: string;
    times: string[];
  }>;
  recentDailyLogs: Array<{
    date: string;
    pregnancyWeek: number;
    meals: DailyLog['meals'];
    hydration: DailyLog['hydration'];
    symptoms: DailyLog['symptoms'];
    activities: DailyLog['activities'];
    medications: DailyLog['medications'];
    sleep?: DailyLog['sleep'];
    mood?: DailyLog['mood'];
    notes: DailyLog['notes'];
  }>;
  currentMessage: string;
  knownState: JournalMessageExtraction;
  recentConversation: string;
  instructions: string;
}

export const buildJournalChatContext = ({
  message,
  profile,
  reports,
  appointments,
  measurements,
  medications,
  reminders,
  recentDailyLogs,
  history,
  knownState,
}: JournalChatContextInput): JournalChatContext => {
  const age = getPregnancyAge(
    profile?.lastMenstrualPeriod,
    profile?.ultrasoundLastMenstrualPeriod
  );
  const currentWeek = age && !age.isFuture ? age.currentWeek : undefined;
  const trimester =
    currentWeek === undefined
      ? undefined
      : currentWeek < 14
        ? 'First trimester'
        : currentWeek < 28
          ? 'Second trimester'
          : 'Third trimester';

  const recentHistory = (history ?? [])
    .slice(-20)
    .map((entry) => `${entry.role === 'user' ? 'Expectant' : 'Assistant'}: ${entry.content}`)
    .join('\n');

  const sortedReports = [...(reports ?? [])]
    .sort((a, b) => (b.reportDate || '').localeCompare(a.reportDate || ''))
    .slice(0, 12)
    .map((report) => ({
      title: report.title,
      reportType: report.reportType,
      reportDate: report.reportDate,
      pregnancyWeek: report.metadata?.pregnancyWeek ?? null,
      doctor: report.metadata?.doctor ?? null,
      hospital: report.metadata?.hospital ?? null,
      plainEnglishSummary: report.summary?.plainEnglish,
      importantFindings: report.summary?.importantFindings ?? [],
      diagnoses: report.diagnoses ?? [],
      recommendations: [
        ...(report.recommendations ?? []),
        ...(report.summary?.followUpActions ?? []),
      ],
      questionsForDoctor: report.summary?.questionsForDoctor ?? [],
      measurements: (report.measurements ?? []).map((m) => ({
        label: m.label,
        value: m.value,
        unit: m.unit,
        measuredAt: m.measuredAt,
      })),
      medicines: (report.medicines ?? []).map((med) => ({
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions,
      })),
      historicalComparison: report.historicalComparison,
      nextVisit: report.nextVisit,
    }));

  const allAppointments = appointments ?? [];
  const upcomingAppointments = allAppointments
    .filter((a) => a.status === 'scheduled')
    .sort((a, b) => (a.scheduledAt || '').localeCompare(b.scheduledAt || ''))
    .map((a) => ({
      scheduledAt: a.scheduledAt,
      doctorName: a.doctorName,
      specialty: a.specialty,
      hospital: a.hospital,
      reason: a.reason,
      questions: a.questions ?? [],
    }));

  const pastAppointments = allAppointments
    .filter((a) => a.status === 'completed')
    .sort((a, b) => (b.completedAt || b.scheduledAt || '').localeCompare(a.completedAt || a.scheduledAt || ''))
    .slice(0, 10)
    .map((a) => ({
      scheduledAt: a.scheduledAt,
      completedAt: a.completedAt,
      doctorName: a.doctorName,
      specialty: a.specialty,
      hospital: a.hospital,
      reason: a.reason,
      observations: a.observations ?? [],
      diagnoses: a.diagnoses ?? [],
      recommendations: a.recommendations ?? [],
      prescribedMedications: (a.prescribedMedications ?? []).map((m) => ({
        name: m.name,
        dose: m.dose,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions,
      })),
      followUpDate: a.followUpDate,
    }));

  const allMedications = medications ?? [];
  const activeMedications = allMedications
    .filter((m) => !m.discontinued)
    .map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      duration: m.duration,
      instructions: m.instructions,
      startedAt: m.startedAt,
      continuedAt: m.continuedAt,
    }));

  const discontinuedMedications = allMedications
    .filter((m) => m.discontinued)
    .map((m) => ({
      name: m.name,
      dose: m.dose,
      frequency: m.frequency,
      discontinuedAt: m.discontinuedAt,
    }));

  const activeReminders = (reminders ?? [])
    .filter((r) => r.isActive !== false && r.id !== 'daily-moment')
    .map((r) => ({
      title: r.title,
      description: r.description,
      frequency: r.frequency,
      times: r.times ?? [],
    }));

  const formattedDailyLogs = [...(recentDailyLogs ?? [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 7)
    .map((log) => ({
      date: log.date,
      pregnancyWeek: log.pregnancyWeek,
      meals: log.meals ?? [],
      hydration: log.hydration ?? [],
      symptoms: log.symptoms ?? [],
      activities: log.activities ?? [],
      medications: log.medications ?? [],
      sleep: log.sleep,
      mood: log.mood,
      notes: log.notes ?? [],
    }));

  return {
    currentDate: new Date().toISOString().slice(0, 10),
    profile: {
      name: profile?.fullName ?? 'Expectant parent',
      dateOfBirth: profile?.dateOfBirth,
      ageYears: calculateAgeYears(profile?.dateOfBirth),
      bloodGroup: profile?.bloodGroup,
      location: profile?.location,
      pregnancyWeek: age && !age.isFuture ? age.weeks : undefined,
      pregnancyDay: age && !age.isFuture ? age.days : undefined,
      trimester,
      dueDate: profile?.expectedDueDate ?? undefined,
      lastMenstrualPeriod: profile?.lastMenstrualPeriod,
      ultrasoundLastMenstrualPeriod: profile?.ultrasoundLastMenstrualPeriod,
      careProvider: profile?.careProvider,
      primaryHospital: profile?.primaryHospital,
      primaryHospitalLocation: profile?.primaryHospitalLocation,
    },
    medicalReports: sortedReports,
    appointments: {
      upcoming: upcomingAppointments,
      past: pastAppointments,
    },
    healthMeasurements: (measurements ?? []).map((m) => ({
      label: m.label,
      value: m.value,
      unit: m.unit,
      previousValue: m.previousValue,
      normalRange: m.normalRange,
      measuredAt: m.measuredAt,
    })),
    medications: {
      active: activeMedications,
      discontinued: discontinuedMedications,
    },
    activeReminders,
    recentDailyLogs: formattedDailyLogs,
    currentMessage: message,
    knownState:
      knownState ?? {
        meals: [],
        hydration: [],
        symptoms: [],
        activities: [],
        medications: [],
        notes: [],
        other: [],
      },
    recentConversation: recentHistory,
    instructions:
      'Use the expectant profile, medical reports, appointments, health measurements, medications, reminders, and recent daily logs faithfully to answer questions with warmth, clarity, and personalization. Never diagnose conditions or prescribe/change treatments.',
  };
};
