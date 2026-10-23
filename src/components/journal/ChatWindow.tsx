import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowDown, Bot } from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useAppointments } from '../../hooks/useAppointments';
import { useMeasurements } from '../../hooks/useMeasurements';
import { useReminders } from '../../hooks/useReminders';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import { saveAppointment } from '../../services/appointments/appointmentService';
import { subscribeToMedicalReports } from '../../services/reports/medicalReportService';
import { subscribeToMedications } from '../../services/medication/medicationService';
import {
  type ChatSuggestedAppointment,
  EMPTY_JOURNAL_EXTRACTION,
  generateJournalChatReply,
  type JournalChatRecord,
  type JournalMessageExtraction,
  normalizeSuggestedAppointment,
  saveJournalChatTurn,
  subscribeToJournalChats,
  subscribeToRecentDailyLogs,
  updateJournalChatSuggestedAppointment,
  upsertDailyLogFromExtraction,
} from '../../services/ai/journalChatService';
import type { ConversationMessage } from '../../models/chat';
import type { DailyLog } from '../../models/dailylLog';
import type { Medication } from '../../models/medication';
import type { Report } from '../../models/report';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  followUpQuestion?: string;
  suggestedAppointment?: ChatSuggestedAppointment;
  timestamp?: string;
  isError?: boolean;
  retryPrompt?: string;
}

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const formatFriendlyError = (error: unknown): string => {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (
    lower.includes('api key') ||
    lower.includes('apikey') ||
    lower.includes('401') ||
    lower.includes('403')
  ) {
    return 'I couldn’t connect to the AI service because the Gemini API key is missing or invalid. Please check your API key under More → API key and try again.';
  }
  if (
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('resource_exhausted')
  ) {
    return 'I’m receiving a lot of requests right now and hit a temporary rate limit. Please wait a moment and tap Try again.';
  }
  if (
    lower.includes('network') ||
    lower.includes('failed to fetch') ||
    lower.includes('offline')
  ) {
    return 'It looks like your internet connection was interrupted while I was replying. Please check your connection and try again.';
  }
  return 'I ran into a hiccup while putting together your reply. Please tap Try again in a moment.';
};

