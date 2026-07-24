import { useEffect, useState } from 'react';
import { subscribeToMeasurements } from './measurementsService';
import type { Measurement } from './types';

export function useMeasurements(userId: string | undefined, profileId: string | undefined) {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(userId && profileId));

  useEffect(() => {
    if (!userId || !profileId) {
      setIsLoading(false);
      return;
    }

    return subscribeToMeasurements(
      userId,
      profileId,
      (nextMeasurements) => {
        setMeasurements(nextMeasurements.length > 0 ? nextMeasurements : null);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [userId, profileId]);

  return { error, isLoading, measurements };
}