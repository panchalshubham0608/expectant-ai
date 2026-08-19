import type { ConversationMessage } from '../../models/chat';
import type { MoodLog } from '../../models/mood';
import type { SleepLog } from '../../models/sleep';
import type { Activity } from '../../models/activity';
import type { HydrationLog } from '../../models/hydration';
import type { Meal } from '../../models/meal';
import type { MedicationLog } from '../../models/medication';
import type { Symptom } from '../../models/symptom';

// Re-export public API from sub-services
export { generateJournalChatReply, mergeJournalExtraction } from './journalChatAI';\nexport { buildJournalChatContext, type JournalChatContextInput, type JournalChatContext } from './journalChatContextBuilder';\nexport { saveJournalChatTurn, upsertDailyLogFromExtraction, subscribeToJournalChats } from './journalChatPersistence';

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



export interface JournalChatReply {
  answer: string;
  followUpQuestion?: string;
  summary?: string;
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

