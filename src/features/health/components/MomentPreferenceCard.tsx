import { useState, useEffect } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../../auth/useAuth';
import { subscribeToReminders, saveReminder } from '../../../services/reminders/reminderService';
import type { Reminder } from '../../../models/reminder';

export default function MomentPreferenceCard() {
  const { user } = useAuth();
  const { id: profileId } = useParams<{ id: string }>();
  const [reminder, setReminder] = useState<Reminder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !profileId) return;

    const unsubscribe = subscribeToReminders(
      user.uid,
      profileId,
      (fetched: Reminder[]) => {
        // Look specifically for our hardcoded daily moment reminder ID
        const pref = fetched.find((r) => r.id === 'daily-moment');
        setReminder(pref || null);
        setIsLoading(false);
      },
      (err: Error) => {
        console.error('Error fetching preferences:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, profileId]);

  const handleToggle = async () => {
    if (!user?.uid || !profileId) return;
    const isActive = reminder?.isActive ?? false;

    if (!reminder) {
      // Create it seamlessly on the first toggle
      await saveReminder(user.uid, profileId, {
        id: 'daily-moment',
        title: 'Daily Moment',
        description: 'Receive your personalized daily pregnancy update',
        frequency: 'daily',
        times: ['09:00'],
        isActive: true,
      });
    } else {
      // Toggle existing state
      await saveReminder(user.uid, profileId, {
        id: 'daily-moment',
        isActive: !isActive,
      });
    }
  };

  const handleTimeChange = async (time: string) => {
    if (!user?.uid || !profileId || !reminder) return;
    await saveReminder(user.uid, profileId, {
      id: 'daily-moment',
      times: [time],
    });
  };

  if (isLoading) return null; // Or replace with a loader if preferred

  const isActive = reminder?.isActive ?? false;
  const time = reminder?.times?.[0] || '09:00';

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <h3 className="mb-5 flex items-center gap-2 text-lg font-bold text-gray-900">
        <Sparkles className="text-orange-500" size={20} />
        Preferences
      </h3>
      <div className="flex flex-col gap-4 rounded-2xl bg-orange-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-900">✨ Daily Little Wonders</p>
            <p className="mt-1 text-xs text-gray-600">Discover something new, fun, or meaningful every day.</p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${isActive ? 'bg-orange-500' : 'bg-gray-300'}`}
            role="switch"
            aria-checked={isActive}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>
        {isActive && (
          <div className="flex items-center justify-between border-t border-orange-100 pt-4">
            <span className="text-sm font-medium text-gray-700">Delivery Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="rounded-xl border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}