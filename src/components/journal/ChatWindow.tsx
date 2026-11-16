import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowDown,
  Bot,
  Check,
  Copy,
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
  type JournalChatTurnResult,
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
  retryUserMessageId?: string;
  retryUserTimestamp?: string;
}

interface ChatSessionState {
  isSending: boolean;
  pendingMessages: Message[];
  chatRecords: JournalChatRecord[];
  hasLoadedChats: boolean;
  messageOverrides: Map<string, Partial<Message>>;
  abortController: AbortController | null;
  activeRequestId: string | null;
  knownExtraction: JournalMessageExtraction;
  draftInput: string;
  draftAttachments: ChatAttachmentInput[];
  listeners: Set<() => void>;
}

const chatSessions = new Map<string, ChatSessionState>();

const getChatSessionKey = (userId?: string, profileId?: string): string =>
  `${userId ?? 'anon'}:${profileId ?? 'default'}`;

const getOrCreateChatSession = (sessionKey: string): ChatSessionState => {
  let session = chatSessions.get(sessionKey);
  if (!session) {
    session = {
      isSending: false,
      pendingMessages: [],
      chatRecords: [],
      hasLoadedChats: false,
      messageOverrides: new Map(),
      abortController: null,
      activeRequestId: null,
      knownExtraction: EMPTY_JOURNAL_EXTRACTION,
      draftInput: '',
      draftAttachments: [],
      listeners: new Set(),
    };
    chatSessions.set(sessionKey, session);
  }
  return session;
};

const notifyChatSession = (session: ChatSessionState): void => {
  session.listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Ignore listener errors
    }
  });
};

const setSessionDraftInput = (sessionKey: string, nextValue: string): void => {
  const target = getOrCreateChatSession(sessionKey);
  target.draftInput = nextValue;
  notifyChatSession(target);
};

const setSessionDraftAttachments = (
  sessionKey: string,
  nextAttachments: ChatAttachmentInput[]
): void => {
  const target = getOrCreateChatSession(sessionKey);
  target.draftAttachments = nextAttachments;
  notifyChatSession(target);
};

const updateSessionMessage = (
  sessionKey: string,
  messageId: string,
  patch: Partial<Message>
): void => {
  const target = getOrCreateChatSession(sessionKey);
  const existingOverride = target.messageOverrides.get(messageId) ?? {};
  target.messageOverrides.set(messageId, { ...existingOverride, ...patch });
  target.pendingMessages = target.pendingMessages.map((m) =>
    m.id === messageId ? { ...m, ...patch } : m
  );
  notifyChatSession(target);
};

const removeSessionMessages = (
  sessionKey: string,
  idsToDelete: string[]
): void => {
  const target = getOrCreateChatSession(sessionKey);
  const deleteSet = new Set(idsToDelete);
  target.pendingMessages = target.pendingMessages.filter(
    (m) => !deleteSet.has(m.id)
  );
  target.chatRecords = target.chatRecords.filter(
    (r) => !deleteSet.has(String(r.id))
  );
  idsToDelete.forEach((delId) => target.messageOverrides.delete(delId));
  notifyChatSession(target);
};

const createVitalHistoryEntryId = (
  baseId: string,
  includeRandomSuffix = false
): string => {
  const now = Date.now();
  if (!includeRandomSuffix) {
    return `${baseId}-${now}`;
  }
  return `${baseId}-${now}-${Math.random().toString(36).slice(2, 6)}`;
};

const createUserTurnIds = (
  existingUserMessageId?: string,
  existingUserTimestamp?: string
): {
  userMessageId: string;
  userTimestamp: string;
  requestId: string;
} => {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  return {
    userMessageId: existingUserMessageId ?? `user-${now}`,
    userTimestamp: existingUserTimestamp ?? nowIso,
    requestId: `req-${now}-${Math.random().toString(36).slice(2, 7)}`,
  };
};

const createAssistantTurnIds = (): {
  assistantMessageId: string;
  assistantTimestamp: string;
} => {
  const ts = Date.now() + 1;
  return {
    assistantMessageId: `assistant-${ts}`,
    assistantTimestamp: new Date(ts).toISOString(),
  };
};

