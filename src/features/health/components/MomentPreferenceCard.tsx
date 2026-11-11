import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { saveReminder } from '../../../services/reminders/reminderService';
import { useReminders } from '../../../hooks/useReminders';

interface MomentPreferenceCardProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  profileId: string;
}

export default function MomentPreferenceCard({
  isOpen,
  onClose,
  userId,
  profileId,
}: MomentPreferenceCardProps) {
  const { reminders } = useReminders(userId, profileId);

  const reminder = reminders.find((r) => r.id === 'daily-moment') || null;
  const isActive = reminder?.isActive ?? true;

  // Clean up legacy delivery time on existing daily-moment preference so no scheduled notification fires
  useEffect(() => {
    if (!userId || !profileId || !reminder || reminder.times === undefined) return;
    void saveReminder(userId, profileId, {
      id: 'daily-moment',
      times: undefined,
    });
  }, [userId, profileId, reminder]);

  if (!isOpen) return null;

  const handleToggle = async () => {
    if (!userId || !profileId) return;

    if (!reminder) {
      await saveReminder(userId, profileId, {
        id: 'daily-moment',
        title: '✨ Today’s little wonder is ready',
        description: 'Here’s something amazing about you and your growing little one.',
        frequency: 'daily',
        times: undefined,
        isActive: !isActive,
      });
    } else {
      await saveReminder(userId, profileId, {
        id: 'daily-moment',
        isActive: !isActive,
        times: undefined,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-wonders-dialog-title"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="daily-wonders-dialog-title" className="text-xl font-bold text-gray-900">
                Daily Little Wonders
              </h2>
              <p className="text-xs text-gray-500">
                Manage your daily pregnancy moment preference
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4 rounded-2xl bg-orange-50 p-4 ring-1 ring-orange-100">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-gray-900">✨ Daily Little Wonders</p>
              <p className="mt-1 text-xs text-gray-600">
                Discover something new, fun, or meaningful every day.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                isActive ? 'bg-orange-500' : 'bg-gray-300'
              }`}
              role="switch"
              aria-checked={isActive}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}