import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowDown,
  Bot,
  FolderOpen,
  Loader2,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useAppointments } from '../../hooks/useAppointments';
import { useMeasurements } from '../../hooks/useMeasurements';
import { useReminders } from '../../hooks/useReminders';
import { getGeminiApiKey } from '../../services/profiles/profileService';
import { saveAppointment } from '../../services/appointments/appointmentService';
import { updateMeasurements } from '../../services/measurements/measurementsService';
import { saveReminder } from '../../services/reminders/reminderService';
import {
  getCalendarAccessToken,
  syncReminderToCalendar,
} from '../../services/calendar/calendarService';
import type { Reminder } from '../../models/reminder';
import { subscribeToMedicalReports } from '../../services/reports/medicalReportService';
import { uploadChatAttachmentToGoogleDrive } from '../../services/reports/reportsService';
import { subscribeToMedications } from '../../services/medication/medicationService';
import { subscribeToLatestHealthActivityInsight } from '../../services/ai/healthInsightsService';
import {
  type ChatSuggestedAppointment,
  type ChatSuggestedReminder,
  type ChatSuggestedVitals,
  deleteJournalChatMessages,
  EMPTY_JOURNAL_EXTRACTION,
  generateJournalChatReply,
  type JournalChatRecord,
  type JournalMessageExtraction,
  normalizeSuggestedAppointment,
  normalizeSuggestedReminder,
  normalizeSuggestedVitals,
  saveJournalChatTurn,
  subscribeToJournalChats,
  subscribeToRecentDailyLogs,
  updateJournalChatSuggestedAppointment,
  updateJournalChatSuggestedReminder,
  updateJournalChatSuggestedVitals,
  upsertDailyLogFromExtraction,
} from '../../services/ai/journalChatService';
import type {
  ChatAttachmentMeta,
  ConversationMessage,
} from '../../models/chat';
import type { DailyLog } from '../../models/dailylLog';
import type { AIHealthActivityInsight } from '../../models/health';
import {
  mergeMeasurementsWithDefaults,
  normalizeMeasurementHistory,
  recomputeMeasurementFromHistory,
  type Measurement,
} from '../../models/measurement';
import type { Medication } from '../../models/medication';
import type { Report } from '../../models/report';
import {
  ensureGoogleDriveToken,
  fetchDriveFilePreview,
  hasGoogleDriveToken,
  isAnyDriveActivityInProgress,
  isDriveTokenRefreshing,
  restoreGoogleDriveSession,
  subscribeToDriveCacheUpdates,
} from '../../services/storage/googleDriveService';
import {
  type ChatAttachmentInput,
  getAttachmentPreviewUrl,
  stripAttachmentBase64,
} from '../../utils/chatAttachments';
import ChatAttachmentPreviewModal from './ChatAttachmentPreviewModal';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import ChatMediaGalleryModal, {
  type ChatMediaGalleryItem,
} from './ChatMediaGalleryModal';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  attachments?: ChatAttachmentMeta[];
  followUpQuestion?: string;
  suggestedAppointment?: ChatSuggestedAppointment;
  suggestedReminder?: ChatSuggestedReminder;
  suggestedVitals?: ChatSuggestedVitals;
  timestamp?: string;
  isError?: boolean;
  retryPrompt?: string;
  retryAttachments?: ChatAttachmentInput[];
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

  const mergedMeasurements = useMemo(
    () => mergeMeasurementsWithDefaults(measurements),
    [measurements]
  );

  const [reports, setReports] = useState<Report[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [recentDailyLogs, setRecentDailyLogs] = useState<DailyLog[]>([]);
  const [healthActivityInsight, setHealthActivityInsight] =
    useState<AIHealthActivityInsight | null>(null);

  const [chatRecords, setChatRecords] = useState<JournalChatRecord[]>([]);
  const [hasLoadedChats, setHasLoadedChats] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachmentInput[]>([]);
  const [previewAttachment, setPreviewAttachment] =
    useState<ChatAttachmentMeta | null>(null);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [knownExtraction, setKnownExtraction] = useState<JournalMessageExtraction>(
    EMPTY_JOURNAL_EXTRACTION
  );

  const allChatAttachments = useMemo<ChatMediaGalleryItem[]>(() => {
    const items: ChatMediaGalleryItem[] = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.isError || !msg.attachments || msg.attachments.length === 0) {
        continue;
      }
      for (const att of msg.attachments) {
        items.push({
          ...att,
          timestamp: msg.timestamp,
        });
      }
    }
    return items;
  }, [messages]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const firstName = profile?.fullName?.trim().split(/\s+/)[0];
  const userInitial = firstName ? firstName.charAt(0).toUpperCase() : undefined;

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

    const unsubHealthInsight = subscribeToLatestHealthActivityInsight(
      userId,
      id,
      (latestInsight) => setHealthActivityInsight(latestInsight),
      () => undefined
    );

    return () => {
      unsubReports();
      unsubMedications();
      unsubDailyLogs();
      unsubHealthInsight();
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

    const filteredRecords = chatRecords.filter(
      (record) => record.role === 'user' || record.role === 'assistant'
    );

    const history: Message[] = filteredRecords.map((record, index) => {
      const prevUserRecord =
        record.role === 'assistant' &&
        index > 0 &&
        filteredRecords[index - 1]?.role === 'user'
          ? filteredRecords[index - 1]
          : undefined;

      return {
        id: String(record.id),
        role: record.role as 'user' | 'assistant',
        message: record.content,
        attachments: record.attachments,
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
        suggestedReminder:
          record.role === 'assistant'
            ? normalizeSuggestedReminder(
                record.reply?.suggestedReminder,
                {
                  message: prevUserRecord?.content,
                  medications,
                  reports,
                  reminders: reminders ?? [],
                },
                record.content
              )
            : undefined,
        suggestedVitals:
          record.role === 'assistant'
            ? normalizeSuggestedVitals(
                record.reply?.suggestedVitals,
                {
                  message: prevUserRecord?.content,
                  reports,
                  measurements: mergedMeasurements,
                },
                record.content
              )
            : undefined,
        timestamp: record.timestamp,
      };
    });

    setMessages((prev) => {
      const historyIds = new Set(history.map((m) => m.id));
      const pending = prev.filter((m) => !historyIds.has(m.id));
      return [...history, ...pending];
    });
  }, [
    hasLoadedChats,
    chatRecords,
    profile,
    appointments,
    reports,
    medications,
    reminders,
    mergedMeasurements,
  ]);

  const [isDriveRefreshing, setIsDriveRefreshing] = useState(() =>
    isDriveTokenRefreshing()
  );
  const [isDriveSyncing, setIsDriveSyncing] = useState(() =>
    isAnyDriveActivityInProgress()
  );
  const [hasDriveToken, setHasDriveToken] = useState(() =>
    hasGoogleDriveToken()
  );

  useEffect(() => {
    return subscribeToDriveCacheUpdates(() => {
      setIsDriveRefreshing(isDriveTokenRefreshing());
      setIsDriveSyncing(isAnyDriveActivityInProgress());
      setHasDriveToken(hasGoogleDriveToken());
    });
  }, []);

  // Silently restore Google Drive session and fetch attachment previews when chat loads (never opens a popup on load)
  useEffect(() => {
    if (!hasLoadedChats) return;
    const driveAttachments = allChatAttachments.filter(
      (att) => Boolean(att.url) && !getAttachmentPreviewUrl(att)
    );
    if (driveAttachments.length === 0) return;

    let cancelled = false;
    void (async () => {
      const token = hasDriveToken
        ? 'valid'
        : await restoreGoogleDriveSession(userId);
      if (cancelled || !token) return;
      for (const att of driveAttachments) {
        if (att.url) {
          void fetchDriveFilePreview(att.url, att.mimeType, false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasLoadedChats, allChatAttachments, userId, hasDriveToken]);

  const hasInitialScrollDoneRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    hasInitialScrollDoneRef.current = false;
    prevMessagesLengthRef.current = 0;
  }, [userId, id]);

  useEffect(() => {
    if (!hasLoadedChats) return;
    if (chatRecords.length > 0 && messages.length === 0) return;

    if (!hasInitialScrollDoneRef.current) {
      hasInitialScrollDoneRef.current = true;
      prevMessagesLengthRef.current = messages.length;
      scrollToBottom('auto');
      return;
    }

    if (messages.length > prevMessagesLengthRef.current || isSending) {
      scrollToBottom('smooth');
    }
    prevMessagesLengthRef.current = messages.length;
  }, [hasLoadedChats, chatRecords.length, messages.length, isSending]);

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

  const handleSaveSuggestedReminder = async (
    messageId: string,
    draft: ChatSuggestedReminder
  ): Promise<string | void> => {
    if (!userId || !id) {
      throw new Error('User or profile not available');
    }

    const isIntervalMode =
      typeof draft.interval === 'number' && draft.interval > 0;
    const frequency = draft.frequency ?? 'daily';

    const reminderToSave: Partial<Reminder> = {
      title: draft.title,
      ...(draft.description ? { description: draft.description } : {}),
      frequency,
      isActive: true,
      ...(isIntervalMode
        ? {
            interval: draft.interval,
            intervalUnit: draft.intervalUnit ?? 'hours',
            startTime: draft.startTime ?? '09:00',
            endTime: draft.endTime ?? '21:00',
          }
        : {
            times:
              draft.times && draft.times.length > 0 ? draft.times : ['09:00'],
          }),
      ...(frequency === 'weekly' ||
      (frequency === 'custom' && draft.customIntervalUnit === 'weeks')
        ? draft.daysOfWeek && draft.daysOfWeek.length > 0
          ? { daysOfWeek: draft.daysOfWeek }
          : {}
        : {}),
      ...(frequency === 'custom'
        ? {
            customInterval:
              draft.customInterval && draft.customInterval > 0
                ? draft.customInterval
                : 2,
            customIntervalUnit: draft.customIntervalUnit ?? 'days',
          }
        : {}),
      ...(draft.startDate
        ? { startDate: draft.startDate }
        : frequency === 'custom' || frequency === 'once'
          ? {
              startDate: (() => {
                const now = new Date();
                const y = now.getFullYear();
                const m = String(now.getMonth() + 1).padStart(2, '0');
                const d = String(now.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
              })(),
            }
          : {}),
      ...(frequency !== 'once' && draft.endDate
        ? { endDate: draft.endDate }
        : {}),
    };

    let finalReminderToSave: Partial<Reminder> = reminderToSave;

    if (profile?.syncRemindersToCalendar) {
      try {
        const token = await getCalendarAccessToken();
        finalReminderToSave = await syncReminderToCalendar(
          reminderToSave as Reminder,
          token,
          id
        );
      } catch {
        // Calendar sync is best-effort during chat save; still save the reminder locally.
      }
    }

    const createdId = await saveReminder(userId, id, finalReminderToSave);

    const savedDraft: ChatSuggestedReminder = {
      ...draft,
      savedReminderId: createdId,
      dismissed: false,
    };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedReminder: savedDraft } : m
      )
    );

    await updateJournalChatSuggestedReminder(userId, id, messageId, savedDraft);
    return createdId;
  };

  const handleDismissSuggestedReminder = async (
    messageId: string,
    draft: ChatSuggestedReminder
  ): Promise<void> => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedReminder: draft } : m
      )
    );

    if (userId && id) {
      await updateJournalChatSuggestedReminder(userId, id, messageId, draft);
    }
  };

  const handleSaveSuggestedVitals = async (
    messageId: string,
    draft: ChatSuggestedVitals
  ): Promise<void> => {
    if (!userId || !id) {
      throw new Error('User or profile not available');
    }

    const confirmedItems = (draft.items ?? []).filter(
      (item) => item.selected !== false && item.value.trim() !== ''
    );

    if (confirmedItems.length === 0) return;

    const currentList = [...mergedMeasurements];

    for (const item of confirmedItems) {
      const cleanVal = item.value.trim();
      const measuredDate =
        item.measuredAt || new Date().toISOString().slice(0, 10);
      const entryNote =
        item.notes ||
        (item.sourceReportTitle
          ? item.sourceReportTitle === 'Shared in Chat'
            ? 'Logged via MIRA Chat'
            : `Synced from ${item.sourceReportTitle}`
          : undefined);

      const matchIdx = currentList.findIndex(
        (m) =>
          m.id === item.id ||
          m.label.trim().toLowerCase() === item.label.trim().toLowerCase()
      );

      if (matchIdx >= 0) {
        const target = currentList[matchIdx];
        const existingHistory = normalizeMeasurementHistory(target);
        const sameDateIdx = existingHistory.findIndex(
          (h) => h.measuredAt === measuredDate
        );

        const nextHistory = [...existingHistory];
        const newEntry = {
          id: `${target.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          value: cleanVal,
          measuredAt: measuredDate,
          ...(entryNote ? { notes: entryNote } : {}),
        };

        if (sameDateIdx >= 0) {
          nextHistory[sameDateIdx] = {
            ...nextHistory[sameDateIdx],
            value: cleanVal,
            ...(entryNote ? { notes: entryNote } : {}),
          };
        } else {
          nextHistory.push(newEntry);
        }

        currentList[matchIdx] = recomputeMeasurementFromHistory(
          {
            ...target,
            unit: item.unit || target.unit,
            normalRange: item.normalRange || target.normalRange,
            category: item.category || target.category,
          },
          nextHistory
        );
      } else {
        const newVital: Measurement = recomputeMeasurementFromHistory(
          {
            id: item.id,
            label: item.label,
            category: item.category ?? 'custom',
            value: cleanVal,
            unit: item.unit,
            normalRange: item.normalRange,
            measuredAt: measuredDate,
            isCustom: true,
          },
          [
            {
              id: `${item.id}-${Date.now()}`,
              value: cleanVal,
              measuredAt: measuredDate,
              ...(entryNote ? { notes: entryNote } : {}),
            },
          ]
        );
        currentList.push(newVital);
      }
    }

    const toPersist = currentList.filter(
      (m) =>
        m.value.trim() !== '' ||
        (m.history && m.history.length > 0) ||
        m.isCustom
    );

    await updateMeasurements(userId, id, toPersist);

    const savedDraft: ChatSuggestedVitals = {
      ...draft,
      savedAt: draft.savedAt ?? new Date().toISOString(),
      dismissed: false,
    };

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedVitals: savedDraft } : m
      )
    );

    await updateJournalChatSuggestedVitals(userId, id, messageId, savedDraft);
  };

  const handleDismissSuggestedVitals = async (
    messageId: string,
    draft: ChatSuggestedVitals
  ): Promise<void> => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, suggestedVitals: draft } : m
      )
    );

    if (userId && id) {
      await updateJournalChatSuggestedVitals(userId, id, messageId, draft);
    }
  };

  async function sendPrompt(
    rawContent: string,
    isRetry = false,
    overrideAttachments?: ChatAttachmentInput[]
  ) {
    const content = rawContent.trim();
    const activeAttachments = overrideAttachments ?? attachments;
    if ((!content && activeAttachments.length === 0) || isSending) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const userMessageId = `user-${now}`;
    const attachmentMetas = activeAttachments.map(stripAttachmentBase64);

    const cleanHistory = messages.filter((m) => !m.isError);

    if (!isRetry) {
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        message: content,
        ...(attachmentMetas.length > 0 ? { attachments: attachmentMetas } : {}),
        timestamp: nowIso,
      };
      setMessages([...cleanHistory, userMessage]);
      setInput('');
      setAttachments([]);
    } else {
      setMessages(cleanHistory);
    }

    setIsSending(true);

    try {
      if (activeAttachments.length > 0 && !hasGoogleDriveToken()) {
        await ensureGoogleDriveToken(false).catch(() => undefined);
      }

      const uploadAttachmentsPromise = (async (): Promise<ChatAttachmentMeta[]> => {
        if (!userId || !id || activeAttachments.length === 0) {
          return attachmentMetas;
        }

        const uploadedMetas: ChatAttachmentMeta[] = [];
        for (const att of activeAttachments) {
          let driveUrl = att.url;
          if (!driveUrl && att.file) {
            try {
              driveUrl = await uploadChatAttachmentToGoogleDrive(
                userId,
                id,
                att.file
              );
            } catch {
              // Non-fatal: continue chat turn even if Drive popup is closed or skipped
            }
          }
          uploadedMetas.push(
            stripAttachmentBase64({
              ...att,
              ...(driveUrl ? { url: driveUrl } : {}),
            })
          );
        }
        return uploadedMetas;
      })();

      const apiKey =
        userId && id
          ? await getGeminiApiKey(userId, id).catch(() => undefined)
          : undefined;

      // Only pass historical message text to Gemini to avoid redundant attachment tokens
      const chatHistory: ConversationMessage[] = cleanHistory
        .filter((message) => Boolean(message.message?.trim()))
        .map((message) => ({
          id: String(message.id),
          role: message.role,
          content: message.message,
          timestamp: message.timestamp ?? nowIso,
          observationIds: [],
        }));

      const [result, finalizedAttachmentMetas] = await Promise.all([
        generateJournalChatReply(
          {
            message: content,
            attachments: activeAttachments,
            profile: profile ?? null,
            reports,
            appointments: appointments ?? [],
            measurements: mergedMeasurements,
            medications,
            reminders,
            recentDailyLogs,
            healthActivityInsight,
            history: chatHistory,
            knownState: knownExtraction,
          },
          apiKey ?? undefined
        ),
        uploadAttachmentsPromise,
      ]);

      const assistantTimestamp = new Date(Date.now() + 1).toISOString();
      const assistantMessageId = `assistant-${Date.now() + 1}`;
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        message: result.reply.answer,
        followUpQuestion: result.reply.followUpQuestion,
        suggestedAppointment: result.reply.suggestedAppointment,
        suggestedReminder: result.reply.suggestedReminder,
        suggestedVitals: result.reply.suggestedVitals,
        timestamp: assistantTimestamp,
      };

      setKnownExtraction(result.extracted);
      setMessages((prev) => {
        const updatedPrev = prev
          .filter((m) => !m.isError)
          .map((m) =>
            m.id === userMessageId && finalizedAttachmentMetas.length > 0
              ? { ...m, attachments: finalizedAttachmentMetas }
              : m
          );
        if (updatedPrev.some((m) => m.id === assistantMessageId)) {
          return updatedPrev;
        }
        return [...updatedPrev, assistantMessage];
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
              ...(finalizedAttachmentMetas.length > 0
                ? { attachments: finalizedAttachmentMetas }
                : {}),
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
          retryAttachments: activeAttachments,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  const displayedMessages = messages.length > 0 ? messages : [welcomeMessage];
  const selectableIds = useMemo(
    () =>
      displayedMessages
        .filter((m) => m.id !== 'welcome-1')
        .map((m) => m.id),
    [displayedMessages]
  );
  const selectedSet = useMemo(
    () => new Set(selectedMessageIds),
    [selectedMessageIds]
  );
  const isSelectionMode = selectedMessageIds.length > 0;
  const allSelectableSelected =
    selectableIds.length > 0 &&
    selectableIds.every((msgId) => selectedSet.has(msgId));

  const handleLongPressMessage = (messageId: string) => {
    if (messageId === 'welcome-1') return;
    setSelectedMessageIds((prev) =>
      prev.includes(messageId) ? prev : [...prev, messageId]
    );
  };

  const handleToggleSelectMessage = (messageId: string) => {
    if (messageId === 'welcome-1') return;
    setSelectedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((idItem) => idItem !== messageId)
        : [...prev, messageId]
    );
  };

  const handleClearSelection = () => {
    if (isDeletingMessages) return;
    setSelectedMessageIds([]);
    setIsDeleteConfirmOpen(false);
  };

  const handleToggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedMessageIds([]);
    } else {
      setSelectedMessageIds(selectableIds);
    }
  };

  const handleConfirmDeleteMessages = async () => {
    if (selectedMessageIds.length === 0 || isDeletingMessages) return;
    setIsDeletingMessages(true);
    const idsToDelete = [...selectedMessageIds];
    const deleteSet = new Set(idsToDelete);

    try {
      if (userId && id) {
        await deleteJournalChatMessages(userId, id, idsToDelete);
      }
      setMessages((prev) => prev.filter((m) => !deleteSet.has(m.id)));
      setChatRecords((prev) => prev.filter((r) => !deleteSet.has(String(r.id))));
      setSelectedMessageIds([]);
      setIsDeleteConfirmOpen(false);
    } finally {
      setIsDeletingMessages(false);
    }
  };

  return (
    <div className="space-y-4 pb-28">
      {/* Sticky Chat App Top Bar */}
      <div className="sticky top-0 z-20 -mx-4 -mt-6 border-b border-emerald-100/80 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md">
        {isSelectionMode ? (
          <div className="flex min-h-[48px] items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={handleClearSelection}
                aria-label="Cancel selection"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-95"
              >
                <X size={18} />
              </button>
              <span className="truncate text-sm font-bold text-gray-900">
                {selectedMessageIds.length} selected
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {selectableIds.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100"
                >
                  {allSelectableSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                aria-label={`Delete ${selectedMessageIds.length} selected ${
                  selectedMessageIds.length === 1 ? 'message' : 'messages'
                }`}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 active:scale-95"
              >
                <Trash2 size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-xs ring-2 ring-emerald-100">
                  <Bot size={20} />
                </div>
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
                  aria-hidden="true"
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="truncate text-sm font-bold tracking-wide text-gray-900">
                    MIRA
                  </h1>
                  <Sparkles
                    size={13}
                    className="shrink-0 text-emerald-600"
                    aria-hidden="true"
                  />
                </div>

                <p className="truncate text-[11px] font-medium text-gray-600">
                  <span className="font-semibold text-emerald-700">M</span>aternal{' '}
                  <span className="font-semibold text-emerald-700">I</span>ntelligence &{' '}
                  <span className="font-semibold text-emerald-700">R</span>ecord{' '}
                  <span className="font-semibold text-emerald-700">A</span>ssistant
                </p>

                <p className="mt-0.5 truncate text-[11px] text-gray-400">
                  Online • Share your day or ask anything
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMediaGalleryOpen(true)}
              title="Shared media & documents"
              aria-label="Open shared media and documents"
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#f2fbf5] to-[#e4f7eb] text-emerald-700 shadow-2xs ring-1 ring-emerald-200/80 transition hover:from-emerald-100/80 hover:to-emerald-100 active:scale-95"
            >
              <FolderOpen size={16} />
              {allChatAttachments.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[9px] font-bold text-white shadow-2xs ring-2 ring-white">
                  {allChatAttachments.length}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Google Drive Session / Media Preview Syncing Indicator */}
      {isDriveSyncing && (
        <div className="flex justify-center pt-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50/95 px-3.5 py-1.5 text-xs font-medium text-emerald-800 shadow-2xs ring-1 ring-emerald-200/80">
            <Loader2 size={13} className="animate-spin text-emerald-600" />
            <span>
              {isDriveRefreshing
                ? 'Refreshing Google Drive session…'
                : 'Loading media previews from Google Drive…'}
            </span>
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="space-y-4 pt-1">
        {displayedMessages.map((message) => (
          <ChatBubble
            key={message.id}
            role={message.role}
            message={message.message}
            attachments={message.attachments}
            onPreviewAttachment={(att) => {
              if (att.url && !getAttachmentPreviewUrl(att)) {
                void fetchDriveFilePreview(att.url, att.mimeType, true);
              }
              setPreviewAttachment(att);
            }}
            followUpQuestion={message.followUpQuestion}
            userInitial={userInitial}
            selectable={message.id !== 'welcome-1'}
            isSelectionMode={isSelectionMode}
            isSelected={selectedSet.has(message.id)}
            onLongPressSelect={() => handleLongPressMessage(message.id)}
            onToggleSelect={() => handleToggleSelectMessage(message.id)}
            suggestedAppointment={message.suggestedAppointment}
            onSaveAppointment={(draft) =>
              handleSaveSuggestedAppointment(message.id, draft)
            }
            onDismissAppointment={(draft) =>
              handleDismissSuggestedAppointment(message.id, draft)
            }
            suggestedReminder={message.suggestedReminder}
            onSaveReminder={(draft) =>
              handleSaveSuggestedReminder(message.id, draft)
            }
            onDismissReminder={(draft) =>
              handleDismissSuggestedReminder(message.id, draft)
            }
            suggestedVitals={message.suggestedVitals}
            currentMeasurements={mergedMeasurements}
            onSaveVitals={(draft) =>
              handleSaveSuggestedVitals(message.id, draft)
            }
            onDismissVitals={(draft) =>
              handleDismissSuggestedVitals(message.id, draft)
            }
            timestamp={message.timestamp}
            isError={message.isError}
            onRetry={
              message.isError &&
              (message.retryPrompt !== undefined ||
                (message.retryAttachments && message.retryAttachments.length > 0))
                ? () =>
                    sendPrompt(
                      message.retryPrompt ?? '',
                      true,
                      message.retryAttachments
                    )
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
            onClick={() => scrollToBottom('smooth')}
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
        attachments={attachments}
        onAttachmentsChange={setAttachments}
        onSend={() => sendPrompt(input)}
        disabled={!input.trim() && attachments.length === 0}
        isLoading={isSending}
      />

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-messages-modal-title"
          onClick={() => {
            if (!isDeletingMessages) setIsDeleteConfirmOpen(false);
          }}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl ring-1 ring-gray-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 ring-1 ring-red-100">
                <Trash2 size={18} />
              </div>
              <div>
                <h2
                  id="delete-messages-modal-title"
                  className="text-sm font-bold text-gray-900"
                >
                  Delete{' '}
                  {selectedMessageIds.length === 1
                    ? 'message'
                    : `${selectedMessageIds.length} messages`}
                  ?
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-gray-600">
              Are you sure you want to permanently remove{' '}
              {selectedMessageIds.length === 1
                ? 'this selected message'
                : `these ${selectedMessageIds.length} selected messages`}{' '}
              from your MIRA chat history?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeletingMessages}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="rounded-full px-4 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingMessages}
                onClick={handleConfirmDeleteMessages}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeletingMessages ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <ChatMediaGalleryModal
        isOpen={isMediaGalleryOpen}
        onClose={() => setIsMediaGalleryOpen(false)}
        attachments={allChatAttachments}
        onSelectAttachment={(att) => setPreviewAttachment(att)}
      />

      <ChatAttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}

export default ChatWindow;