const createErrorTurnId = (): string => `error-${Date.now()}`;

const isAbortError = (error: unknown, signal?: AbortSignal): boolean => {
  if (signal?.aborted) return true;
  if (!error) return false;
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    if (error.name === 'AbortError') return true;
  }
  const name = (error as { name?: string })?.name ?? '';
  const message = error instanceof Error ? error.message : String(error);
  return name === 'AbortError' || /\babort(?:ed)?\b/i.test(message);
};

const isTransientNetworkError = (error: unknown): boolean => {
  const lower = (
    error instanceof Error ? error.message : String(error ?? '')
  ).toLowerCase();
  return (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('load failed') ||
    lower.includes('connection')
  );
};

const waitForDocumentVisibleOrDelay = (
  signal: AbortSignal,
  timeoutMs = 15000
): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    const isHidden =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';

    if (!isHidden) {
      const timer = window.setTimeout(cleanupAndResolve, 600);
      function cleanupAndResolve() {
        window.clearTimeout(timer);
        signal.removeEventListener('abort', cleanupAndResolve);
        resolve();
      }
      signal.addEventListener('abort', cleanupAndResolve, { once: true });
      return;
    }

    const maxTimer = window.setTimeout(cleanup, timeoutMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        window.setTimeout(cleanup, 350);
      }
    };
    function cleanup() {
      window.clearTimeout(maxTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      signal.removeEventListener('abort', cleanup);
      resolve();
    }

    document.addEventListener('visibilitychange', onVisibilityChange);
    signal.addEventListener('abort', cleanup, { once: true });
  });

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

const formatMessageForCopy = (msg: Message): string => {
  const cleanBody = msg.message.replace(/\*\*([^*]+)\*\*/g, '$1').trim();
  const followUp =
    msg.role === 'assistant' &&
    !msg.isError &&
    msg.followUpQuestion &&
    msg.followUpQuestion.trim() &&
    !msg.message.includes(msg.followUpQuestion.trim())
      ? msg.followUpQuestion.trim()
      : '';
  const combinedText = [cleanBody, followUp].filter(Boolean).join('\n\n');
  if (combinedText) return combinedText;
  if (msg.attachments && msg.attachments.length > 0) {
    return msg.attachments.map((a) => a.name).join(', ');
  }
  return '';
};

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to execCommand below
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

