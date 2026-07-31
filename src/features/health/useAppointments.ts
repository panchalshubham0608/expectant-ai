import { useEffect, useState } from 'react';
import { subscribeToAppointments } from './doctorVisitsService';
import type { Appointment } from '../../models/doctorVisit';

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
        setAppointments(nextAppointments);
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