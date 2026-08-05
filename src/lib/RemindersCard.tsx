import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bell, Clock, Plus, Edit3, Trash2, Loader2 } from 'lucide-react';
import type { Reminder } from '../models/reminder';
import ReminderFormDialog from './ReminderFormDialog';
import { useAuth } from '../auth/useAuth';
import { subscribeToReminders, saveReminder, deleteReminder } from './reminderService';

export default function RemindersCard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  
  useEffect(() => {
    if (!user?.uid || !id) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToReminders(
      user.uid,
      id,
      (fetchedReminders) => {
        setReminders(fetchedReminders);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching reminders:', err);
        setError('Failed to load reminders.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, id]);

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

  const handleSave = async (reminderData: Partial<Reminder>) => {
    if (!user?.uid || !id) return;
    try {
      await saveReminder(user.uid, id, reminderData as Omit<Reminder, 'id'> & { id?: string });
      setIsFormOpen(false);
      setEditingReminder(null);
    } catch (err) {
      console.error('Failed to save reminder:', err);
    }
  };

  const handleDelete = async (reminderId: string) => {
    if (!user?.uid || !id) return;
    try {
      await deleteReminder(user.uid, id, reminderId);
    } catch (err) {
      console.error('Failed to delete reminder:', err);
    }
  };

  const handleToggleActive = async (reminder: Reminder) => {
    if (!user?.uid || !id) return;
    try {
      await saveReminder(user.uid, id, { ...reminder, isActive: !reminder.isActive });
    } catch (err) {
      console.error('Failed to toggle reminder status:', err);
    }
  };

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between mb-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Bell className="text-blue-500" size={20} />
          Scheduled Reminders
        </h3>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
        >
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="animate-spin text-blue-500" size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : reminders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No active reminders. Add one to get started!
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => (
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
                
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingReminder(reminder);
                      setIsFormOpen(true);
                    }}
                    className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                    title="Edit Reminder"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(reminder.id)}
                    className="mr-2 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                    title="Delete Reminder"
                  >
                    <Trash2 size={18} />
                  </button>
                  <button
                    type="button"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
                      reminder.isActive ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                    role="switch"
                    aria-checked={reminder.isActive}
                    onClick={() => handleToggleActive(reminder)}
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
          ))}
        </div>
      )}

      {isFormOpen && (
        <ReminderFormDialog
          initialValues={editingReminder || undefined}
          onClose={() => {
            setIsFormOpen(false);
            setEditingReminder(null);
          }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}