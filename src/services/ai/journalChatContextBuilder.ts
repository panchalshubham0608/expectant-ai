import type { ConversationMessage } from '../../models/chat';
import type { ExpectantProfile } from '../../models/profile';
import type { JournalMessageExtraction } from './journalChatService';

const calculatePregnancyWeek = (lastMenstrualPeriod?: string, expectedDueDate?: string) => {
  const referenceDate = lastMenstrualPeriod ? new Date(lastMenstrualPeriod) : expectedDueDate ? new Date(expectedDueDate) : null;
  if (!referenceDate || Number.isNaN(referenceDate.getTime())) {
    return undefined;
  }

  const today = new Date();
  const diffDays = Math.max(0, Math.floor((today.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)));
  return Math.floor(diffDays / 7) + 1;
};

export interface JournalChatContextInput {
  message: string;
  profile?: Partial<ExpectantProfile> | null;
  history?: ConversationMessage[];
  knownState?: JournalMessageExtraction;
}

export interface JournalChatContext {
  profile: {
    name: string;
    pregnancyWeek?: number;
    dueDate?: string;
  };
  currentMessage: string;
  knownState: JournalMessageExtraction;
  recentConversation: string;
  instructions: string;
}

export const buildJournalChatContext = ({
  message,
  profile,
  history,
  knownState,
}: JournalChatContextInput): JournalChatContext => {
  const recentHistory = (history ?? []).slice(-6).map((entry) => `${entry.role}: ${entry.content}`).join('\n');

  return {
    profile: {
      name: profile?.fullName ?? 'Expectant parent',
      pregnancyWeek: calculatePregnancyWeek(profile?.lastMenstrualPeriod, profile?.expectedDueDate),
      dueDate: profile?.expectedDueDate ?? undefined,
    },
    currentMessage: message,
    knownState: knownState ?? { meals: [], hydration: [], symptoms: [], activities: [], medications: [], notes: [], other: [] },
    recentConversation: recentHistory,
    instructions: 'Use the structured data faithfully. Keep responses warm, brief, and pregnancy-aware without diagnosing medical conditions or giving treatment advice.',
  };
};
