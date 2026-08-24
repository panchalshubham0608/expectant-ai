import { differenceInDays } from 'date-fns';

export interface PregnancyAge {
  weeks: number;
  days: number;
  currentWeek: number;
  totalDays: number;
  isFuture: boolean;
}

export const getPregnancyAge = (
  lastMenstrualPeriod?: string | null,
  ultrasoundLastMenstrualPeriod?: string | null,
  targetDate: Date = new Date()
): PregnancyAge | null => {
  const activeLmp = ultrasoundLastMenstrualPeriod || lastMenstrualPeriod;
  if (!activeLmp) return null;

  try {
    const lmpDate = new Date(`${activeLmp}T00:00:00`);
    if (isNaN(lmpDate.getTime())) return null;

    const totalDays = differenceInDays(targetDate, lmpDate);

    if (totalDays < 0) {
      return { weeks: 0, days: 0, currentWeek: 0, totalDays, isFuture: true };
    }

    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    const currentWeek = days > 0 ? weeks + 1 : weeks;

    return { weeks, days, currentWeek, totalDays, isFuture: false };
  } catch {
    return null;
  }
};