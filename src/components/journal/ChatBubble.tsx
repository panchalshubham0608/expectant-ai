import {
  Activity,
  AlertCircle,
  ArrowRight,
  Baby,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Droplets,
  FileText,
  HeartPulse,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Scale,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Measurement, VitalCategory } from '../../models/measurement';
import type {
  ChatSuggestedAppointment,
  ChatSuggestedReminder,
  ChatSuggestedVitalItem,
  ChatSuggestedVitals,
} from '../../services/ai/journalChatService';
import ChatAppointmentFormCard from './ChatAppointmentFormCard';
import ChatReminderFormCard from './ChatReminderFormCard';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  message: string;
  followUpQuestion?: string;
  timestamp?: string;
  isError?: boolean;
  onRetry?: () => void;
  userInitial?: string;
  suggestedAppointment?: ChatSuggestedAppointment;
  onSaveAppointment?: (draft: ChatSuggestedAppointment) => Promise<string | void>;
  onDismissAppointment?: (draft: ChatSuggestedAppointment) => Promise<void> | void;
  suggestedReminder?: ChatSuggestedReminder;
  onSaveReminder?: (draft: ChatSuggestedReminder) => Promise<string | void>;
  onDismissReminder?: (draft: ChatSuggestedReminder) => Promise<void> | void;
  suggestedVitals?: ChatSuggestedVitals;
  currentMeasurements?: Measurement[];
  onSaveVitals?: (draft: ChatSuggestedVitals) => Promise<void>;
  onDismissVitals?: (draft: ChatSuggestedVitals) => Promise<void> | void;
}

const getVitalIcon = (id: string, label: string, size = 16) => {
  const cleanId = id.toLowerCase();
  const cleanLabel = label.toLowerCase();

  if (
    cleanId === 'baby-weight' ||
    cleanLabel.includes('baby') ||
    cleanLabel.includes('fetal weight')
  ) {
    return <Baby size={size} className="text-pink-600" />;
  }
  if (cleanId === 'maternal-weight' || cleanLabel.includes('weight')) {
    return <Scale size={size} className="text-purple-600" />;
  }
  if (cleanId === 'blood-pressure' || cleanLabel.includes('pressure')) {
    return <HeartPulse size={size} className="text-rose-600" />;
  }
  if (cleanId === 'fetal-heart-rate' || cleanLabel.includes('heart rate')) {
    return <Activity size={size} className="text-teal-600" />;
  }
  if (
    cleanId === 'blood-sugar' ||
    cleanId === 'hemoglobin' ||
    cleanLabel.includes('blood') ||
    cleanLabel.includes('hemoglobin') ||
    cleanLabel.includes('glucose')
  ) {
    return <Droplets size={size} className="text-amber-600" />;
  }
  return <Sparkles size={size} className="text-emerald-600" />;
};

const getCategoryBadgeStyle = (category?: VitalCategory) => {
  if (category === 'baby') {
    return {
      label: 'Baby',
      className: 'bg-pink-50 text-pink-700 ring-pink-200/60',
    };
  }
  if (category === 'custom') {
    return {
      label: 'Custom',
      className: 'bg-teal-50 text-teal-700 ring-teal-200/60',
    };
  }
  return {
    label: 'Maternal',
    className: 'bg-purple-50 text-purple-700 ring-purple-200/60',
  };
};

interface ChatVitalsConfirmCardProps {
  initialDraft: ChatSuggestedVitals;
  currentMeasurements?: Measurement[];
  onSave: (draft: ChatSuggestedVitals) => Promise<void>;
  onDismiss?: (draft: ChatSuggestedVitals) => Promise<void> | void;
}

