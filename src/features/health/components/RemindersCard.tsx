import { useState, useEffect } from 'react';
import { Bell, Clock, Plus, Trash2, Edit2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { Reminder } from '../../../models/reminder';
import { useAuth } from '../../../auth/useAuth';
import { subscribeToReminders, saveReminder, deleteReminder } from '../../../services/reminders/reminderService';
import ReminderFormDialog from '../../../lib/ReminderFormDialog';

export default function RemindersCard() {
  const { user } = useAuth();
  const { id: profileId } = useParams<{ id: string }>();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();

  useEffect(() => {
    if (!user?.uid || !profileId) return;

    const unsubscribe = subscribeToReminders(
      user.uid,
      profileId,
      (fetched : Reminder[]) => setReminders(fetched),
      (err : Error) => console.error('Error fetching reminders:', err)
    );

    return () => unsubscribe();
  }, [user?.uid, profileId]);

  const handleSave = async (reminderData: Partial<Reminder>) => {
    if (!user?.uid || !profileId) return;
    await saveReminder(user.uid, profileId, reminderData);
    setIsFormOpen(false);
    setEditingReminder(undefined);
  };

  const handleDelete = async (reminderId: string) => {
    if (!user?.uid || !profileId) return;
    await deleteReminder(user.uid, profileId, reminderId);
  };

  const toggleStatus = async (reminder: Reminder) => {
    if (!user?.uid || !profileId) return;
    await saveReminder(user.uid, profileId, { id: reminder.id, isActive: !reminder.isActive });
  };

  
  const formatTime = (time24?: string) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const h = parseInt(hours, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const getFrequencyText = (reminder: Reminder) => {
    if (reminder.interval) {
      return `Every ${reminder.interval} ${reminder.intervalUnit} between ${formatTime(reminder.startTime)} and ${formatTime(reminder.endTime)}`;
    }
    if (reminder.times && reminder.times.length > 0) {
      return `At ${reminder.times.map(formatTime).join(' and ')}`;
    }
    return reminder.frequency;
  };

  // Filter out the daily moment preference so it doesn't render twice!
  const displayReminders = reminders.filter((r) => r.id !== 'daily-moment');

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Bell className="text-blue-500" size={20} />
          Scheduled Reminders
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingReminder(undefined); setIsFormOpen(true); }}
            className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <Plus size={16} />
            <span>Add</span>
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayReminders.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No reminders scheduled yet.</p>
        ) : (
          displayReminders.map((reminder) => (
          <div
            key={reminder.id}
            className="relative flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100 transition hover:bg-white hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-900">{reminder.title}</h4>
                {reminder.description && (
                  <p className="mt-1 text-sm text-slate-500">{reminder.description}</p>
                )}
                
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50/50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100/50">
                    <Clock size={12} className="text-blue-500" />
                    {getFrequencyText(reminder)}
                  </span>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-3">
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={() => { setEditingReminder(reminder); setIsFormOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 transition"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(reminder.id!)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 transition"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                    reminder.isActive ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                  role="switch"
                  aria-checked={reminder.isActive}
                  onClick={() => toggleStatus(reminder)}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      reminder.isActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
      {isFormOpen && (
        <ReminderFormDialog
          initialValues={editingReminder}
          onClose={() => { setIsFormOpen(false); setEditingReminder(undefined); }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}