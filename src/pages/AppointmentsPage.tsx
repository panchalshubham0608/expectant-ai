import { useState } from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import type { Appointment } from "../models/doctorVisit";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import CompleteAppointmentFormDialog from "../components/appointments/CompleteAppointmentFormDialog";
import AppointmentFormDialog from "../components/appointments/AppointmentFormDialog";

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: "appt-1",
    scheduledAt: "2026-08-15T10:00:00Z",
    doctorName: "Dr. Sarah Smith",
    specialty: "OB-GYN",
    hospital: "UCSF Medical Center",
    reason: "20-Week Anomaly Scan & Routine Checkup",
    questions: ["Is it safe to fly in the third trimester?", "What prenatal vitamins do you recommend now?"],
    observations: [],
    diagnoses: [],
    recommendations: [],
    prescribedMedications: [],
    medicalRecordIds: [],
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "appt-2",
    scheduledAt: "2026-08-28T14:30:00Z",
    doctorName: "City Lab Diagnostics",
    specialty: "Pathology",
    hospital: "Downtown Clinic",
    reason: "Glucose Tolerance Test (GTT)",
    questions: [],
    observations: [],
    diagnoses: [],
    recommendations: [],
    prescribedMedications: [],
    medicalRecordIds: [],
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "appt-3",
    scheduledAt: "2026-06-10T09:15:00Z",
    doctorName: "Dr. Sarah Smith",
    specialty: "OB-GYN",
    hospital: "UCSF Medical Center",
    reason: "Overdue Appointment",
    questions: ["Is the baby's growth normal?", "Should I change my diet?"],
    observations: ["Fetal heart rate is normal (140 bpm)", "Growth is on track", "No visible abnormalities"],
    diagnoses: ["Healthy ongoing pregnancy"],
    recommendations: ["Continue current prenatal vitamins", "Drink plenty of water", "Start moderate exercise"],
    prescribedMedications: [
      { name: "Prenatal Vitamin", dosage: "1 tablet", frequency: "daily" } as any,
      { name: "Iron Supplement", dosage: "1 tablet", frequency: "daily" } as any
    ],
    medicalRecordIds: ["rec-123", "rec-456"],
    followUpDate: "2026-08-15T10:00:00Z",
    status: "scheduled",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "appt-4",
    scheduledAt: "2026-07-10T09:15:00Z",
    completedAt: "2026-07-10T10:00:00Z",
    doctorName: "Dr. Sarah Smith",
    specialty: "OB-GYN",
    hospital: "UCSF Medical Center",
    reason: "First Trimester Screening",
    questions: ["Is the baby's growth normal?", "Should I change my diet?"],
    observations: ["Fetal heart rate is normal (140 bpm)", "Growth is on track", "No visible abnormalities"],
    diagnoses: ["Healthy ongoing pregnancy"],
    recommendations: ["Continue current prenatal vitamins", "Drink plenty of water", "Start moderate exercise"],
    prescribedMedications: [
      { name: "Prenatal Vitamin", dosage: "1 tablet", frequency: "daily" } as any,
      { name: "Iron Supplement", dosage: "1 tablet", frequency: "daily" } as any
    ],
    medicalRecordIds: ["rec-123", "rec-456"],
    followUpDate: "2026-08-15T10:00:00Z",
    status: "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

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
  const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [completingAppt, setCompletingAppt] = useState<Appointment | null>(null);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled' && new Date(a.scheduledAt).getTime() >= Date.now());
  const pastAppointments = appointments.filter(a => new Date(a.scheduledAt).getTime() < Date.now());

  const displayAppointments = activeTab === "upcoming" ? upcomingAppointments : pastAppointments;

  const handleAddAppointment = (newAppt: Partial<Appointment>) => {
    const appt: Appointment = {
      ...newAppt,
      id: `appt-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      observations: [],
      diagnoses: [],
      recommendations: [],
      prescribedMedications: [],
      medicalRecordIds: [],
    } as Appointment;
    
    setAppointments(prev => {
      const updated = [appt, ...prev];
      return updated.sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
    });
    setIsFormOpen(false);
  };

  const handleMarkCompleteClick = (appointment: Appointment) => {
    setSelectedAppt(null);
    setCompletingAppt(appointment);
  };

  const handleSaveCompletion = (completionData: Partial<Appointment>) => {
    if (!completingAppt) return;

    setAppointments(prev => prev.map(appt => 
      appt.id === completingAppt.id 
        ? { 
            ...appt, 
            ...completionData, 
          } 
        : appt
    ));
    setCompletingAppt(null);
  };

  const handleDeleteAppointment = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
  };

  const confirmDelete = () => {
    if (appointmentToDelete) {
      setAppointments(prev => prev.filter(a => a.id !== appointmentToDelete.id));
      setAppointmentToDelete(null);
      setSelectedAppt(null);
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
          {displayAppointments.length === 0 ? (
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
      </div>

      {/* Appointment Details Modal */}
      {selectedAppt && (
        <AppointmentDetailsModal 
          appointment={selectedAppt} 
          onClose={() => setSelectedAppt(null)} 
          onMarkComplete={handleMarkCompleteClick} 
          onDelete={handleDeleteAppointment}
        />
      )}

      {isFormOpen && (
        <AppointmentFormDialog 
          onClose={() => setIsFormOpen(false)} 
          onSubmit={handleAddAppointment} 
        />
      )}

      {completingAppt && (
        <CompleteAppointmentFormDialog
          appointment={completingAppt}
          onClose={() => setCompletingAppt(null)}
          onSubmit={handleSaveCompletion}
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
    </div>
  );
}