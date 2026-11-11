export type ReminderFrequency = 'daily' | 'weekly' | 'custom' | 'once';

export type DayOfWeek = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';

export type CustomIntervalUnit = 'days' | 'weeks' | 'months';

export const DAYS_OF_WEEK: Array<{
  code: DayOfWeek;
  shortLabel: string;
  compactLabel: string;
  fullLabel: string;
  jsDay: number;
}> = [
  { code: 'MO', shortLabel: 'Mon', compactLabel: 'M', fullLabel: 'Monday', jsDay: 1 },
  { code: 'TU', shortLabel: 'Tue', compactLabel: 'T', fullLabel: 'Tuesday', jsDay: 2 },
  { code: 'WE', shortLabel: 'Wed', compactLabel: 'W', fullLabel: 'Wednesday', jsDay: 3 },
  { code: 'TH', shortLabel: 'Thu', compactLabel: 'T', fullLabel: 'Thursday', jsDay: 4 },
  { code: 'FR', shortLabel: 'Fri', compactLabel: 'F', fullLabel: 'Friday', jsDay: 5 },
  { code: 'SA', shortLabel: 'Sat', compactLabel: 'S', fullLabel: 'Saturday', jsDay: 6 },
  { code: 'SU', shortLabel: 'Sun', compactLabel: 'S', fullLabel: 'Sunday', jsDay: 0 },
];

export interface Reminder {
  id: string;
  title: string;
  description?: string;

  frequency: ReminderFrequency;

  // For specific times, e.g., ["10:00", "21:00"]
  times?: string[];

  // For intraday intervals, e.g., every 2 hours or 30 minutes
  interval?: number;
  intervalUnit?: 'hours' | 'minutes';

  // Time boundaries for intraday intervals, e.g., 07:00 to 21:00
  startTime?: string;
  endTime?: string;

  // For weekly (or custom weekly) reminders, e.g., ['MO', 'WE', 'FR']
  daysOfWeek?: DayOfWeek[];

  // For custom recurrence frequency, e.g., every 3 days / 2 weeks / 1 month
  customInterval?: number;
  customIntervalUnit?: CustomIntervalUnit;

  // For 'once' (target date, YYYY-MM-DD) or date boundaries for recurring reminders
  startDate?: string;
  endDate?: string;

  isActive: boolean;

  // Store synced Google Calendar Event IDs
  googleCalendarEventIds?: string[];
}

export const getDayOfWeekCodeFromDate = (date: Date = new Date()): DayOfWeek => {
  const jsDay = date.getDay();
  return DAYS_OF_WEEK.find((d) => d.jsDay === jsDay)?.code ?? 'MO';
};

export const formatReminderTime12h = (time24?: string): string => {
  if (!time24) return '';
  const match = time24.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time24;
  const hours24 = Number(match[1]);
  const minutes = match[2];
  if (Number.isNaN(hours24)) return time24;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
};

export const formatReminderShortDate = (dateYmd?: string): string => {
  if (!dateYmd) return '';
  const match = dateYmd.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  const parsed = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(dateYmd);
  if (Number.isNaN(parsed.getTime())) return dateYmd;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
};

export const formatDaysOfWeekSummary = (days?: DayOfWeek[]): string => {
  if (!days || days.length === 0) return '';
  const orderMap = new Map(DAYS_OF_WEEK.map((d, idx) => [d.code, idx]));
  const sorted = Array.from(new Set(days)).sort(
    (a, b) => (orderMap.get(a) ?? 0) - (orderMap.get(b) ?? 0)
  );
  if (sorted.length === 7) return 'Every day';
  if (
    sorted.length === 5 &&
    ['MO', 'TU', 'WE', 'TH', 'FR'].every((d) => sorted.includes(d as DayOfWeek))
  ) {
    return 'Weekdays';
  }
  if (
    sorted.length === 2 &&
    sorted.includes('SA') &&
    sorted.includes('SU')
  ) {
    return 'Weekends';
  }
  return sorted
    .map((code) => DAYS_OF_WEEK.find((d) => d.code === code)?.shortLabel ?? code)
    .join(', ');
};

export const getReminderFrequencyBadgeLabel = (
  reminder: Partial<
    Pick<
      Reminder,
      | 'frequency'
      | 'daysOfWeek'
      | 'customInterval'
      | 'customIntervalUnit'
      | 'startDate'
    >
  >
): string => {
  const freq = reminder.frequency ?? 'daily';
  if (freq === 'once') {
    return reminder.startDate
      ? `Once • ${formatReminderShortDate(reminder.startDate)}`
      : 'Once';
  }
  if (freq === 'weekly') {
    const daysText = formatDaysOfWeekSummary(reminder.daysOfWeek);
    return daysText ? `Weekly • ${daysText}` : 'Weekly';
  }
  if (freq === 'custom') {
    const count = Math.max(1, reminder.customInterval ?? 1);
    const unit = reminder.customIntervalUnit ?? 'days';
    const singularUnit = unit.endsWith('s') ? unit.slice(0, -1) : unit;
    const base = count === 1 ? `Every ${singularUnit}` : `Every ${count} ${unit}`;
    if (unit === 'weeks' && reminder.daysOfWeek && reminder.daysOfWeek.length > 0) {
      return `${base} (${formatDaysOfWeekSummary(reminder.daysOfWeek)})`;
    }
    return base;
  }
  return 'Daily';
};

export const getReminderTimeSummary = (
  reminder: Partial<
    Pick<Reminder, 'times' | 'interval' | 'intervalUnit' | 'startTime' | 'endTime'>
  >
): string => {
  if (reminder.interval && reminder.interval > 0) {
    const unit = reminder.intervalUnit ?? 'hours';
    const unitLabel =
      reminder.interval === 1 ? unit.slice(0, -1) : unit;
    const from = formatReminderTime12h(reminder.startTime || '08:00');
    const until = formatReminderTime12h(reminder.endTime || '20:00');
    return `Every ${reminder.interval} ${unitLabel} between ${from} and ${until}`;
  }
  if (reminder.times && reminder.times.length > 0) {
    const formatted = [...reminder.times]
      .sort()
      .map((t) => formatReminderTime12h(t))
      .filter(Boolean);
    return `At ${formatted.join(', ')}`;
  }
  return '';
};

export const getReminderDateRangeSummary = (
  reminder: Partial<Pick<Reminder, 'frequency' | 'startDate' | 'endDate'>>
): string => {
  if (reminder.frequency === 'once') {
    return '';
  }
  const start = reminder.startDate ? formatReminderShortDate(reminder.startDate) : '';
  const end = reminder.endDate ? formatReminderShortDate(reminder.endDate) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return '';
};