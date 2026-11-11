import { useId, useState } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import {
  DAYS_OF_WEEK,
  getDayOfWeekCodeFromDate,
  type CustomIntervalUnit,
  type DayOfWeek,
  type Reminder,
  type ReminderFrequency,
} from '../../models/reminder';

interface ReminderFormDialogProps {
  initialValues?: Reminder;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (reminder: Partial<Reminder>) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-100';

const getTodayYmd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function ReminderFormDialog({
  initialValues,
  isSaving,
  onClose,
  onSubmit,
}: ReminderFormDialogProps) {
  const titleId = useId();

  const [title, setTitle] = useState(initialValues?.title || '');
  const [description, setDescription] = useState(initialValues?.description || '');
  const [frequency, setFrequency] = useState<ReminderFrequency>(
    initialValues?.frequency || 'daily'
  );

  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(
    initialValues?.daysOfWeek && initialValues.daysOfWeek.length > 0
      ? initialValues.daysOfWeek
      : [getDayOfWeekCodeFromDate()]
  );

  const [customInterval, setCustomInterval] = useState<number>(
    initialValues?.customInterval && initialValues.customInterval > 0
      ? initialValues.customInterval
      : 2
  );
  const [customIntervalUnit, setCustomIntervalUnit] = useState<CustomIntervalUnit>(
    initialValues?.customIntervalUnit || 'days'
  );

  const [startDate, setStartDate] = useState<string>(
    initialValues?.startDate ||
      (initialValues?.frequency === 'once' ? getTodayYmd() : '')
  );
  const [endDate, setEndDate] = useState<string>(initialValues?.endDate || '');

  const [timeMode, setTimeMode] = useState<'times' | 'interval'>(
    initialValues?.interval ? 'interval' : 'times'
  );

  const [times, setTimes] = useState<string[]>(
    initialValues?.times && initialValues.times.length > 0
      ? initialValues.times
      : ['08:00']
  );
  const [interval, setIntervalVal] = useState<number>(
    initialValues?.interval && initialValues.interval > 0 ? initialValues.interval : 2
  );
  const [intervalUnit, setIntervalUnit] = useState<'hours' | 'minutes'>(
    initialValues?.intervalUnit || 'hours'
  );
  const [startTime, setStartTime] = useState(initialValues?.startTime || '08:00');
  const [endTime, setEndTime] = useState(initialValues?.endTime || '20:00');

  const handleFrequencyChange = (nextFreq: ReminderFrequency) => {
    setFrequency(nextFreq);
    if (nextFreq === 'once' && !startDate) {
      setStartDate(getTodayYmd());
    }
    if (
      (nextFreq === 'weekly' ||
        (nextFreq === 'custom' && customIntervalUnit === 'weeks')) &&
      daysOfWeek.length === 0
    ) {
      setDaysOfWeek([getDayOfWeekCodeFromDate()]);
    }
  };

  const toggleDayOfWeek = (code: DayOfWeek) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev; // Keep at least one day selected
        return prev.filter((d) => d !== code);
      }
      return [...prev, code];
    });
  };

  const handleTimeChange = (index: number, val: string) => {
    const newTimes = [...times];
    newTimes[index] = val;
    setTimes(newTimes);
  };

  const addTime = () => setTimes([...times, '12:00']);
  const removeTime = (index: number) =>
    setTimes(times.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTimes = Array.from(
      new Set(times.map((t) => t.trim()).filter(Boolean))
    ).sort();

    const reminder: Partial<Reminder> = {
      title: title.trim(),
      description: description.trim() || undefined,
      frequency,
      isActive: initialValues?.isActive ?? true,
      times: undefined,
      interval: undefined,
      intervalUnit: undefined,
      startTime: undefined,
      endTime: undefined,
      daysOfWeek: undefined,
      customInterval: undefined,
      customIntervalUnit: undefined,
      startDate: undefined,
      endDate: undefined,
    };

    if (timeMode === 'times') {
      reminder.times = cleanTimes.length > 0 ? cleanTimes : ['08:00'];
    } else {
      reminder.interval = Math.max(1, Math.round(Number(interval) || 1));
      reminder.intervalUnit = intervalUnit;
      reminder.startTime = startTime || '08:00';
      reminder.endTime = endTime || '20:00';
    }

    if (frequency === 'once') {
      reminder.startDate = startDate || getTodayYmd();
    } else if (frequency === 'weekly') {
      reminder.daysOfWeek =
        daysOfWeek.length > 0 ? daysOfWeek : [getDayOfWeekCodeFromDate()];
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    } else if (frequency === 'custom') {
      reminder.customInterval = Math.max(1, Math.round(Number(customInterval) || 1));
      reminder.customIntervalUnit = customIntervalUnit;
      if (customIntervalUnit === 'weeks' && daysOfWeek.length > 0) {
        reminder.daysOfWeek = daysOfWeek;
      }
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    } else {
      // daily
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    }

    if (initialValues?.id) {
      reminder.id = initialValues.id;
    }

    onSubmit(reminder);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[84dvh] w-full max-w-md overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
              {initialValues ? 'Edit Reminder' : 'Add Reminder'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5 sm:p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Title
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hydration"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description (Optional)
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Drink a glass of water"
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Frequency
            </label>
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-gray-100/80 p-1">
              {(
                [
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'once', label: 'Once' },
                  { value: 'custom', label: 'Custom' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFrequencyChange(opt.value)}
                  className={`rounded-lg py-2 text-xs font-semibold transition-colors ${
                    frequency === opt.value
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frequency-specific options */}
          {frequency === 'once' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Date
              </label>
              <input
                type="date"
                required
                value={startDate || getTodayYmd()}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
          )}

          {frequency === 'custom' && (
            <div className="space-y-3 rounded-2xl bg-white p-3.5 ring-1 ring-gray-200/70">
              <label className="block text-xs font-semibold text-gray-700">
                Repeat Every
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  min={1}
                  required
                  value={customInterval}
                  onChange={(e) =>
                    setCustomInterval(Math.max(1, Number(e.target.value) || 1))
                  }
                  className={inputClass}
                />
                <select
                  value={customIntervalUnit}
                  onChange={(e) =>
                    setCustomIntervalUnit(e.target.value as CustomIntervalUnit)
                  }
                  className={inputClass}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </select>
              </div>
            </div>
          )}

          {(frequency === 'weekly' ||
            (frequency === 'custom' && customIntervalUnit === 'weeks')) && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600">
                Days of Week
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = daysOfWeek.includes(day.code);
                  return (
                    <button
                      key={day.code}
                      type="button"
                      onClick={() => toggleDayOfWeek(day.code)}
                      aria-pressed={isSelected}
                      className={`rounded-xl py-2 text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {day.shortLabel}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {frequency !== 'once' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Start Date (Optional)
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  End Date (Optional)
                </label>
                <input
                  type="date"
                  min={startDate || undefined}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <div className="mb-3 flex items-center gap-4 rounded-xl bg-gray-100/50 p-1">
              <button
                type="button"
                onClick={() => setTimeMode('times')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  timeMode === 'times'
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Specific Times
              </button>
              <button
                type="button"
                onClick={() => setTimeMode('interval')}
                className={`flex-1 rounded-lg py-1.5 text-sm font-medium transition-colors ${
                  timeMode === 'interval'
                    ? 'bg-white text-blue-600 shadow-sm ring-1 ring-gray-200/50'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Time Interval
              </button>
            </div>

            {timeMode === 'times' ? (
              <div className="space-y-3">
                {times.map((time, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={(e) => handleTimeChange(index, e.target.value)}
                      className={inputClass}
                    />
                    {times.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTime(index)}
                        className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addTime}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 transition-colors hover:text-blue-800"
                >
                  <Plus size={16} /> Add Time
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Every</span>
                  <input
                    type="number"
                    min="1"
                    required
                    value={interval}
                    onChange={(e) =>
                      setIntervalVal(Math.max(1, Number(e.target.value) || 1))
                    }
                    className={`${inputClass} w-20 text-center`}
                  />
                  <select
                    value={intervalUnit}
                    onChange={(e) =>
                      setIntervalUnit(e.target.value as 'hours' | 'minutes')
                    }
                    className={inputClass}
                  >
                    <option value="hours">Hours</option>
                    <option value="minutes">Minutes</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      From
                    </label>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">
                      Until
                    </label>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-70"
            >
              {isSaving && <Loader2 size={16} className="animate-spin" />}
              {initialValues ? 'Save Changes' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}