function ChatWindow() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const sessionKey = getChatSessionKey(userId, id);
  const [sessionTick, setSessionTick] = useState(0);

  useEffect(() => {
    const currentSession = getOrCreateChatSession(sessionKey);
    const handleUpdate = () => {
      setSessionTick((t) => t + 1);
    };
    currentSession.listeners.add(handleUpdate);
    return () => {
      currentSession.listeners.delete(handleUpdate);
    };
  }, [sessionKey]);

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

  const [previewAttachment, setPreviewAttachment] =
    useState<ChatAttachmentMeta | null>(null);
  const [isMediaGalleryOpen, setIsMediaGalleryOpen] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingMessages, setIsDeletingMessages] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const copiedToastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copiedToastTimerRef.current !== null) {
        window.clearTimeout(copiedToastTimerRef.current);
      }
    };
  }, []);

  const sessionSnapshot = useMemo(
    () => {
      const s = getOrCreateChatSession(sessionKey);
      return {
        isSending: s.isSending,
        draftInput: s.draftInput,
        draftAttachments: s.draftAttachments,
        chatRecords: s.chatRecords,
        hasLoadedChats: s.hasLoadedChats,
        pendingMessages: s.pendingMessages,
        messageOverrides: new Map(s.messageOverrides),
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionKey, sessionTick]
  );

  const isSending = sessionSnapshot.isSending;
  const input = sessionSnapshot.draftInput;
  const attachments = sessionSnapshot.draftAttachments;
  const chatRecords = sessionSnapshot.chatRecords;
  const hasLoadedChats = sessionSnapshot.hasLoadedChats;
  const sessionPendingMessages = sessionSnapshot.pendingMessages;
  const sessionMessageOverrides = sessionSnapshot.messageOverrides;

  const setInput = (nextValue: string) => {
    setSessionDraftInput(sessionKey, nextValue);
  };

  const setAttachments = (nextAttachments: ChatAttachmentInput[]) => {
    setSessionDraftAttachments(sessionKey, nextAttachments);
  };

  const updateMessageInSession = (
    messageId: string,
    patch: Partial<Message>
  ) => {
    updateSessionMessage(sessionKey, messageId, patch);
  };

  useEffect(() => {
    if (!userId || !id) return;

    const currentSession = getOrCreateChatSession(getChatSessionKey(userId, id));

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
        currentSession.knownExtraction = {
          meals: todayLog.meals ?? [],
          hydration: todayLog.hydration ?? [],
          symptoms: todayLog.symptoms ?? [],
          activities: todayLog.activities ?? [],
          medications: todayLog.medications ?? [],
          mood: todayLog.mood,
          sleep: todayLog.sleep,
          notes: (todayLog.notes ?? []).map((n) => n.text),
          other: [],
        };
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

    const currentSession = getOrCreateChatSession(getChatSessionKey(userId, id));

    const unsubscribe = subscribeToJournalChats(userId, id, (records) => {
      currentSession.chatRecords = records;
      currentSession.hasLoadedChats = true;

      const recordIds = new Set(records.map((r) => String(r.id)));
      currentSession.pendingMessages = currentSession.pendingMessages.filter(
        (m) => m.isError || !recordIds.has(m.id)
      );

      notifyChatSession(currentSession);
    });

    return unsubscribe;
  }, [userId, id]);

  const messages = useMemo<Message[]>(() => {
    const filteredRecords = chatRecords.filter(
      (record) => record.role === 'user' || record.role === 'assistant'
    );

    const historyMessages: Message[] = filteredRecords.map((record, index) => {
      const prevUserRecord =
        record.role === 'assistant' &&
        index > 0 &&
        filteredRecords[index - 1]?.role === 'user'
          ? filteredRecords[index - 1]
          : undefined;

      const recordId = String(record.id);
      const override = sessionMessageOverrides.get(recordId);

      return {
        id: recordId,
        role: record.role as 'user' | 'assistant',
        message: record.content,
        attachments: override?.attachments ?? record.attachments,
        followUpQuestion:
          record.role === 'assistant' ? record.reply?.followUpQuestion : undefined,
        suggestedAppointment:
          override?.suggestedAppointment ??
          (record.role === 'assistant'
            ? normalizeSuggestedAppointment(
                record.reply?.suggestedAppointment,
                {
                  profile: profile ?? null,
                  appointments: appointments ?? [],
                  reports,
                },
                record.content
              )
            : undefined),
        suggestedReminder:
          override?.suggestedReminder ??
          (record.role === 'assistant'
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
            : undefined),
        suggestedVitals:
          override?.suggestedVitals ??
          (record.role === 'assistant'
            ? normalizeSuggestedVitals(
                record.reply?.suggestedVitals,
                {
                  message: prevUserRecord?.content,
                  reports,
                  measurements: mergedMeasurements,
                },
                record.content
              )
            : undefined),
        timestamp: record.timestamp,
      };
    });

    const historyIds = new Set(historyMessages.map((m) => m.id));
    const pending = sessionPendingMessages.filter((m) => !historyIds.has(m.id));
    return [...historyMessages, ...pending];
  }, [
    chatRecords,
    sessionPendingMessages,
    sessionMessageOverrides,
    profile,
    appointments,
    reports,
    medications,
    reminders,
    mergedMeasurements,
  ]);

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

  const welcomeMessage = useMemo<Message>(
    () => ({
      id: 'welcome-1',
      role: 'assistant',
      message: `${getTimeGreeting()}${firstName ? `, ${firstName}` : ''} 🌱 How are you feeling today? Feel free to share how your day is going or ask me anything.`,
    }),
    [firstName]
  );

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
    if (!hasLoadedChats && messages.length === 0) return;
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

    updateMessageInSession(messageId, { suggestedAppointment: savedDraft });

    await updateJournalChatSuggestedAppointment(userId, id, messageId, savedDraft);
    return createdId;
  };

  const handleDismissSuggestedAppointment = async (
    messageId: string,
    draft: ChatSuggestedAppointment
  ): Promise<void> => {
    updateMessageInSession(messageId, { suggestedAppointment: draft });

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

    updateMessageInSession(messageId, { suggestedReminder: savedDraft });

    await updateJournalChatSuggestedReminder(userId, id, messageId, savedDraft);
    return createdId;
  };

  const handleDismissSuggestedReminder = async (
    messageId: string,
    draft: ChatSuggestedReminder
  ): Promise<void> => {
    updateMessageInSession(messageId, { suggestedReminder: draft });

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
          id: createVitalHistoryEntryId(target.id, true),
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
              id: createVitalHistoryEntryId(item.id),
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

    updateMessageInSession(messageId, { suggestedVitals: savedDraft });

    await updateJournalChatSuggestedVitals(userId, id, messageId, savedDraft);
  };

  const handleDismissSuggestedVitals = async (
    messageId: string,
    draft: ChatSuggestedVitals
  ): Promise<void> => {
    updateMessageInSession(messageId, { suggestedVitals: draft });

    if (userId && id) {
      await updateJournalChatSuggestedVitals(userId, id, messageId, draft);
    }
  };

  const handleStopGenerating = () => {
    const activeSession = getOrCreateChatSession(sessionKey);
    if (!activeSession.isSending) return;
    const controller = activeSession.abortController;
    activeSession.isSending = false;
    activeSession.abortController = null;
    activeSession.activeRequestId = null;
    notifyChatSession(activeSession);
    controller?.abort();
  };

  async function sendPrompt(
    rawContent: string,
    isRetry = false,
    overrideAttachments?: ChatAttachmentInput[],
    existingUserMessageId?: string,
    existingUserTimestamp?: string
  ) {
    const activeSession = getOrCreateChatSession(sessionKey);
    const content = rawContent.trim();
    const activeAttachments =
      overrideAttachments ?? activeSession.draftAttachments;
    if (
      (!content && activeAttachments.length === 0) ||
      activeSession.isSending
    ) {
      return;
    }

    const { userMessageId, userTimestamp, requestId } = createUserTurnIds(
      existingUserMessageId,
      existingUserTimestamp
    );
    const attachmentMetas = activeAttachments.map(stripAttachmentBase64);

    const cleanHistory = messages.filter((m) => !m.isError);
    activeSession.pendingMessages = activeSession.pendingMessages.filter(
      (m) => !m.isError
    );

    if (!isRetry) {
      const userMessage: Message = {
        id: userMessageId,
        role: 'user',
        message: content,
        ...(attachmentMetas.length > 0 ? { attachments: attachmentMetas } : {}),
        timestamp: userTimestamp,
      };
      activeSession.pendingMessages = [
        ...activeSession.pendingMessages,
        userMessage,
      ];
      activeSession.draftInput = '';
      activeSession.draftAttachments = [];

      // Immediately persist the user message so switching tabs never loses it
      if (userId && id) {
        void saveJournalChatTurn(userId, id, {
          id: userMessageId,
          role: 'user',
          content,
          timestamp: userTimestamp,
          observationIds: [],
          ...(attachmentMetas.length > 0
            ? { attachments: attachmentMetas }
            : {}),
        }).catch(() => undefined);
      }
    }

    const abortController = new AbortController();
    activeSession.isSending = true;
    activeSession.abortController = abortController;
    activeSession.activeRequestId = requestId;
    notifyChatSession(activeSession);

    const isRequestStaleOrAborted = () =>
      abortController.signal.aborted ||
      activeSession.activeRequestId !== requestId;

    let didChangeVisibilityDuringRequest =
      typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const handleVisibilityChange = () => {
      didChangeVisibilityDuringRequest = true;
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    try {
      const uploadAttachmentsPromise = (async (): Promise<ChatAttachmentMeta[]> => {
        if (!userId || !id || activeAttachments.length === 0) {
          return attachmentMetas;
        }

        if (!hasGoogleDriveToken()) {
          await restoreGoogleDriveSession(userId).catch(() => null);
        }
        if (!hasGoogleDriveToken()) {
          await ensureGoogleDriveToken(false).catch(() => undefined);
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

        if (uploadedMetas.some((m) => Boolean(m.url))) {
          const existingOverride =
            activeSession.messageOverrides.get(userMessageId) ?? {};
          activeSession.messageOverrides.set(userMessageId, {
            ...existingOverride,
            attachments: uploadedMetas,
          });
          activeSession.pendingMessages = activeSession.pendingMessages.map(
            (m) =>
              m.id === userMessageId ? { ...m, attachments: uploadedMetas } : m
          );
          notifyChatSession(activeSession);

          void saveJournalChatTurn(userId, id, {
            id: userMessageId,
            role: 'user',
            content,
            timestamp: userTimestamp,
            observationIds: [],
            attachments: uploadedMetas,
          }).catch(() => undefined);
        }

        return uploadedMetas;
      })();

      const apiKey =
        userId && id
          ? await getGeminiApiKey(userId, id).catch(() => undefined)
          : undefined;

      if (isRequestStaleOrAborted()) return;

      // Only pass historical message text to Gemini to avoid redundant attachment tokens
      const chatHistory: ConversationMessage[] = cleanHistory
        .filter(
          (message) =>
            Boolean(message.message?.trim()) && message.id !== userMessageId
        )
        .map((message) => ({
          id: String(message.id),
          role: message.role,
          content: message.message,
          timestamp: message.timestamp ?? userTimestamp,
          observationIds: [],
        }));

      const contextPayload = {
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
        knownState: activeSession.knownExtraction,
      };

      const executeReplyGeneration = async (): Promise<JournalChatTurnResult> => {
        try {
          return await generateJournalChatReply(
            contextPayload,
            apiKey ?? undefined,
            abortController.signal
          );
        } catch (err) {
          if (isRequestStaleOrAborted() || isAbortError(err, abortController.signal)) {
            throw err;
          }
          const wasBackgrounded =
            didChangeVisibilityDuringRequest ||
            (typeof document !== 'undefined' &&
              document.visibilityState === 'hidden');
          if (wasBackgrounded && isTransientNetworkError(err)) {
            await waitForDocumentVisibleOrDelay(abortController.signal);
            if (isRequestStaleOrAborted()) {
              throw err;
            }
            return await generateJournalChatReply(
              contextPayload,
              apiKey ?? undefined,
              abortController.signal
            );
          }
          throw err;
        }
      };

      const result = await executeReplyGeneration();

      if (isRequestStaleOrAborted()) return;

      const { assistantMessageId, assistantTimestamp } =
        createAssistantTurnIds();
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

      activeSession.knownExtraction = result.extracted;
      activeSession.isSending = false;
      activeSession.abortController = null;
      activeSession.activeRequestId = null;

      if (
        !activeSession.pendingMessages.some((m) => m.id === assistantMessageId)
      ) {
        activeSession.pendingMessages = [
          ...activeSession.pendingMessages.filter((m) => !m.isError),
          assistantMessage,
        ];
      }
      notifyChatSession(activeSession);

      if (userId && id) {
        const finalizedAttachmentMetas = await uploadAttachmentsPromise.catch(
          () => attachmentMetas
        );

        await Promise.all([
          saveJournalChatTurn(
            userId,
            id,
            {
              id: userMessageId,
              role: 'user',
              content,
              timestamp: userTimestamp,
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
            date: userTimestamp,
            profile: profile ?? null,
          }),
        ]);
      }
    } catch (error) {
      if (
        isRequestStaleOrAborted() ||
        isAbortError(error, abortController.signal)
      ) {
        return;
      }

      const friendlyMessage = formatFriendlyError(error);
      activeSession.isSending = false;
      activeSession.abortController = null;
      activeSession.activeRequestId = null;
      activeSession.pendingMessages = [
        ...activeSession.pendingMessages.filter((m) => !m.isError),
        {
          id: createErrorTurnId(),
          role: 'assistant',
          message: friendlyMessage,
          timestamp: new Date().toISOString(),
          isError: true,
          retryPrompt: content,
          retryAttachments: activeAttachments,
          retryUserMessageId: userMessageId,
          retryUserTimestamp: userTimestamp,
        },
      ];
      notifyChatSession(activeSession);
    } finally {
      if (typeof document !== 'undefined') {
        document.removeEventListener(
          'visibilitychange',
          handleVisibilityChange
        );
      }
      if (activeSession.activeRequestId === requestId) {
        activeSession.isSending = false;
        activeSession.abortController = null;
        activeSession.activeRequestId = null;
        notifyChatSession(activeSession);
      }
    }
  }

  const displayedMessages = useMemo(
    () => (messages.length > 0 ? messages : [welcomeMessage]),
    [messages, welcomeMessage]
  );
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

  const handleCopySelectedMessages = async () => {
    if (selectedMessageIds.length === 0) return;
    const selectedMessages = displayedMessages.filter((m) =>
      selectedSet.has(m.id)
    );
    if (selectedMessages.length === 0) return;

    const textToCopy =
      selectedMessages.length === 1
        ? formatMessageForCopy(selectedMessages[0])
        : selectedMessages
            .map((msg) => {
              const formatted = formatMessageForCopy(msg);
              if (!formatted) return '';
              const sender = msg.role === 'user' ? 'You' : 'MIRA';
              return `${sender}:\n${formatted}`;
            })
            .filter(Boolean)
            .join('\n\n');

    const didCopy = await copyTextToClipboard(textToCopy);
    setSelectedMessageIds([]);
    setIsDeleteConfirmOpen(false);

    if (didCopy) {
      setShowCopiedToast(true);
      if (copiedToastTimerRef.current !== null) {
        window.clearTimeout(copiedToastTimerRef.current);
      }
      copiedToastTimerRef.current = window.setTimeout(() => {
        copiedToastTimerRef.current = null;
        setShowCopiedToast(false);
      }, 2000);
    }
  };

  const handleConfirmDeleteMessages = async () => {
    if (selectedMessageIds.length === 0 || isDeletingMessages) return;
    setIsDeletingMessages(true);
    const idsToDelete = [...selectedMessageIds];

    try {
      if (userId && id) {
        await deleteJournalChatMessages(userId, id, idsToDelete);
      }
      removeSessionMessages(sessionKey, idsToDelete);
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
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={handleClearSelection}
                aria-label="Cancel selection"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 active:scale-95"
              >
                <X size={18} />
              </button>
              <span className="truncate whitespace-nowrap text-sm font-bold text-gray-900">
                {selectedMessageIds.length} selected
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {selectableIds.length > 1 && (
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100"
                >
                  {allSelectableSelected ? 'Deselect all' : 'Select all'}
                </button>
              )}

              <button
                type="button"
                onClick={() => void handleCopySelectedMessages()}
                aria-label={`Copy ${selectedMessageIds.length} selected ${
                  selectedMessageIds.length === 1 ? 'message' : 'messages'
                }`}
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200/80 transition hover:bg-emerald-100 active:scale-95"
              >
                <Copy size={13} />
                <span>Copy</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDeleteConfirmOpen(true)}
                aria-label={`Delete ${selectedMessageIds.length} selected ${
                  selectedMessageIds.length === 1 ? 'message' : 'messages'
                }`}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 active:scale-95"
              >
                <Trash2 size={13} />
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

      {/* Copied to Clipboard Feedback Pill */}
      {showCopiedToast && (
        <div className="pointer-events-none fixed left-0 right-0 top-16 z-30 flex justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800/95 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md ring-1 ring-emerald-700/50 backdrop-blur-xs"
          >
            <Check size={13} className="text-emerald-300" />
            <span>Copied to clipboard</span>
          </div>
        </div>
      )}

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
                      message.retryAttachments,
                      message.retryUserMessageId,
                      message.retryUserTimestamp
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
        onStop={handleStopGenerating}
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
