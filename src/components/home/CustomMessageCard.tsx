import { useState } from 'react';
import { Heart, X } from 'lucide-react';
import { dismissCustomMessage, isCustomMessageWithin24Hours } from '../../services/profiles/profileService';

interface CustomMessageCardProps {
  userId: string;
  profileId: string;
  message?: string;
  updatedAt?: string;
  dismissed?: boolean;
}

export default function CustomMessageCard({
  userId,
  profileId,
  message,
  updatedAt,
  dismissed,
}: CustomMessageCardProps) {
  const [optimisticDismissedStamp, setOptimisticDismissedStamp] = useState<string | null>(null);
  const [isDismissing, setIsDismissing] = useState(false);

  const trimmedMessage = message?.trim() || '';
  const currentStamp = `${updatedAt || ''}:${trimmedMessage}`;

  if (
    !trimmedMessage ||
    dismissed ||
    !isCustomMessageWithin24Hours(updatedAt) ||
    optimisticDismissedStamp === currentStamp
  ) {
    return null;
  }

  const handleDismiss = async () => {
    setOptimisticDismissedStamp(currentStamp);
    setIsDismissing(true);
    try {
      await dismissCustomMessage(userId, profileId);
    } catch {
      // Revert optimistic dismissal if Firestore update fails
      setOptimisticDismissedStamp(null);
    } finally {
      setIsDismissing(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fff5f7] to-[#fdeef2] p-5 shadow-sm ring-1 ring-rose-100/70">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Heart className="fill-rose-400 text-rose-500" size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700">
            A Message From Your Husband
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isDismissing}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-rose-600 transition hover:bg-rose-100/70 hover:text-rose-800 disabled:opacity-50"
          aria-label="Dismiss message from husband"
          title="Dismiss"
        >
          <span>Dismiss</span>
          <X size={14} />
        </button>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600">
        {trimmedMessage}
      </p>
    </div>
  );
}
