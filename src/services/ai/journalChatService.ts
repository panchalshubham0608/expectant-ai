import type { ConversationMessage } from '../../models/chat';
import type { MoodLog } from '../../models/mood';
import type { SleepLog } from '../../models/sleep';
import type { Activity } from '../../models/activity';
import type { HydrationLog } from '../../models/hydration';
import type { Meal } from '../../models/meal';
import type { MedicationLog } from '../../models/medication';
import type { ReminderFrequency } from '../../models/reminder';
import type { Symptom } from '../../models/symptom';

export {
  generateJournalChatReply,
  mergeJournalExtraction,
  normalizeSuggestedAppointment,
  normalizeSuggestedReminder,
} from './journalChatAI';
export {
  buildJournalChatContext,
  type JournalChatContextInput,
  type JournalChatContext,
} from './journalChatContextBuilder';
export {
  saveJournalChatTurn,
  updateJournalChatSuggestedAppointment,
  updateJournalChatSuggestedReminder,
  clearJournalChats,
  upsertDailyLogFromExtraction,
  subscribeToJournalChats,
  subscribeToRecentDailyLogs,
} from './journalChatPersistence';

export interface JournalMessageExtraction {
  meals: Partial<Meal>[];
  hydration: Partial<HydrationLog>[];
  symptoms: Partial<Symptom>[];
  mood?: Partial<MoodLog>;
  sleep?: Partial<SleepLog>;
  activities: Partial<Activity>[];
  medications: Partial<MedicationLog>[];
  notes: string[];
  other: string[];
}

export interface ChatSuggestedAppointment {
  reason: string;
  scheduledAt?: string;
  doctorName?: string;
  specialty?: string;
  hospital?: string;
  questions?: string[];
  savedAppointmentId?: string;
  dismissed?: boolean;
}

export interface ChatSuggestedReminder {
  title: string;
  description?: string;
  frequency?: ReminderFrequency;
  times?: string[];
  interval?: number;
  intervalUnit?: 'hours' | 'minutes';
  startTime?: string;
  endTime?: string;
  savedReminderId?: string;
  dismissed?: boolean;
}

export interface JournalChatReply {
  answer: string;
  followUpQuestion?: string;
  summary?: string;
  suggestedAppointment?: ChatSuggestedAppointment;
  suggestedReminder?: ChatSuggestedReminder;
}

export interface JournalChatTurnResult {
  extracted: JournalMessageExtraction;
  reply: JournalChatReply;
}

export interface JournalChatRecord extends ConversationMessage {
  extracted?: JournalMessageExtraction;
  reply?: JournalChatReply;
  profileId?: string;
}

export const EMPTY_JOURNAL_EXTRACTION: JournalMessageExtraction = {
  meals: [],
  hydration: [],
  symptoms: [],
  activities: [],
  medications: [],
  notes: [],
  other: [],
};

