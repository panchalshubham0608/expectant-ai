import { 
  Calendar, 
  MapPin, 
  Stethoscope, 
  FileText, 
  CheckCircle2,
  X,
  Pill,
  Paperclip,
  Activity,
  Trash2,
  Edit3
} from "lucide-react";
import type { Appointment } from "../../models/appointment";

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

interface AppointmentDetailsModalProps {
  appointment: Appointment;
  onClose: () => void;
  onMarkComplete: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointment: Appointment) => void;
}

export default function AppointmentDetailsModal({ appointment, onClose, onMarkComplete, onEdit, onDelete }: AppointmentDetailsModalProps) {
  const isPastDue = appointment.status === 'scheduled' && new Date(appointment.scheduledAt).getTime() < Date.now();
  const displayStatus = isPastDue ? 'overdue' : appointment.status;
  const isActive = appointment.status !== 'completed' && appointment.status !== 'cancelled';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-[2rem] bg-white shadow-2xl ring-1 ring-gray-100 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
                displayStatus === 'completed' ? 'bg-green-100 text-green-700' : 
                displayStatus === 'cancelled' ? 'bg-rose-100 text-rose-700' : 
                displayStatus === 'overdue' ? 'bg-amber-100 text-amber-700' :
                'bg-indigo-100 text-indigo-700'
              }`}>
                {displayStatus}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 break-words">{appointment.reason}</h2>
          </div>
          <div className="flex items-center gap-1 -mr-2 -mt-2 shrink-0">
              <button 
                onClick={() => onEdit(appointment)} 
                className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                title="Edit appointment"
              >
                <Edit3 size={20} />
              </button>
            <button 
              onClick={() => onDelete(appointment)} 
              className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
              title="Delete appointment"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Doctor & Location Info */}
          <div className="flex flex-col gap-4 rounded-2xl bg-gray-50 p-5">
            <div className="flex items-center gap-3 text-gray-700">
              <Stethoscope size={20} className="text-indigo-500 shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">{appointment.doctorName}</p>
                {appointment.specialty && <p className="text-sm text-gray-500">{appointment.specialty}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar size={20} className="text-blue-500 shrink-0" />
              <p className="text-sm font-medium">{formatDateTime(appointment.scheduledAt).date} at {formatDateTime(appointment.scheduledAt).time}</p>
            </div>
            {appointment.hospital && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin size={20} className="text-rose-500 shrink-0" />
                <p className="text-sm font-medium">{appointment.hospital}</p>
              </div>
            )}
            {appointment.completedAt && (
              <div className="flex items-center gap-3 text-gray-700 mt-1 pt-3 border-t border-gray-200/60">
                <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                <p className="text-sm font-medium">Completed: {formatDateTime(appointment.completedAt).date} at {formatDateTime(appointment.completedAt).time}</p>
              </div>
            )}
          </div>

          {appointment.followUpDate && (
            <div className="rounded-2xl bg-indigo-50 p-5 border border-indigo-100">
              <h3 className="text-sm font-bold text-indigo-900 mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-500"/> Follow-up Appointment
              </h3>
              <p className="text-sm text-indigo-800 ml-6">
                Scheduled for: <span className="font-semibold">{formatDateTime(appointment.followUpDate).date}</span> at <span className="font-semibold">{formatDateTime(appointment.followUpDate).time}</span>
              </p>
            </div>
          )}

          {/* Detailed Lists */}
          {appointment.questions && appointment.questions.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <FileText size={16} className="text-amber-500"/> Questions to ask
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1.5 pl-4 marker:text-amber-300">
                {appointment.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {appointment.observations && appointment.observations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Stethoscope size={16} className="text-blue-500"/> Observations
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1.5 pl-4 marker:text-blue-300">
                {appointment.observations.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {appointment.diagnoses && appointment.diagnoses.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Activity size={16} className="text-rose-500"/> Diagnoses
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1.5 pl-4 marker:text-rose-300">
                {appointment.diagnoses.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {appointment.recommendations && appointment.recommendations.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-500"/> Recommendations
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1.5 pl-4 marker:text-emerald-300">
                {appointment.recommendations.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}

          {appointment.prescribedMedications && appointment.prescribedMedications.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Pill size={16} className="text-purple-500"/> Prescribed Medications
              </h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 ml-1.5 pl-4 marker:text-purple-300">
              {appointment.prescribedMedications.map((m: any, i) => (
                <li key={i}>
                  <span className="font-medium text-gray-900">{m.name || "Medication"}</span>
                  {(m.dose || m.frequency) ? (
                    <span className="text-gray-500 ml-1">
                      - {[m.dose, m.frequency].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </li>
              ))}
              </ul>
            </div>
          )}

          {appointment.medicalRecordIds && appointment.medicalRecordIds.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Paperclip size={16} className="text-slate-500"/> Linked Records
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {appointment.medicalRecordIds.map((id, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                    Record #{id.split('-')[1] || id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {appointment.attachedFiles && appointment.attachedFiles.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                <Paperclip size={16} className="text-slate-500"/> Attached Files
              </h3>
              <div className="flex flex-col gap-2 mt-2">
                {appointment.attachedFiles.map((file, i) => (
                  <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 text-slate-700 text-sm font-medium border border-slate-200 hover:bg-slate-100 transition-colors">
                    <FileText size={16} className="text-indigo-500" />
                    <span className="truncate">{file.name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {isActive && (
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => onMarkComplete(appointment)}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-6 rounded-full transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Mark as Completed
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}