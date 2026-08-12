import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useProfile } from '../hooks/useProfile';
import WeeklyUpdateCard from '../components/home/WeeklyUpdateCard';
import { getPregnancyAge } from '../utils/pregnancyUtils';
import { generateAndSaveWeeklyUpdate, subscribeToWeeklyUpdates } from '../services/weeklyUpdates/weeklyUpdatesGeneratorService';
import { getGeminiApiKey } from '../services/profiles/profileService';
import type { WeeklyUpdate } from '../models/weeklyUpdate';

export default function WeeklyUpdates() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const userId = user?.uid;

  const { profile } = useProfile(userId, id);
  const age = profile ? getPregnancyAge(profile.lastMenstrualPeriod, profile.ultrasoundLastMenstrualPeriod) : null;
  const currentWeek = age ? (age.days === 0 ? age.weeks : age.weeks + 1) : null;

  const [updates, setUpdates] = useState<WeeklyUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !id) return;
    let mounted = true;

    const unsubscribe = subscribeToWeeklyUpdates(
      userId,
      id,
      (fetchedUpdates) => {
        if (mounted) {
          setUpdates(fetchedUpdates);
          setIsLoading(false);
        }
      },
      (err) => {
        if (mounted) {
          setError(err.message || 'Failed to load weekly updates');
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [userId, id]);

  const handleGenerate = async () => {
    if (!userId || !id) return;
    const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
    await generateAndSaveWeeklyUpdate(userId, id, apiKey || undefined);
  };

  const handleRegenerate = async (week: number) => {
    if (!userId || !id) return;
    const apiKey = await getGeminiApiKey(userId, id).catch(() => undefined);
    await generateAndSaveWeeklyUpdate(userId, id, apiKey || undefined);
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-purple-600 to-fuchsia-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-white">Weekly Updates</h1>
          <p className="max-w-[280px] text-sm leading-relaxed text-purple-50/90">
            Your personalized weekly insights and baby development.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 px-4">
        {userId && id && (
          <WeeklyUpdateCard
            updates={updates}
            currentWeek={currentWeek}
            isLoading={isLoading}
            error={error}
            onGenerate={handleGenerate}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
}