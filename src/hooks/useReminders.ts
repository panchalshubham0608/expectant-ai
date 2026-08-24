import { useEffect, useState } from 'react';
import { subscribeToReminders } from '../services/reminders/reminderService';
import type { Reminder } from '../models/reminder';

export function useReminders(userId: string | undefined, profileId: string | undefined) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !profileId) {
      setIsLoading(false);
      return;
    }

    return subscribeToReminders(
      userId,
      profileId,
      (fetched) => {
        const sorted = [...fetched].sort((a, b) => {
          const timeA = a.interval ? (a.startTime || "24:00") : (a.times?.length ? [...a.times].sort()[0] : "24:00");
          const timeB = b.interval ? (b.startTime || "24:00") : (b.times?.length ? [...b.times].sort()[0] : "24:00");
          return timeA.localeCompare(timeB);
        });
        setReminders(sorted);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );
  }, [userId, profileId]);

  return { error, isLoading, reminders };
}