import { useEffect, useState } from 'react';
import { subscribeToProfile } from '../services/profiles/profileService';
import type { ExpectantProfile } from '../models/profile';

export function useProfile(userId: string | undefined, profileId: string | undefined) {
  const [profile, setProfile] = useState<ExpectantProfile | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId || !profileId) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToProfile(
      userId,
      profileId,
      (fetchedProfile) => {
        setProfile(fetchedProfile);
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, profileId]);

  return { error, isLoading, profile };
}