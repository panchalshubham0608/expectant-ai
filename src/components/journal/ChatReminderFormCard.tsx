import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BellPlus,
  CheckCircle2,
  Clock,
  Loader2,
  Plus,
  Repeat,
  Trash2,
  X,
} from 'lucide-react';
import type { ChatSuggestedReminder } from '../../services/ai/journalChatService';

interface ChatReminderFormCardProps {
  initialDraft: ChatSuggestedReminder;
  onSave: (draft: ChatSuggestedReminder) => Promise<string | void>;
  onDismiss?: (draft: ChatSuggestedReminder) => Promise<void> | void;
}

type ScheduleMode = 'times' | 'interval';

const formatTime12h = (time24: string): string => {
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours24)) return time24;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

const getInitialMode = (draft: ChatSuggestedReminder): ScheduleMode =>
  typeof draft.interval === 'number' && draft.interval > 0 ? 'interval' : 'times';

const inputClass =
  'mt-1 w-full rounded-xl border border-emerald-200/90 bg-white px-3 py-2 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:opacity-60';

function ChatReminderFormCard({
  initialDraft,
  onSave,
  onDismiss,
}: ChatReminderFormCardProps) {
  const fieldId = useId();
  const [title, setTitle] = useState(initialDraft.title || '');
  const [description, setDescription] = useState(initialDraft.description || '');
  const [mode, setMode] = useState<ScheduleMode>(() => getInitialMode(initialDraft));
  const [times, setTimes] = useState<string[]>(
    initialDraft.times && initialDraft.times.length > 0
      ? initialDraft.times
      : ['09:00']
  );
  const [interval, setIntervalValue] = useState<number>(
    initialDraft.interval && initialDraft.interval > 0 ? initialDraft.interval : 2
  );
  const [intervalUnit, setIntervalUnit] = useState<'hours' | 'minutes'>(
    initialDraft.intervalUnit === 'minutes' ? 'minutes' : 'hours'
  );
  const [startTime, setStartTime] = useState(initialDraft.startTime || '09:00');
  const [endTime, setEndTime] = useState(initialDraft.endTime || '21:00');

  const [savedId, setSavedId] = useState<string | undefined>(
    initialDraft.savedReminderId
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(
    Boolean(initialDraft.dismissed)
  );
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUserEdited) {
      if (initialDraft.title) {
        setTitle(initialDraft.title);
      }
      if (initialDraft.description) {
        setDescription(initialDraft.description);
      }
      if (typeof initialDraft.interval === 'number' && initialDraft.interval > 0) {
        setMode('interval');
        setIntervalValue(initialDraft.interval);
        setIntervalUnit(
          initialDraft.intervalUnit === 'minutes' ? 'minutes' : 'hours'
        );
        if (initialDraft.startTime) setStartTime(initialDraft.startTime);
        if (initialDraft.endTime) setEndTime(initialDraft.endTime);
      } else if (initialDraft.times && initialDraft.times.length > 0) {
        setMode('times');
        setTimes(initialDraft.times);
      }
    }
    if (initialDraft.savedReminderId) {
      setSavedId(initialDraft.savedReminderId);
    }
    if (typeof initialDraft.dismissed === 'boolean') {
      setIsDismissed(initialDraft.dismissed);
    }
  }, [
    hasUserEdited,
    initialDraft.title,
    initialDraft.description,
    initialDraft.times,
    initialDraft.interval,
    initialDraft.intervalUnit,
    initialDraft.startTime,
    initialDraft.endTime,
    initialDraft.savedReminderId,
    initialDraft.dismissed,
  ]);

  const isSaved = Boolean(savedId || initialDraft.savedReminderId);

  const buildCurrentDraft = (dismissedState: boolean): ChatSuggestedReminder => {
    const cleanTimes = times.map((t) => t.trim()).filter(Boolean);
    if (mode === 'interval') {
      return {
        title: title.trim() || initialDraft.title,
        description: description.trim() || initialDraft.description,
        frequency: 'daily',
        interval: Math.max(1, Number(interval) || 1),
        intervalUnit,
        startTime: startTime || '09:00',
        endTime: endTime || '21:00',
        dismissed: dismissedState,
      };
    }

    return {
      title: title.trim() || initialDraft.title,
      description: description.trim() || initialDraft.description,
      frequency: 'daily',
      times: cleanTimes.length > 0 ? cleanTimes : ['09:00'],
      dismissed: dismissedState,
    };
  };

  const handleDismiss = async () => {
    if (isSubmitting || isSaved) return;
    setIsDismissed(true);
    try {
      await onDismiss?.(buildCurrentDraft(true));
    } catch {
      // Non-fatal if persistence of dismissal fails
    }
  };

  const handleReopen = async () => {
    setIsDismissed(false);
    try {
      await onDismiss?.(buildCurrentDraft(false));
    } catch {
      // Non-fatal
    }
  };

  const handleAddTime = () => {
    setHasUserEdited(true);
    setTimes((prev) => [...prev, '21:00']);
  };

  const handleRemoveTime = (index: number) => {
    setHasUserEdited(true);
    setTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleTimeChange = (index: number, value: string) => {
    setHasUserEdited(true);
    setTimes((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSaved) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Please enter a title for the reminder.');
      return;
    }

    const cleanTimes = Array.from(
      new Set(times.map((t) => t.trim()).filter(Boolean))
    ).sort();

    if (mode === 'times' && cleanTimes.length === 0) {
      setErrorMessage('Please specify at least one reminder time.');
      return;
    }

    if (mode === 'interval' && (!interval || interval < 1 || !startTime || !endTime)) {
      setErrorMessage('Please provide a valid interval, start time, and end time.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updatedDraft: ChatSuggestedReminder =
        mode === 'interval'
          ? {
              title: trimmedTitle,
              description: description.trim() || undefined,
              frequency: 'daily',
              interval: Math.max(1, Math.round(Number(interval))),
              intervalUnit,
              startTime,
              endTime,
              dismissed: false,
            }
          : {
              title: trimmedTitle,
              description: description.trim() || undefined,
              frequency: 'daily',
              times: cleanTimes,
              dismissed: false,
            };

      const createdId = await onSave(updatedDraft);
      setSavedId(typeof createdId === 'string' && createdId ? createdId : 'saved');
    } catch {
      setErrorMessage('Could not save the reminder right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSaved) {
    const cleanTimes = times.map((t) => t.trim()).filter(Boolean);
    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/75 p-3.5 text-gray-800 shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span className="text-xs font-semibold">Reminder Set</span>
        </div>

        <div className="mt-2.5 rounded-xl bg-white/90 p-3 ring-1 ring-emerald-100">
          <p className="text-sm font-bold text-gray-900">{title.trim()}</p>
          {description.trim() && (
            <p className="mt-0.5 text-xs text-gray-600">{description.trim()}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            {mode === 'interval' ? (
              <span className="inline-flex items-center gap-1">
                <Repeat size={13} className="text-emerald-600" />
                Every {interval} {intervalUnit} ({formatTime12h(startTime)} –{' '}
                {formatTime12h(endTime)})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} className="text-emerald-600" />
                {cleanTimes.map(formatTime12h).join(', ')}
              </span>
            )}
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200/70">
              Daily
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (isDismissed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3 py-2 text-xs text-gray-500">
        <span>Reminder setup skipped for now.</span>
        <button
          type="button"
          onClick={handleReopen}
          className="font-semibold text-emerald-700 transition hover:text-emerald-800 hover:underline"
        >
          Set anyway
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border border-emerald-200/90 bg-[#f6fcf8] p-3.5 text-gray-800 shadow-2xs sm:p-4"
    >
      <div className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BellPlus size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Set Daily Reminder</h4>
            <p className="text-[11px] text-gray-500">
              Pre-filled from your chat & records — review or customize before saving.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          aria-label="Dismiss reminder form"
          className="rounded-full p-1 text-gray-400 transition hover:bg-emerald-100/60 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={15} />
        </button>
      </div>

      {errorMessage && (
        <div className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {errorMessage}
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-title`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Reminder Title <span className="text-red-500">*</span>
            </label>
            <input
              id={`${fieldId}-title`}
              type="text"
              required
              disabled={isSubmitting}
              value={title}
              onChange={(e) => {
                setHasUserEdited(true);
                setTitle(e.target.value);
              }}
              placeholder="e.g., Take Iron Tablet"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-description`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Notes / Dosage
            </label>
            <input
              id={`${fieldId}-description`}
              type="text"
              disabled={isSubmitting}
              value={description}
              onChange={(e) => {
                setHasUserEdited(true);
                setDescription(e.target.value);
              }}
              placeholder="e.g., 1 tablet after dinner"
              className={inputClass}
            />
          </div>
        </div>

        {/* Schedule Mode Toggle */}
        <div>
          <span className="block text-[11px] font-semibold text-gray-700">
            Schedule Type
          </span>
          <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-xl bg-emerald-100/60 p-1">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setHasUserEdited(true);
                setMode('times');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                mode === 'times'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Clock size={12} />
              <span>Specific Times</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                setHasUserEdited(true);
                setMode('interval');
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition ${
                mode === 'interval'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Repeat size={12} />
              <span>Repeat Interval</span>
            </button>
          </div>
        </div>

        {mode === 'times' ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] font-semibold text-gray-700">
                Time(s) of Day <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAddTime}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                <Plus size={12} />
                <span>Add time</span>
              </button>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {times.map((timeVal, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <input
                    type="time"
                    required
                    disabled={isSubmitting}
                    value={timeVal}
                    onChange={(e) => handleTimeChange(index, e.target.value)}
                    aria-label={`Reminder time ${index + 1}`}
                    className={`${inputClass} mt-0`}
                  />
                  {times.length > 1 && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleRemoveTime(index)}
                      aria-label={`Remove time ${index + 1}`}
                      className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor={`${fieldId}-interval`}
                  className="block text-[11px] font-semibold text-gray-700"
                >
                  Repeat Every <span className="text-red-500">*</span>
                </label>
                <input
                  id={`${fieldId}-interval`}
                  type="number"
                  min={1}
                  required
                  disabled={isSubmitting}
                  value={interval}
                  onChange={(e) => {
                    setHasUserEdited(true);
                    setIntervalValue(Math.max(1, Number(e.target.value) || 1));
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`${fieldId}-unit`}
                  className="block text-[11px] font-semibold text-gray-700"
                >
                  Unit
                </label>
                <select
                  id={`${fieldId}-unit`}
                  disabled={isSubmitting}
                  value={intervalUnit}
                  onChange={(e) => {
                    setHasUserEdited(true);
                    setIntervalUnit(
                      e.target.value === 'minutes' ? 'minutes' : 'hours'
                    );
                  }}
                  className={inputClass}
                >
                  <option value="hours">Hours</option>
                  <option value="minutes">Minutes</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label
                  htmlFor={`${fieldId}-start`}
                  className="block text-[11px] font-semibold text-gray-700"
                >
                  Start Time <span className="text-red-500">*</span>
                </label>
                <input
                  id={`${fieldId}-start`}
                  type="time"
                  required
                  disabled={isSubmitting}
                  value={startTime}
                  onChange={(e) => {
                    setHasUserEdited(true);
                    setStartTime(e.target.value);
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor={`${fieldId}-end`}
                  className="block text-[11px] font-semibold text-gray-700"
                >
                  End Time <span className="text-red-500">*</span>
                </label>
                <input
                  id={`${fieldId}-end`}
                  type="time"
                  required
                  disabled={isSubmitting}
                  value={endTime}
                  onChange={(e) => {
                    setHasUserEdited(true);
                    setEndTime(e.target.value);
                  }}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-emerald-100 pt-2.5">
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
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <BellPlus size={13} />
              <span>Save Reminder</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ChatReminderFormCard;
