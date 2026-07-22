import { useEffect, useState } from 'react';
import { subscribeToProfile } from './profileService';
import type { Profile } from './types';

export function useProfile(userId: string | undefined, profileId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(Boolean(userId && profileId));

  useEffect(() => {
    if (!userId || !profileId) {
      return;
    }
    return subscribeToProfile(
      userId,
      profileId,
      (nextProfile) => {
        setProfile(nextProfile);
        setIsLoading(false);
      },
      (nextError) => {
        setError(nextError.message);
        setIsLoading(false);
      },
    );
  }, [userId, profileId]);

  return { error, isLoading, profile };
}
