import { useId, useMemo, useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Loader2,
  Bell,
  Clock,
  Calendar,
  Repeat,
  ChevronDown,
  ChevronUp,
  Minus,
} from 'lucide-react';
import {
  DAYS_OF_WEEK,
  getDayOfWeekCodeFromDate,
  getReminderDateRangeSummary,
  getReminderFrequencyBadgeLabel,
  getReminderTimeSummary,
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
  'w-full rounded-xl border border-slate-200/80 bg-slate-50/70 px-3.5 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-3 focus:ring-blue-100';

const getTodayYmd = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getOffsetDateYmd = (daysOffset: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
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
  const [description, setDescription] = useState(
    initialValues?.description || ''
  );
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
  const [customIntervalUnit, setCustomIntervalUnit] =
    useState<CustomIntervalUnit>(initialValues?.customIntervalUnit || 'days');

  const [startDate, setStartDate] = useState<string>(
    initialValues?.startDate ||
      (initialValues?.frequency === 'once' ? getTodayYmd() : '')
  );
  const [endDate, setEndDate] = useState<string>(initialValues?.endDate || '');
  const [showDateRange, setShowDateRange] = useState<boolean>(
    Boolean(
      initialValues?.frequency !== 'once' &&
        (initialValues?.startDate || initialValues?.endDate)
    )
  );

  const [timeMode, setTimeMode] = useState<'times' | 'interval'>(
    initialValues?.interval ? 'interval' : 'times'
  );

  const [times, setTimes] = useState<string[]>(
    initialValues?.times && initialValues.times.length > 0
      ? initialValues.times
      : ['08:00']
  );
  const [interval, setIntervalVal] = useState<number>(
    initialValues?.interval && initialValues.interval > 0
      ? initialValues.interval
      : 2
  );
  const [intervalUnit, setIntervalUnit] = useState<'hours' | 'minutes'>(
    initialValues?.intervalUnit || 'hours'
  );
  const [startTime, setStartTime] = useState(
    initialValues?.startTime || '09:00'
  );
  const [endTime, setEndTime] = useState(initialValues?.endTime || '21:00');

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
        if (prev.length <= 1) return prev;
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

  const addTime = () => {
    const candidates = ['08:00', '12:00', '16:00', '20:00', '22:00'];
    const nextTime = candidates.find((c) => !times.includes(c)) ?? '12:00';
    setTimes([...times, nextTime]);
  };

  const removeTime = (index: number) =>
    setTimes(times.filter((_, i) => i !== index));

  const previewReminder = useMemo<Partial<Reminder>>(() => {
    const cleanTimes = Array.from(
      new Set(times.map((t) => t.trim()).filter(Boolean))
    ).sort();

    return {
      title: title.trim() || 'Reminder',
      frequency,
      ...(timeMode === 'times'
        ? { times: cleanTimes.length > 0 ? cleanTimes : ['08:00'] }
        : {
            interval: Math.max(1, Math.round(Number(interval) || 1)),
            intervalUnit,
            startTime: startTime || '09:00',
            endTime: endTime || '21:00',
          }),
      ...(frequency === 'weekly' ||
      (frequency === 'custom' && customIntervalUnit === 'weeks')
        ? { daysOfWeek }
        : {}),
      ...(frequency === 'custom'
        ? {
            customInterval: Math.max(
              1,
              Math.round(Number(customInterval) || 1)
            ),
            customIntervalUnit,
          }
        : {}),
      ...(frequency === 'once'
        ? { startDate: startDate || getTodayYmd() }
        : {
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
          }),
    };
  }, [
    title,
    frequency,
    timeMode,
    times,
    interval,
    intervalUnit,
    startTime,
    endTime,
    daysOfWeek,
    customInterval,
    customIntervalUnit,
    startDate,
    endDate,
  ]);

  const frequencySummary = getReminderFrequencyBadgeLabel(previewReminder);
  const timeSummary = getReminderTimeSummary(previewReminder);
  const dateRangeSummary = getReminderDateRangeSummary(previewReminder);

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
      reminder.startTime = startTime || '09:00';
      reminder.endTime = endTime || '21:00';
    }

    if (frequency === 'once') {
      reminder.startDate = startDate || getTodayYmd();
    } else if (frequency === 'weekly') {
      reminder.daysOfWeek =
        daysOfWeek.length > 0 ? daysOfWeek : [getDayOfWeekCodeFromDate()];
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    } else if (frequency === 'custom') {
      reminder.customInterval = Math.max(
        1,
        Math.round(Number(customInterval) || 1)
      );
      reminder.customIntervalUnit = customIntervalUnit;
      if (customIntervalUnit === 'weeks' && daysOfWeek.length > 0) {
        reminder.daysOfWeek = daysOfWeek;
      }
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    } else {
      if (startDate) reminder.startDate = startDate;
      if (endDate) reminder.endDate = endDate;
    }

    if (initialValues?.id) {
      reminder.id = initialValues.id;
    }

    onSubmit(reminder);
  };

  const todayYmd = getTodayYmd();
  const tomorrowYmd = getOffsetDateYmd(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-[#faf9f6] shadow-2xl ring-1 ring-slate-900/5">
        {/* Compact Header */}
        <div className="flex items-center justify-between border-b border-slate-200/70 bg-[#faf9f6]/95 px-5 py-3.5 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-2xs">
              <Bell size={15} />
            </div>
            <h2
              id={titleId}
              className="text-base font-bold tracking-tight text-slate-900"
            >
              {initialValues ? 'Edit Reminder' : 'New Reminder'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <div className="space-y-3 p-4 sm:p-5">
            {/* Card 1: Title & Description */}
            <div className="space-y-2.5 rounded-2xl bg-white p-3.5 shadow-2xs ring-1 ring-slate-200/70">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Title
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weekly Weight Log, Take Iron Tablet"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Description{' '}
                  <span className="font-normal text-slate-400">(Optional)</span>
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Weigh yourself in the morning before breakfast"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Card 2: Frequency & Recurrence */}
            <div className="space-y-3 rounded-2xl bg-white p-3.5 shadow-2xs ring-1 ring-slate-200/70">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Repeat size={13} className="text-blue-600" />
                <span>Frequency</span>
              </div>

              <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100/90 p-1">
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
                    className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                      frequency === opt.value
                        ? 'bg-white text-blue-600 shadow-2xs ring-1 ring-slate-200/60'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {frequency === 'once' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500">
                      Date
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setStartDate(todayYmd)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                          (startDate || todayYmd) === todayYmd
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartDate(tomorrowYmd)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition ${
                          startDate === tomorrowYmd
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                        }`}
                      >
                        Tomorrow
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    required
                    value={startDate || todayYmd}
                    onChange={(e) => setStartDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}

              {frequency === 'custom' && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 ring-1 ring-slate-200/60">
                  <span className="pl-1 text-xs font-medium text-slate-600">
                    Every
                  </span>
                  <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        setCustomInterval((prev) => Math.max(1, prev - 1))
                      }
                      className="p-1.5 text-slate-500 transition hover:text-blue-600"
                      aria-label="Decrease interval"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      required
                      value={customInterval}
                      onChange={(e) =>
                        setCustomInterval(
                          Math.max(1, Number(e.target.value) || 1)
                        )
                      }
                      className="w-10 border-0 bg-transparent text-center text-xs font-bold text-slate-900 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomInterval((prev) => prev + 1)}
                      className="p-1.5 text-slate-500 transition hover:text-blue-600"
                      aria-label="Increase interval"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="grid flex-1 grid-cols-3 gap-1 rounded-lg bg-slate-200/60 p-0.5">
                    {(
                      [
                        { value: 'days', label: 'Days' },
                        { value: 'weeks', label: 'Weeks' },
                        { value: 'months', label: 'Months' },
                      ] as const
                    ).map((u) => (
                      <button
                        key={u.value}
                        type="button"
                        onClick={() => setCustomIntervalUnit(u.value)}
                        className={`rounded-md py-1 text-[11px] font-semibold transition ${
                          customIntervalUnit === u.value
                            ? 'bg-white text-blue-600 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(frequency === 'weekly' ||
                (frequency === 'custom' && customIntervalUnit === 'weeks')) && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-500">
                      Repeat On
                    </label>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setDaysOfWeek(['MO', 'TU', 'WE', 'TH', 'FR'])
                        }
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        Weekdays
                      </button>
                      <button
                        type="button"
                        onClick={() => setDaysOfWeek(['SA', 'SU'])}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                      >
                        Weekends
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-1">
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
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/80 hover:bg-slate-100'
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
                <div className="border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDateRange((prev) => !prev)}
                    className="flex w-full items-center justify-between text-left text-xs font-medium text-slate-500 transition hover:text-blue-600"
                  >
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-blue-500" />
                      <span>
                        {startDate || endDate
                          ? dateRangeSummary || 'Custom date range'
                          : 'Set start or end date (optional)'}
                      </span>
                    </span>
                    {showDateRange ? (
                      <ChevronUp size={14} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={14} className="text-slate-400" />
                    )}
                  </button>

                  {showDateRange && (
                    <div className="mt-2 grid grid-cols-2 gap-2.5">
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-500">
                            Start Date
                          </label>
                          {startDate && (
                            <button
                              type="button"
                              onClick={() => setStartDate('')}
                              className="text-[10px] font-medium text-blue-600 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[11px] font-medium text-slate-500">
                            End Date
                          </label>
                          {endDate && (
                            <button
                              type="button"
                              onClick={() => setEndDate('')}
                              className="text-[10px] font-medium text-blue-600 hover:underline"
                            >
                              Clear
                            </button>
                          )}
                        </div>
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
                </div>
              )}
            </div>

            {/* Card 3: Time of Day */}
            <div className="space-y-3 rounded-2xl bg-white p-3.5 shadow-2xs ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                  <Clock size={13} className="text-blue-600" />
                  <span>Time</span>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100/90 p-1">
                <button
                  type="button"
                  onClick={() => setTimeMode('times')}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                    timeMode === 'times'
                      ? 'bg-white text-blue-600 shadow-2xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Specific Times
                </button>
                <button
                  type="button"
                  onClick={() => setTimeMode('interval')}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition-all ${
                    timeMode === 'interval'
                      ? 'bg-white text-blue-600 shadow-2xs ring-1 ring-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Time Interval
                </button>
              </div>

              {timeMode === 'times' ? (
                <div className="grid grid-cols-2 gap-2">
                  {times.map((time, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-3 focus-within:ring-blue-100"
                    >
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) =>
                          handleTimeChange(index, e.target.value)
                        }
                        className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                      />
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTime(index)}
                          className="rounded-md p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove time"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addTime}
                    className="flex items-center justify-center gap-1 rounded-xl border border-dashed border-blue-300 bg-blue-50/40 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                  >
                    <Plus size={14} />
                    <span>Add Time</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50/80 p-2 ring-1 ring-slate-200/60">
                    <span className="pl-1 text-xs font-medium text-slate-600">
                      Every
                    </span>
                    <div className="flex items-center rounded-lg bg-white ring-1 ring-slate-200">
                      <button
                        type="button"
                        onClick={() =>
                          setIntervalVal((prev) => Math.max(1, prev - 1))
                        }
                        className="p-1.5 text-slate-500 transition hover:text-blue-600"
                        aria-label="Decrease time interval"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        required
                        value={interval}
                        onChange={(e) =>
                          setIntervalVal(
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-10 border-0 bg-transparent text-center text-xs font-bold text-slate-900 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIntervalVal((prev) => prev + 1)}
                        className="p-1.5 text-slate-500 transition hover:text-blue-600"
                        aria-label="Increase time interval"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                    <select
                      value={intervalUnit}
                      onChange={(e) =>
                        setIntervalUnit(e.target.value as 'hours' | 'minutes')
                      }
                      className={`${inputClass} flex-1 bg-white py-1.5`}
                    >
                      <option value="hours">Hours</option>
                      <option value="minutes">Minutes</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
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
                      <label className="mb-1 block text-[11px] font-medium text-slate-500">
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
          </div>

          {/* Compact Sticky Footer */}
          <div className="sticky bottom-0 z-10 border-t border-slate-200/80 bg-[#faf9f6]/95 px-4 py-3 backdrop-blur sm:px-5">
            <div className="mb-2.5 flex items-start gap-2 rounded-xl bg-blue-50/90 px-3 py-2 text-xs leading-relaxed text-blue-900 ring-1 ring-blue-200/70">
              <Bell size={13} className="mt-0.5 shrink-0 text-blue-600" />
              <div className="min-w-0 flex-1 break-words">
                <span className="font-semibold">{frequencySummary}</span>
                {timeSummary && (
                  <span className="text-blue-700"> · {timeSummary}</span>
                )}
                {dateRangeSummary && (
                  <span className="text-blue-600/90">
                    {' '}
                    · {dateRangeSummary}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-200/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-70"
              >
                {isSaving && <Loader2 size={15} className="animate-spin" />}
                {initialValues ? 'Save Changes' : 'Add Reminder'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}