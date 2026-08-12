import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { generateAndSaveDailyMomentForToday } from '../services/dailyMoments/dailyMomentsGeneratorService';
import type { DailyMoment } from '../models/dailyMoment';
import { getGeminiApiKey } from '../services/profiles/profileService';

interface DailyMomentCardProps {
  userId: string;
  profileId: string;
}

export default function DailyMomentCard({ userId, profileId }: DailyMomentCardProps) {
  const [moment, setMoment] = useState<DailyMoment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchMoment = async () => {
      try {
        // Check if the user has provided their own API key in their profile
        const apiKey = await getGeminiApiKey(userId, profileId).catch(() => undefined);
        
        const fetchedMoment = await generateAndSaveDailyMomentForToday(userId, profileId, apiKey || undefined);
        if (mounted) {
          setMoment(fetchedMoment);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load daily moment');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMoment();

    return () => {
      mounted = false;
    };
  }, [userId, profileId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <Loader2 className="h-5 w-5 animate-spin text-green-600" />
        <span className="text-sm font-medium text-gray-500">Discovering today's moment...</span>
      </div>
    );
  }

  if (error || !moment) {
    // Fail silently so we don't break the user's dashboard view if AI fails
    return null;
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#f2fbf5] to-[#e4f7eb] p-5 shadow-sm ring-1 ring-green-100/50">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-green-600" size={18} />
        <h3 className="text-xs font-bold uppercase tracking-wider text-green-800">{moment.header}</h3>
      </div>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm ring-1 ring-gray-100">
          {moment.emoji || '✨'}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-green-600">
            {moment.category.replace(/-/g, ' ')}
          </p>
          <h4 className="mb-1 text-base font-semibold text-gray-900">{moment.card.title}</h4>
          <p className="text-sm leading-relaxed text-gray-600">{moment.card.content}</p>
        </div>
      </div>
    </div>
  );
}