function ChatVitalsConfirmCard({
  initialDraft,
  currentMeasurements = [],
  onSave,
  onDismiss,
}: ChatVitalsConfirmCardProps) {
  const [items, setItems] = useState<ChatSuggestedVitalItem[]>(() =>
    (initialDraft.items ?? []).map((item) => ({
      ...item,
      selected: item.selected ?? true,
    }))
  );
  const [savedAt, setSavedAt] = useState<string | undefined>(initialDraft.savedAt);
  const [isDismissed, setIsDismissed] = useState<boolean>(
    Boolean(initialDraft.dismissed)
  );
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUserEdited && Array.isArray(initialDraft.items)) {
      setItems(
        initialDraft.items.map((item) => ({
          ...item,
          selected: item.selected ?? true,
        }))
      );
    }
    if (initialDraft.savedAt) {
      setSavedAt(initialDraft.savedAt);
    }
    if (typeof initialDraft.dismissed === 'boolean') {
      setIsDismissed(initialDraft.dismissed);
    }
  }, [
    hasUserEdited,
    initialDraft.items,
    initialDraft.savedAt,
    initialDraft.dismissed,
  ]);

  const isSaved = Boolean(savedAt || initialDraft.savedAt);
  const selectedItems = items.filter(
    (item) => item.selected !== false && item.value.trim() !== ''
  );
  const allSelected =
    items.length > 0 && items.every((item) => item.selected !== false);

  const hasReportSource = items.some(
    (item) =>
      item.sourceReportTitle && item.sourceReportTitle !== 'Shared in Chat'
  );

  const findCurrentVital = (item: ChatSuggestedVitalItem): Measurement | undefined =>
    currentMeasurements.find(
      (m) =>
        m.id === item.id ||
        m.label?.trim().toLowerCase() === item.label.trim().toLowerCase()
    );

  const handleToggleItem = (index: number) => {
    if (isSubmitting || isSaved) return;
    setHasUserEdited(true);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: item.selected === false } : item
      )
    );
  };

  const handleToggleAll = () => {
    if (isSubmitting || isSaved) return;
    setHasUserEdited(true);
    const nextSelected = !allSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextSelected })));
  };

  const handleValueChange = (index: number, nextValue: string) => {
    setHasUserEdited(true);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, value: nextValue } : item))
    );
  };

  const handleDateChange = (index: number, nextDate: string) => {
    setHasUserEdited(true);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, measuredAt: nextDate } : item
      )
    );
  };

  const handleDismiss = async () => {
    if (isSubmitting || isSaved) return;
    setIsDismissed(true);
    try {
      await onDismiss?.({
        items,
        dismissed: true,
      });
    } catch {
      // Non-fatal
    }
  };

  const handleReopen = async () => {
    setIsDismissed(false);
    try {
      await onDismiss?.({
        items,
        dismissed: false,
      });
    } catch {
      // Non-fatal
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSaved) return;

    if (selectedItems.length === 0) {
      setErrorMessage('Please select at least one vital reading to update.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const nowIso = new Date().toISOString();
      const updatedDraft: ChatSuggestedVitals = {
        items,
        savedAt: nowIso,
        dismissed: false,
      };
      await onSave(updatedDraft);
      setSavedAt(nowIso);
    } catch {
      setErrorMessage('Could not update vitals right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSaved) {
    const confirmedList =
      selectedItems.length > 0 ? selectedItems : items.filter((i) => i.value.trim());
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/75 p-3.5 text-gray-800 shadow-2xs">
        <div className="flex items-center justify-between gap-2 text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
            <span className="text-xs font-semibold">
              Vitals Auto-Updated ({confirmedList.length})
            </span>
          </div>
          <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
            Synced to Health
          </span>
        </div>

        <div className="mt-2.5 space-y-2">
          {confirmedList.map((item) => (
            <div
              key={`${item.id}-${item.measuredAt}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/90 px-3 py-2 ring-1 ring-emerald-100"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-50 ring-1 ring-slate-100">
                  {getVitalIcon(item.id, item.label, 15)}
                </div>
                <span className="truncate text-xs font-bold text-gray-900">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-emerald-800">
                  {item.value}
                  {item.unit ? ` ${item.unit}` : ''}
                </span>
                {item.measuredAt && (
                  <span className="text-[10px] text-gray-400">
                    • {item.measuredAt}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isDismissed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3 py-2 text-xs text-gray-500">
        <span>Vital measurements update skipped for now.</span>
        <button
          type="button"
          onClick={handleReopen}
          className="shrink-0 font-semibold text-emerald-700 transition hover:text-emerald-800 hover:underline"
        >
          Review & update
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border border-emerald-200/90 bg-[#f6fcf8] p-3.5 text-gray-800 shadow-2xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-2.5">
        <div className="flex min-w-0 items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Activity size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-gray-900">
              Confirm & Auto-Update Vitals
            </h4>
            <p className="text-[11px] leading-snug text-gray-500">
              {hasReportSource
                ? 'Discovered from your medical reports — review or edit before syncing to Health.'
                : 'Detected from your chat update — review or edit before syncing to Health.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          aria-label="Dismiss vitals update card"
          className="shrink-0 rounded-full p-1 text-gray-400 transition hover:bg-emerald-100/60 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={15} />
        </button>
      </div>

      {errorMessage && (
        <div className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {errorMessage}
        </div>
      )}

      {/* Selection bar when multiple items */}
      {items.length > 1 && (
        <div className="mt-2.5 flex items-center justify-between px-0.5 text-[11px]">
          <span className="font-medium text-gray-600">
            {selectedItems.length} of {items.length} selected
          </span>
          <button
            type="button"
            onClick={handleToggleAll}
            disabled={isSubmitting}
            className="font-semibold text-emerald-700 transition hover:text-emerald-800 hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        </div>
      )}

      {/* Full-width stacked vital cards */}
      <div className="mt-2.5 space-y-2.5">
        {items.map((item, idx) => {
          const isSelected = item.selected !== false;
          const badge = getCategoryBadgeStyle(item.category);
          const existingVital = findCurrentVital(item);
          const previousVal = existingVital?.value?.trim();
          const isUnchanged =
            Boolean(previousVal) &&
            previousVal === item.value.trim() &&
            existingVital?.measuredAt === item.measuredAt;

          return (
            <div
              key={`${item.id}-${idx}`}
              className={`rounded-xl border p-3 transition ${
                isSelected
                  ? 'border-emerald-200/90 bg-white shadow-2xs'
                  : 'border-gray-200/70 bg-gray-50/70 opacity-65'
              }`}
            >
              {/* Top row: Checkbox + Icon + Label + Category Badge */}
              <div className="flex items-start justify-between gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleItem(idx)}
                  disabled={isSubmitting}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : 'border-gray-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-50/80 shadow-2xs ring-1 ring-slate-100">
                    {getVitalIcon(item.id, item.label, 16)}
                  </div>
                  <span className="min-w-0 flex-1 break-words text-xs font-bold text-gray-900">
                    {item.label}
                  </span>
                </button>

                <span
                  className={`mt-1 shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${badge.className}`}
                >
                  {badge.label}
                </span>
              </div>

              {/* Previous vs New comparison badge */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                {previousVal ? (
                  <>
                    <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-gray-600">
                      Current: {previousVal}
                      {existingVital?.unit ? ` ${existingVital.unit}` : ''}
                    </span>
                    <ArrowRight size={11} className="shrink-0 text-emerald-600" />
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-800 ring-1 ring-emerald-200/70">
                      New: {item.value || '—'}
                      {item.unit ? ` ${item.unit}` : ''}
                    </span>
                    {isUnchanged && (
                      <span className="text-[10px] text-gray-400">
                        (Already up to date)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                    First logged reading
                  </span>
                )}
              </div>

              {/* Editable Value + Date inputs */}
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      type="text"
                      disabled={isSubmitting || !isSelected}
                      value={item.value}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                      aria-label={`${item.label} value`}
                      placeholder="Value"
                      className="w-full rounded-lg border border-emerald-200/90 bg-white px-2.5 py-1.5 pr-12 text-xs font-semibold text-gray-800 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                    />
                    {item.unit && (
                      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">
                        {item.unit}
                      </span>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <input
                      type="date"
                      disabled={isSubmitting || !isSelected}
                      value={item.measuredAt}
                      onChange={(e) => handleDateChange(idx, e.target.value)}
                      aria-label={`${item.label} date`}
                      className="rounded-lg border border-emerald-200/90 bg-white px-2 py-1.5 text-[11px] text-gray-700 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50"
                    />
                  </div>
                </div>
              </div>

              {/* Footer metadata: Source report / Chat + Normal range */}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5 border-t border-gray-100 pt-1.5 text-[10px] text-gray-500">
                {item.sourceReportTitle ? (
                  <span className="inline-flex min-w-0 items-center gap-1 font-medium text-emerald-700">
                    {item.sourceReportTitle === 'Shared in Chat' ? (
                      <MessageSquareText size={11} className="shrink-0" />
                    ) : (
                      <FileText size={11} className="shrink-0" />
                    )}
                    <span className="truncate">{item.sourceReportTitle}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <Calendar size={11} className="shrink-0" />
                    <span>{item.measuredAt}</span>
                  </span>
                )}

                {item.normalRange && (
                  <span className="text-gray-400">
                    Ref: {item.normalRange}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 border-t border-emerald-100 pt-2.5">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          className="rounded-full px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-emerald-100/60 hover:text-gray-800 disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="submit"
          disabled={isSubmitting || selectedItems.length === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <CheckCircle2 size={13} />
              <span>
                Confirm & Update{' '}
                {selectedItems.length > 0 ? `(${selectedItems.length})` : ''}
              </span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

const renderInlineBold = (text: string): ReactNode[] => {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

const renderFormattedMessage = (content: string): ReactNode => {
  const lines = content.split('\n');
  const blocks: ReactNode[] = [];
  let currentList: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (currentList.length === 0) return;
    blocks.push(
      <ul key={`list-${keyPrefix}`} className="my-1.5 list-disc space-y-1 pl-4">
        {currentList.map((item, i) => (
          <li key={i} className="leading-relaxed">
            {renderInlineBold(item)}
          </li>
        ))}
      </ul>
    );
    currentList = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(String(index));
      return;
    }

    if (/^[-*•]\s+/.test(line)) {
      currentList.push(line.replace(/^[-*•]\s+/, ''));
    } else {
      flushList(String(index));
      blocks.push(
        <p key={`p-${index}`} className="leading-relaxed">
          {renderInlineBold(line)}
        </p>
      );
    }
  });

  flushList('end');

  return <div className="space-y-2">{blocks}</div>;
};

const formatTime = (iso?: string) => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

function ChatBubble({
  role,
  message,
  followUpQuestion,
  timestamp,
  isError = false,
  onRetry,
  userInitial,
  suggestedAppointment,
  onSaveAppointment,
  onDismissAppointment,
  suggestedReminder,
  onSaveReminder,
  onDismissReminder,
  suggestedVitals,
  currentMeasurements,
  onSaveVitals,
  onDismissVitals,
}: ChatBubbleProps) {
  const isUser = role === 'user';
  const timeLabel = formatTime(timestamp);
  const hasInteractiveCard = Boolean(
    suggestedAppointment ||
      suggestedReminder ||
      (suggestedVitals && suggestedVitals.items.length > 0)
  );
  const showFollowUp =
    !isUser &&
    !isError &&
    followUpQuestion &&
    followUpQuestion.trim() &&
    !message.includes(followUpQuestion.trim());

  return (
    <div className={`flex items-end gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-xs ${
            isError
              ? 'bg-red-100 text-red-600'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {isError ? <AlertCircle size={16} /> : <Bot size={17} />}
        </div>
      )}

      <div
        className={`${
          !isUser && hasInteractiveCard
            ? 'w-full max-w-[90%] sm:max-w-xl'
            : 'max-w-[80%]'
        } rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'rounded-br-sm bg-emerald-700 text-white shadow-xs'
            : isError
              ? 'rounded-bl-sm bg-red-50 text-red-800 ring-1 ring-red-200/80'
              : 'rounded-bl-sm bg-white text-gray-800 shadow-xs ring-1 ring-gray-100'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message}</p>
        ) : (
          renderFormattedMessage(message)
        )}

        {!isUser && !isError && suggestedAppointment && onSaveAppointment && (
          <ChatAppointmentFormCard
            initialDraft={suggestedAppointment}
            onSave={onSaveAppointment}
            onDismiss={onDismissAppointment}
          />
        )}

        {!isUser && !isError && suggestedReminder && onSaveReminder && (
          <ChatReminderFormCard
            initialDraft={suggestedReminder}
            onSave={onSaveReminder}
            onDismiss={onDismissReminder}
          />
        )}

        {!isUser &&
          !isError &&
          suggestedVitals &&
          suggestedVitals.items.length > 0 &&
          onSaveVitals && (
            <ChatVitalsConfirmCard
              initialDraft={suggestedVitals}
              currentMeasurements={currentMeasurements}
              onSave={onSaveVitals}
              onDismiss={onDismissVitals}
            />
          )}

        {showFollowUp && (
          <div className="mt-2.5 flex items-start gap-1.5 border-t border-emerald-100 pt-2 text-xs font-medium text-emerald-800">
            <Sparkles size={13} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>{followUpQuestion}</span>
          </div>
        )}

        {isError && onRetry && (
          <div className="mt-2.5 border-t border-red-200/70 pt-2">
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-red-700 shadow-2xs ring-1 ring-red-200 transition hover:bg-red-100/60"
            >
              <RotateCcw size={12} />
              <span>Try again</span>
            </button>
          </div>
        )}

        {timeLabel && (
          <div
            className={`mt-1 text-right text-[10px] ${
              isUser
                ? 'text-emerald-100/80'
                : isError
                  ? 'text-red-400'
                  : 'text-gray-400'
            }`}
          >
            {timeLabel}
          </div>
        )}
      </div>

      {isUser && (
        <div
          className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 shadow-2xs ring-1 ring-emerald-200/80"
          aria-label="Expectant profile"
        >
          {userInitial ? userInitial : <User size={16} />}
        </div>
      )}
    </div>
  );
}

export default ChatBubble;
