import { useEffect, useState } from 'react';
import { subscribeToAppointments } from '../services/appointments/appointmentService';
import type { Appointment } from '../models/appointment';

export function useAppointments(userId: string | undefined, profileId: string | undefined) {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !profileId) {
      setIsLoading(false);
      return;
    }

    return subscribeToAppointments(
      userId,
      profileId,
      (nextAppointments) => {
        const sorted = nextAppointments.sort((a, b) => {
          const timeA = new Date(a.scheduledAt);
          const timeB = new Date(b.scheduledAt);
          
          const dateA = new Date(timeA);
          dateA.setHours(0, 0, 0, 0);
          const dateB = new Date(timeB);
          dateB.setHours(0, 0, 0, 0);
          
          const dateDiff = dateA.getTime() - dateB.getTime();
          if (dateDiff !== 0) {
            return dateDiff;
          }
          
          return timeA.getTime() - timeB.getTime();
        });
        setAppointments(sorted);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [userId, profileId]);

  return { error, isLoading, appointments };
}