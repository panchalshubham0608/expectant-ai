import { useState, useEffect } from 'react';
import { Bell, Clock, Plus, Trash2, Edit2, Calendar, Loader2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import type { Reminder } from '../../../models/reminder';
import type { ExpectantProfile } from '../../../models/profile';
import { useAuth } from '../../../hooks/useAuth';
import { saveReminder, deleteReminder } from '../../../services/reminders/reminderService';
import { subscribeToProfile, toggleSyncRemindersToCalendar } from '../../../services/profiles/profileService';
import ReminderFormDialog from '../../../components/reminders/ReminderFormDialog';
import ConfirmDialog from './ConfirmDialog';
import { syncReminderToCalendar, getCalendarAccessToken, resyncReminderToCalendar, deleteAllCalendarEventsForReminder } from '../../../services/calendar/calendarService';
import { useReminders } from '../../../hooks/useReminders';

export default function RemindersCard() {
  const { user } = useAuth();
  const { id: profileId } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<ExpectantProfile | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | undefined>();
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingReminderId, setSavingReminderId] = useState<string | null>(null);

  const { reminders, isLoading } = useReminders(user?.uid, profileId);

  useEffect(() => {
    if (!user?.uid || !profileId) return;

    const unsubscribeProfile = subscribeToProfile(
      user.uid,
      profileId,
      (fetchedProfile) => setProfile(fetchedProfile),
      (err) => console.error('Error fetching profile:', err)
    );

    return () => {
      unsubscribeProfile();
    };
  }, [user?.uid, profileId]);

  const handleSave = async (reminderData: Partial<Reminder>) => {
    if (!user?.uid || !profileId) return;

    setSavingReminderId(reminderData.id || 'new');
    let dataToSave = { ...(editingReminder || {}), ...reminderData };

    const needsCalendarAction = (dataToSave.googleCalendarEventIds && dataToSave.googleCalendarEventIds.length > 0) ||
      (profile?.syncRemindersToCalendar && dataToSave.frequency === 'daily' && dataToSave.isActive !== false);

    if (needsCalendarAction) {
      try {
        const accessToken = await getCalendarAccessToken();
        dataToSave = await resyncReminderToCalendar(dataToSave as Reminder, accessToken, !!profile?.syncRemindersToCalendar);
      } catch (error) {
        console.error('Failed to manage calendar events for reminder:', error);
      }
    }

    try {
      await saveReminder(user.uid, profileId, dataToSave);
    } catch (error) {
      console.error('Failed to save reminder:', error);
    } finally {
      setIsFormOpen(false);
      setEditingReminder(undefined);
      setSavingReminderId(null);
    }
  };

  const confirmDelete = async () => {
    if (!user?.uid || !profileId || !reminderToDelete) return;
    setIsDeleting(true);
    try {
      const reminder = reminders.find(r => r.id === reminderToDelete);
      if (reminder?.googleCalendarEventIds && reminder.googleCalendarEventIds.length > 0) {
        try {
          const accessToken = await getCalendarAccessToken();
          await deleteAllCalendarEventsForReminder(reminder, accessToken);
        } catch (error) {
          console.error('Failed to delete calendar events for reminder:', error);
        }
      }
      await deleteReminder(user.uid, profileId, reminderToDelete);
    } finally {
      setIsDeleting(false);
      setReminderToDelete(null);
    }
  };

  const toggleStatus = async (reminder: Reminder) => {
    if (!user?.uid || !profileId) return;
    await handleSave({ ...reminder, isActive: !reminder.isActive });
  };

  const handleCalendarToggle = async () => {
    if (!profile || !user?.uid || !profileId) return;

    if (profile.syncRemindersToCalendar) {
      setShowDisconnectConfirm(true);
      return;
    }

    setIsSyncingCalendar(true);
    try {
      let accessToken: string;
      try {
        accessToken = await getCalendarAccessToken();
      } catch (error) {
        console.error('Failed to authenticate with Google Calendar:', error);
        setIsSyncingCalendar(false);
        return;
      }

      const pendingReminders = reminders.filter(
        (r) => r.frequency === 'daily' && r.isActive !== false && (!r.googleCalendarEventIds || r.googleCalendarEventIds.length === 0)
      );

      for (const reminder of pendingReminders) {
        try {
          const updatedReminder = await syncReminderToCalendar(reminder, accessToken);
          if (updatedReminder.googleCalendarEventIds && updatedReminder.googleCalendarEventIds.length > 0) {
            await saveReminder(user.uid, profileId, updatedReminder);
          }
        } catch (error) {
          console.error('Failed to sync reminder to calendar:', error);
        }
      }

      await toggleSyncRemindersToCalendar(profile.id, true);
    } catch (error) {
      console.error('Failed to toggle calendar sync:', error);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!user?.uid || !profileId || !profile) return;
    setIsSyncingCalendar(true);
    try {
      try {
        const accessToken = await getCalendarAccessToken();
        for (const reminder of reminders) {
          if (reminder.googleCalendarEventIds && reminder.googleCalendarEventIds.length > 0) {
            const updatedReminder = await deleteAllCalendarEventsForReminder(reminder, accessToken);
            await saveReminder(user.uid, profileId, updatedReminder);
          }
        }
      } catch (error) {
        console.error('Failed to clear calendar events during disconnect:', error);
      }
      await toggleSyncRemindersToCalendar(profile.id, false);
    } catch (error) {
      console.error('Failed to disconnect calendar sync:', error);
    } finally {
      setIsSyncingCalendar(false);
      setShowDisconnectConfirm(false);
    }
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
      return `At ${[...reminder.times].sort().map(formatTime).join(' and ')}`;
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

      <div className="mb-6 flex items-center justify-between rounded-2xl bg-blue-50/50 p-4 ring-1 ring-blue-100/50">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm ring-1 ring-blue-100">
            <Calendar size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900">Google Calendar</h4>
            <p className="text-xs text-slate-500">Sync reminders automatically</p>
          </div>
        </div>
        <button
          onClick={handleCalendarToggle}
          disabled={isSyncingCalendar}
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ring-1 transition-colors ${profile?.syncRemindersToCalendar
              ? 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200'
              : 'bg-white text-blue-600 ring-blue-200 hover:bg-blue-50'
            } ${isSyncingCalendar ? 'opacity-75 cursor-not-allowed' : ''}`}
        >
          {isSyncingCalendar && <Loader2 size={14} className="animate-spin" />}
          {profile?.syncRemindersToCalendar
            ? (isSyncingCalendar ? 'Disconnecting...' : 'Disconnect')
            : (isSyncingCalendar ? 'Connecting...' : 'Connect')}
        </button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : displayReminders.length === 0 ? (
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
                  disabled={savingReminderId === reminder.id}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => setReminderToDelete(reminder.id!)}
                  disabled={savingReminderId === reminder.id}
                  className="p-1.5 text-gray-400 hover:text-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
              {savingReminderId === reminder.id ? (
                <div className="flex h-6 w-11 items-center justify-center">
                  <Loader2 size={18} className="animate-spin text-blue-600" />
                </div>
              ) : (
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${reminder.isActive ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  role="switch"
                  aria-checked={reminder.isActive}
                  onClick={() => toggleStatus(reminder)}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${reminder.isActive ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        title="Disconnect Google Calendar?"
        description="You will no longer see your reminders in your Google Calendar. Are you sure you want to disconnect?"
        confirmText="Disconnect"
        isConfirming={isSyncingCalendar}
        onConfirm={confirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />

      <ConfirmDialog
        isOpen={!!reminderToDelete}
        title="Delete Reminder?"
        description="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmText="Delete"
        isConfirming={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setReminderToDelete(null)}
      />

      {isFormOpen && (
        <ReminderFormDialog
          initialValues={editingReminder}
          isSaving={!!savingReminderId}
          onClose={() => { setIsFormOpen(false); setEditingReminder(undefined); }}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}