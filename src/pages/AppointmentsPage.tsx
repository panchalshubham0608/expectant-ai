import { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2
} from "lucide-react";
import type { Appointment } from "../models/appointment";
import type { ExpectantProfile } from "../models/profile";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import CompleteAppointmentFormDialog from "../components/appointments/CompleteAppointmentFormDialog";
import AppointmentFormDialog from "../components/appointments/AppointmentFormDialog";
import ConfirmDialog from "../features/health/components/ConfirmDialog";
import { useAuth } from "../hooks/useAuth";
import { useParams } from "react-router-dom";
import { useAppointments } from "../hooks/useAppointments";
import { saveAppointment, updateAppointment, deleteAppointment } from "../services/appointments/appointmentService";
import { subscribeToProfile, toggleSyncAppointmentsToCalendar } from "../services/profiles/profileService";
import {
  getCalendarAccessToken,
  syncAppointmentToCalendar,
  resyncAppointmentToCalendar,
  deleteCalendarEventForAppointment
} from "../services/calendar/calendarService";

const formatDateTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    return {
      date: new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date),
      time: new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).format(date)
    };
  } catch {
    return { date: dateString, time: "" };
  }
};

export default function AppointmentsPage() {
  const { id: profileId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { appointments: fetchedAppointments, isLoading } = useAppointments(user?.uid, profileId);
  const appointments = fetchedAppointments || [];

  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [profile, setProfile] = useState<ExpectantProfile | null>(null);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled' && new Date(a.scheduledAt).getTime() >= Date.now());
  const pastAppointments = appointments.filter(a => new Date(a.scheduledAt).getTime() < Date.now());

  const displayAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

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

  const handleCalendarToggle = async () => {
    if (!profile || !user?.uid || !profileId) return;

    if (profile.syncAppointmentsToCalendar) {
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

      const pendingAppointments = appointments.filter(
        (a) => a.status !== 'cancelled' && !a.googleCalendarEventId
      );

      for (const appt of pendingAppointments) {
        try {
          const updatedAppt = await syncAppointmentToCalendar(appt, accessToken);
          if (updatedAppt.googleCalendarEventId) {
            await updateAppointment(user.uid, profileId, appt.id, updatedAppt);
          }
        } catch (error) {
          console.error('Failed to sync appointment to calendar:', error);
        }
      }

      await toggleSyncAppointmentsToCalendar(profile.id, true);
    } catch (error) {
      console.error('Failed to toggle calendar sync:', error);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const confirmDisconnect = async () => {
    if (!profile || !user?.uid || !profileId) return;
    setIsSyncingCalendar(true);
    try {
      try {
        const accessToken = await getCalendarAccessToken();
        for (const appt of appointments) {
          if (appt.googleCalendarEventId) {
            const updatedAppt = await deleteCalendarEventForAppointment(appt, accessToken);
            await updateAppointment(user.uid, profileId, appt.id, updatedAppt);
          }
        }
      } catch (error) {
        console.error('Failed to clear calendar events during disconnect:', error);
      }
      await toggleSyncAppointmentsToCalendar(profile.id, false);
    } catch (error) {
      console.error('Failed to disconnect calendar sync:', error);
    } finally {
      setIsSyncingCalendar(false);
      setShowDisconnectConfirm(false);
    }
  };

  const saveAndSyncAppointment = async (
    appointmentData: Partial<Appointment>,
    originalAppointment?: Appointment
  ) => {
    if (!user?.uid || !profileId) return null;

    setIsSaving(true);
    try {
      const preservedEventId = originalAppointment?.googleCalendarEventId || appointmentData.googleCalendarEventId;
      let dataToSave = { 
        ...(originalAppointment || {}), 
        ...appointmentData,
      } as Appointment;
      
      if (preservedEventId) {
        dataToSave.googleCalendarEventId = preservedEventId;
      }

      // Remove undefined values to prevent Firestore errors
      Object.keys(dataToSave).forEach(key => {
        if ((dataToSave as any)[key] === undefined) {
          delete (dataToSave as any)[key];
        }
      });

      const needsCalendarAction = !!dataToSave.googleCalendarEventId ||
        (profile?.syncAppointmentsToCalendar && dataToSave.status !== 'cancelled');

      if (needsCalendarAction) {
        try {
          const accessToken = await getCalendarAccessToken();
          dataToSave = await resyncAppointmentToCalendar(
            dataToSave,
            accessToken,
            !!profile?.syncAppointmentsToCalendar
          );
        } catch (error) {
          console.error('Failed to manage calendar events for appointment:', error);
        }
      }

      if (originalAppointment?.id) {
        await updateAppointment(user.uid, profileId, originalAppointment.id, dataToSave);
      } else {
        await saveAppointment(user.uid, profileId, dataToSave as any);
      }

      return dataToSave;
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAppointment = async (newAppt: Partial<Appointment>) => {
    try {
      await saveAndSyncAppointment(newAppt);
      setIsFormOpen(false);
    } catch (error) {
      console.error("Failed to add appointment", error);
    }
  };

  const handleMarkCompleteClick = (appointment: Appointment) => {
    setSelectedAppt(null);
    setCompletingAppt(appointment);
  };

  const handleSaveCompletion = async (completionData: Partial<Appointment>) => {
    if (!completingAppt) return;
    try {
      const updatedAppt = await saveAndSyncAppointment(completionData, completingAppt);
      setCompletingAppt(null);
      if (updatedAppt) setSelectedAppt(updatedAppt);
    } catch (error) {
      console.error("Failed to complete appointment", error);
    }
  };

  const handleUpdateAppointment = async (updatedData: Partial<Appointment>) => {
    if (!selectedAppt) return;
    try {
      const updatedAppt = await saveAndSyncAppointment(updatedData, selectedAppt);
      if (updatedAppt) setSelectedAppt(updatedAppt);
    } catch (error) {
      console.error("Failed to update appointment", error);
    }
  }

  const handleEditAppointment = (appointment: Appointment) => {
    setSelectedAppt(null);
    setEditingAppt(appointment);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
  };

  const confirmDelete = async () => {
    if (appointmentToDelete && user?.uid && profileId) {
      try {
        if (appointmentToDelete.googleCalendarEventId) {
          try {
            const accessToken = await getCalendarAccessToken();
            await deleteCalendarEventForAppointment(appointmentToDelete, accessToken);
          } catch (error) {
            console.error("Failed to delete calendar events for appointment:", error);
          }
        }
        await deleteAppointment(user.uid, profileId, appointmentToDelete.id);
        setAppointmentToDelete(null);
        setSelectedAppt(null);
      } catch (error) {
        console.error("Failed to delete appointment", error);
      }
    }
  };

  const handleSaveEdit = async (updatedData: Partial<Appointment>) => {
    if (!editingAppt) return;
    try {
      const updatedAppt = await saveAndSyncAppointment(updatedData, editingAppt);
      setEditingAppt(null);
      if (updatedAppt) setSelectedAppt(updatedAppt);
    } catch (error) {
      console.error("Failed to update appointment", error);
    }
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-indigo-600 to-blue-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-white">Appointments</h1>
          <button 
            className="flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30 shadow-sm"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus size={18} />
            <span>New</span>
          </button>
        </div>
      </div>

      <div className="relative z-20 -mt-8 px-4">
        {/* Tab Navigation */}
        <div className="flex w-full rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-gray-100 mb-6">
          <button
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === "upcoming"
                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("upcoming")}
          >
            Upcoming ({upcomingAppointments.length})
          </button>
          <button
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all ${
              activeTab === "past"
                ? "bg-indigo-50 text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("past")}
          >
            Past ({pastAppointments.length})
          </button>
        </div>

        {/* Appointments List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-indigo-500" />
              <p className="mt-1 text-sm text-gray-500">Loading appointments...</p>
            </div>
          ) : displayAppointments.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">No {activeTab} appointments</h3>
              <p className="mt-1 text-sm text-gray-500">You're all caught up for now.</p>
            </div>
          ) : (
            displayAppointments.map((appt) => {
              const { date, time } = formatDateTime(appt.scheduledAt);
              return (
                <div 
                  key={appt.id} 
                  onClick={() => setSelectedAppt(appt)}
                  className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Date & Time Badge */}
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-indigo-50 px-3 py-2 text-indigo-700 min-w-[72px]">
                        <span className="text-xs font-semibold uppercase tracking-wider">{date.split(' ')[0]}</span>
                        <span className="text-xl font-bold leading-none my-0.5">{date.split(' ')[1].replace(',', '')}</span>
                      </div>
                      
                      <div>
                        <h3 className="text-base font-bold text-gray-900 line-clamp-1">{appt.reason || "Appointment"}</h3>
                        <p className="text-sm font-medium text-gray-600 mt-0.5">{appt.doctorName}</p>
                        {appt.specialty && (
                          <p className="text-xs text-gray-500 mt-0.5">{appt.specialty}</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Status Icon */}
                    {appt.status === "completed" && <CheckCircle2 className="text-green-500 shrink-0" size={24} />}
                    {appt.status === "cancelled" && <XCircle className="text-rose-500 shrink-0" size={24} />}
                    {appt.status === "scheduled" && new Date(appt.scheduledAt).getTime() < Date.now() && <AlertTriangle className="text-amber-500 shrink-0" size={24} />}
                  </div>

                  <div className="mt-4 flex flex-col gap-2 pt-4 border-t border-gray-50">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={16} className="text-indigo-400 shrink-0" />
                      <span>{time}</span>
                    </div>
                    {appt.hospital && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin size={16} className="text-rose-400 shrink-0" />
                        <span className="truncate">{appt.hospital}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="mt-6 flex items-center justify-between rounded-2xl bg-indigo-50/50 p-4 ring-1 ring-indigo-100/50">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900">Google Calendar</h4>
              <p className="text-xs text-slate-500">Sync appointments automatically</p>
            </div>
          </div>
          <button
            onClick={handleCalendarToggle}
            disabled={isSyncingCalendar}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold shadow-sm ring-1 transition-colors ${
              profile?.syncAppointmentsToCalendar 
                ? 'bg-slate-100 text-slate-600 ring-slate-200 hover:bg-slate-200' 
                : 'bg-white text-indigo-600 ring-indigo-200 hover:bg-indigo-50'
            } ${isSyncingCalendar ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {isSyncingCalendar && <Loader2 size={14} className="animate-spin" />}
            {profile?.syncAppointmentsToCalendar 
              ? (isSyncingCalendar ? 'Disconnecting...' : 'Disconnect') 
              : (isSyncingCalendar ? 'Connecting...' : 'Connect')}
          </button>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <AppointmentDetailsModal 
          appointment={selectedAppt} 
          onClose={() => setSelectedAppt(null)} 
          onMarkComplete={handleMarkCompleteClick} 
          onUpdate={handleUpdateAppointment}
          onEdit={handleEditAppointment}
          onDelete={handleDeleteAppointment}
        />
      )}

      {isFormOpen && (
        <AppointmentFormDialog 
          isSaving={isSaving}
          onClose={() => setIsFormOpen(false)} 
          onSubmit={handleAddAppointment} 
        />
      )}

      {completingAppt && (
        <CompleteAppointmentFormDialog
          appointment={completingAppt}          
          isSaving={isSaving}
          onClose={() => {
            setSelectedAppt(completingAppt);
            setCompletingAppt(null);
          }}
          onSubmit={handleSaveCompletion}
        />
      )}

      {editingAppt && (
        <AppointmentFormDialog
          mode="edit"
          initialValues={editingAppt}
          isSaving={isSaving}
          onClose={() => {
            setSelectedAppt(editingAppt);
            setEditingAppt(null);
          }}
          onSubmit={handleSaveEdit}
        />
      )}

      {appointmentToDelete && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => setAppointmentToDelete(null)}
        >
          <div 
            className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-gray-100 p-6 sm:p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 mb-6">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Appointment?</h2>
            <p className="text-sm text-gray-500 mb-8">
              Are you sure you want to delete this appointment? This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button 
                onClick={() => setAppointmentToDelete(null)}
                className="w-full rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 sm:w-auto"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                className="w-full rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        title="Disconnect Google Calendar?"
        description="You will no longer see your appointments in your Google Calendar. Are you sure you want to disconnect?"
        confirmText="Disconnect"
        isConfirming={isSyncingCalendar}
        onConfirm={confirmDisconnect}
        onCancel={() => setShowDisconnectConfirm(false)}
      />
    </div>
  );
}