function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const { profile } = useProfile(userId, id);
  const { appointments } = useAppointments(userId, id);
  const { measurements } = useMeasurements(userId, id);
  const { reminders } = useReminders(userId, id);

  const [reports, setReports] = useState<Report[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [recentDailyLogs, setRecentDailyLogs] = useState<DailyLog[]>([]);

  const [chatRecords, setChatRecords] = useState<JournalChatRecord[]>([]);
  const [hasLoadedChats, setHasLoadedChats] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [knownExtraction, setKnownExtraction] = useState<JournalMessageExtraction>(
    EMPTY_JOURNAL_EXTRACTION
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstName = profile?.fullName?.split(' ')[0];

  const welcomeMessage: Message = {
    id: 'welcome-1',
    role: 'assistant',
    message: `${getTimeGreeting()}${firstName ? `, ${firstName}` : ''} 🌱 How are you feeling today? Feel free to share how your day is going or ask me anything.`,
  };

  useEffect(() => {
    if (!userId || !id) return;

    const unsubReports = subscribeToMedicalReports(
      userId,
      id,
      (fetchedReports) => setReports(fetchedReports),
      () => undefined
    );

    const unsubMedications = subscribeToMedications(
      userId,
      id,
      (fetchedMeds) => setMedications(fetchedMeds),
      () => undefined
    );

    const unsubDailyLogs = subscribeToRecentDailyLogs(userId, id, (logs) => {
      setRecentDailyLogs(logs);
      const todayKey = new Date().toISOString().slice(0, 10);
      const todayLog = logs.find((l) => l.date === todayKey);
      if (todayLog) {
        setKnownExtraction({
          meals: todayLog.meals ?? [],
          hydration: todayLog.hydration ?? [],
          symptoms: todayLog.symptoms ?? [],
          activities: todayLog.activities ?? [],
          medications: todayLog.medications ?? [],
          mood: todayLog.mood,
          sleep: todayLog.sleep,
          notes: (todayLog.notes ?? []).map((n) => n.text),
          other: [],
        });
      }
    });

    return () => {
      unsubReports();
      unsubMedications();
      unsubDailyLogs();
    };
  }, [userId, id]);

  useEffect(() => {
    if (!userId || !id) return;

    const unsubscribe = subscribeToJournalChats(userId, id, (records) => {
      setChatRecords(records);
      setHasLoadedChats(true);
    });

    return unsubscribe;
  }, [userId, id]);

  useEffect(() => {
    if (!hasLoadedChats) return;

    if (chatRecords.length === 0) {
      setMessages((prev) => prev.filter((m) => m.isError));
      return;
    }

    const history: Message[] = chatRecords
      .filter((record) => record.role === 'user' || record.role === 'assistant')
      .map((record) => ({
        id: String(record.id),
        role: record.role as 'user' | 'assistant',
        message: record.content,
        followUpQuestion:
          record.role === 'assistant' ? record.reply?.followUpQuestion : undefined,
        suggestedAppointment:
          record.role === 'assistant'
            ? normalizeSuggestedAppointment(
                record.reply?.suggestedAppointment,
                {
                  profile: profile ?? null,
                  appointments: appointments ?? [],
                  reports,
                },
                record.content
              )
            : undefined,
        timestamp: record.timestamp,
      }));

    setMessages((prev) => {
      const historyIds = new Set(history.map((m) => m.id));
      const pending = prev.filter((m) => !historyIds.has(m.id));
      return [...history, ...pending];
    });
  }, [hasLoadedChats, chatRecords, profile, appointments, reports]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, isSending]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const clientHeight = window.innerHeight;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
      setShowScrollBottom(distanceFromBottom > 220);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [messages.length]);

  const handleSaveSuggestedAppointment = async (
    messageId: string,
    draft: ChatSuggestedAppointment
  ): Promise<string | void> => {
    if (!userId || !id) {
      throw new Error('User or profile not available');
    }

    const createdId = await saveAppointment(userId, id, {
      scheduledAt: draft.scheduledAt ?? new Date().toISOString(),
      doctorName: draft.doctorName ?? '',
      ...(draft.specialty ? { specialty: draft.specialty } : {}),
      ...(draft.hospital ? { hospital: draft.hospital } : {}),
      reason: draft.reason,
      questions: draft.questions ?? [],
      observations: [],
      diagnoses: [],
      recommendations: [],
      prescribedMedications: [],
      medicalRecordIds: [],
      status: 'scheduled',
    });

    const savedDraft: ChatSuggestedAppointment = {
      ...draft,
      savedAppointmentId: createdId,
      dismissed: false,
    };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedAppointment: savedDraft } : m
      )
    );

    await updateJournalChatSuggestedAppointment(userId, id, messageId, savedDraft);
    return createdId;
  };

  const handleDismissSuggestedAppointment = async (
    messageId: string,
    draft: ChatSuggestedAppointment
  ): Promise<void> => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedAppointment: draft } : m
      )
    );

    if (userId && id) {
      await updateJournalChatSuggestedAppointment(userId, id, messageId, draft);
    }
  };

  async function sendPrompt(rawContent: string, isRetry = false) {
    const content = rawContent.trim();
    if (!content || isSending) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const userMessageId = `user-${now}`;

    const cleanHistory = messages.filter((m) => !m.isError);

    if (!isRetry) {
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        message: content,
        timestamp: nowIso,
      };
      setMessages([...cleanHistory, userMessage]);
      setInput('');
    } else {
      setMessages(cleanHistory);
    }

    setIsSending(true);

    try {
      const apiKey =
        userId && id
          ? await getGeminiApiKey(userId, id).catch(() => undefined)
          : undefined;

      const chatHistory: ConversationMessage[] = cleanHistory.map((message) => ({
        id: String(message.id),
        role: message.role,
        content: message.message,
        timestamp: message.timestamp ?? nowIso,
        observationIds: [],
      }));

      const result = await generateJournalChatReply(
        {
          message: content,
          profile: profile ?? null,
          reports,
          appointments: appointments ?? [],
          measurements: measurements ?? [],
          medications,
          reminders,
          recentDailyLogs,
          history: chatHistory,
          knownState: knownExtraction,
        },
        apiKey ?? undefined
      );

      const assistantTimestamp = new Date(Date.now() + 1).toISOString();
      const assistantMessageId = `assistant-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        message: result.reply.answer,
        followUpQuestion: result.reply.followUpQuestion,
        suggestedAppointment: result.reply.suggestedAppointment,
        timestamp: assistantTimestamp,
      };

      setKnownExtraction(result.extracted);
      setMessages((prev) => {
        if (prev.some((m) => m.id === assistantMessageId)) return prev;
        return [...prev.filter((m) => !m.isError), assistantMessage];
      });

      if (userId && id) {
        await Promise.all([
          saveJournalChatTurn(
            userId,
            id,
            {
              id: userMessageId,
              role: 'user',
              content,
              timestamp: nowIso,
              observationIds: [],
            },
            result.extracted,
            result.reply
          ),
          saveJournalChatTurn(
            userId,
            id,
            {
              id: assistantMessageId,
              role: 'assistant',
              content: result.reply.answer,
              timestamp: assistantTimestamp,
              observationIds: [],
            },
            result.extracted,
            result.reply
          ),
          upsertDailyLogFromExtraction(userId, id, result.extracted, {
            date: nowIso,
            profile: profile ?? null,
          }),
        ]);
      }
    } catch (error) {
      const friendlyMessage = formatFriendlyError(error);
      setMessages((prev) => [
        ...prev.filter((m) => !m.isError),
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          message: friendlyMessage,
          timestamp: new Date().toISOString(),
          isError: true,
          retryPrompt: content,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  const displayedMessages = messages.length > 0 ? messages : [welcomeMessage];

  return (
    <div className="space-y-4 pb-28">
      {/* Balanced Header Card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#f2fbf5] to-[#e4f7eb] px-5 py-4 shadow-xs ring-1 ring-emerald-100/70">
        <h1 className="text-xl font-bold text-gray-900">Daily Journal 🌱</h1>
        <p className="mt-0.5 text-xs text-gray-600">
          Tell me about your day or ask anything on your mind.
        </p>
      </div>

      {/* Chat Messages */}
      <div className="space-y-4 pt-1">
        {displayedMessages.map((message) => (
          <ChatBubble
            key={message.id}
            role={message.role}
            message={message.message}
            followUpQuestion={message.followUpQuestion}
            suggestedAppointment={message.suggestedAppointment}
            onSaveAppointment={(draft) =>
              handleSaveSuggestedAppointment(message.id, draft)
            }
            onDismissAppointment={(draft) =>
              handleDismissSuggestedAppointment(message.id, draft)
            }
            timestamp={message.timestamp}
            isError={message.isError}
            onRetry={
              message.isError && message.retryPrompt
                ? () => sendPrompt(message.retryPrompt!, true)
                : undefined
            }
          />
        ))}

        {/* Three-Dot Chatbot Typing Indicator */}
        {isSending && (
          <div className="flex items-end justify-start gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-xs">
              <Bot size={17} />
            </div>
            <div
              className="rounded-2xl rounded-bl-sm bg-white px-4 py-3.5 shadow-xs ring-1 ring-gray-100"
              aria-label="Assistant is typing"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottom && (
        <div className="pointer-events-none fixed bottom-36 left-0 right-0 z-30 flex justify-center">
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs font-semibold text-emerald-800 shadow-md ring-1 ring-emerald-200/80 backdrop-blur-sm transition hover:bg-emerald-50"
          >
            <ArrowDown size={14} className="text-emerald-600" />
            <span>Scroll to bottom</span>
          </button>
        </div>
      )}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => sendPrompt(input)}
        disabled={!input.trim()}
        isLoading={isSending}
      />
    </div>
  );
}

export default ChatWindow;
