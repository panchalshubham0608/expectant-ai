import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import {
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Stethoscope,
  X,
} from 'lucide-react';
import type { ChatSuggestedAppointment } from '../../services/ai/journalChatService';

interface ChatAppointmentFormCardProps {
  initialDraft: ChatSuggestedAppointment;
  onSave: (draft: ChatSuggestedAppointment) => Promise<string | void>;
  onDismiss?: (draft: ChatSuggestedAppointment) => Promise<void> | void;
}

const getDefaultLocalDatetime = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}T10:00`;
};

const formatForDatetimeLocal = (dateString?: string): string => {
  if (!dateString) return getDefaultLocalDatetime();
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return getDefaultLocalDatetime();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatDisplayDateTime = (dateString?: string): { date: string; time: string } => {
  if (!dateString) return { date: 'Upcoming', time: '' };
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return { date: dateString, time: '' };
  return {
    date: new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date),
    time: new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date),
  };
};

const inputClass =
  'mt-1 w-full rounded-xl border border-emerald-200/90 bg-white px-3 py-2 text-xs text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:bg-gray-50 disabled:opacity-60';

function ChatAppointmentFormCard({
  initialDraft,
  onSave,
  onDismiss,
}: ChatAppointmentFormCardProps) {
  const fieldId = useId();
  const [reason, setReason] = useState(initialDraft.reason || '');
  const [scheduledAt, setScheduledAt] = useState(
    formatForDatetimeLocal(initialDraft.scheduledAt)
  );
  const [doctorName, setDoctorName] = useState(initialDraft.doctorName || '');
  const [specialty, setSpecialty] = useState(initialDraft.specialty || '');
  const [hospital, setHospital] = useState(initialDraft.hospital || '');
  const [questionsText, setQuestionsText] = useState(
    (initialDraft.questions ?? []).join('\n')
  );

  const [savedId, setSavedId] = useState<string | undefined>(
    initialDraft.savedAppointmentId
  );
  const [isDismissed, setIsDismissed] = useState<boolean>(
    Boolean(initialDraft.dismissed)
  );
  const [hasUserEdited, setHasUserEdited] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!hasUserEdited) {
      if (initialDraft.reason) {
        setReason(initialDraft.reason);
      }
      if (initialDraft.doctorName) {
        setDoctorName(initialDraft.doctorName);
      }
      if (initialDraft.hospital) {
        setHospital(initialDraft.hospital);
      }
      if (initialDraft.specialty) {
        setSpecialty(initialDraft.specialty);
      }
      if (initialDraft.questions && initialDraft.questions.length > 0) {
        setQuestionsText(initialDraft.questions.join('\n'));
      }
      if (initialDraft.scheduledAt) {
        setScheduledAt(formatForDatetimeLocal(initialDraft.scheduledAt));
      }
    }
    if (initialDraft.savedAppointmentId) {
      setSavedId(initialDraft.savedAppointmentId);
    }
    if (typeof initialDraft.dismissed === 'boolean') {
      setIsDismissed(initialDraft.dismissed);
    }
  }, [
    hasUserEdited,
    initialDraft.reason,
    initialDraft.doctorName,
    initialDraft.hospital,
    initialDraft.specialty,
    initialDraft.scheduledAt,
    initialDraft.savedAppointmentId,
    initialDraft.dismissed,
    initialDraft.questions,
  ]);

  const isSaved = Boolean(savedId || initialDraft.savedAppointmentId);

  const parsedQuestions = questionsText
    .split('\n')
    .map((q) => q.trim())
    .filter(Boolean);

  const handleDismiss = async () => {
    if (isSubmitting || isSaved) return;
    setIsDismissed(true);
    try {
      await onDismiss?.({
        ...initialDraft,
        reason: reason.trim() || initialDraft.reason,
        doctorName: doctorName.trim() || initialDraft.doctorName,
        specialty: specialty.trim() || initialDraft.specialty,
        hospital: hospital.trim() || initialDraft.hospital,
        questions: parsedQuestions,
        dismissed: true,
      });
    } catch {
      // Non-fatal if persistence of dismissal fails
    }
  };

  const handleReopen = async () => {
    setIsDismissed(false);
    try {
      await onDismiss?.({
        ...initialDraft,
        reason: reason.trim() || initialDraft.reason,
        doctorName: doctorName.trim() || initialDraft.doctorName,
        specialty: specialty.trim() || initialDraft.specialty,
        hospital: hospital.trim() || initialDraft.hospital,
        questions: parsedQuestions,
        dismissed: false,
      });
    } catch {
      // Non-fatal
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || isSaved) return;

    const trimmedReason = reason.trim();
    const trimmedDoctor = doctorName.trim();
    if (!trimmedReason || !trimmedDoctor || !scheduledAt) {
      setErrorMessage('Please fill in the visit reason, date & time, and doctor name.');
      return;
    }

    const parsedDate = new Date(scheduledAt);
    if (Number.isNaN(parsedDate.getTime())) {
      setErrorMessage('Please enter a valid date and time for the appointment.');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updatedDraft: ChatSuggestedAppointment = {
        reason: trimmedReason,
        scheduledAt: parsedDate.toISOString(),
        doctorName: trimmedDoctor,
        specialty: specialty.trim() || undefined,
        hospital: hospital.trim() || undefined,
        questions: parsedQuestions,
        dismissed: false,
      };

      const createdId = await onSave(updatedDraft);
      setSavedId(typeof createdId === 'string' && createdId ? createdId : 'saved');
    } catch {
      setErrorMessage('Could not save the appointment right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSaved) {
    const displayIso = scheduledAt
      ? new Date(scheduledAt).toISOString()
      : initialDraft.scheduledAt;
    const { date, time } = formatDisplayDateTime(displayIso);

    return (
      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/75 p-3.5 text-gray-800 shadow-2xs">
        <div className="flex items-center gap-2 text-emerald-800">
          <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
          <span className="text-xs font-semibold">Appointment Scheduled</span>
        </div>

        <div className="mt-2.5 rounded-xl bg-white/90 p-3 ring-1 ring-emerald-100">
          <p className="text-sm font-bold text-gray-900">{reason.trim()}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} className="text-emerald-600" />
              {date}
            </span>
            {time && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} className="text-emerald-600" />
                {time}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Stethoscope size={13} className="text-emerald-600" />
              {doctorName.trim()}
              {specialty.trim() ? ` (${specialty.trim()})` : ''}
            </span>
            {hospital.trim() && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={13} className="text-emerald-600" />
                {hospital.trim()}
              </span>
            )}
          </div>

          {parsedQuestions.length > 0 && (
            <div className="mt-2.5 border-t border-gray-100 pt-2">
              <p className="text-[11px] font-semibold text-gray-500">
                Questions saved for visit ({parsedQuestions.length}):
              </p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-gray-700">
                {parsedQuestions.map((question, index) => (
                  <li key={index}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isDismissed) {
    return (
      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-gray-200/80 bg-gray-50/80 px-3 py-2 text-xs text-gray-500">
        <span>Appointment scheduling skipped for now.</span>
        <button
          type="button"
          onClick={handleReopen}
          className="font-semibold text-emerald-700 transition hover:text-emerald-800 hover:underline"
        >
          Schedule anyway
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 rounded-2xl border border-emerald-200/90 bg-[#f6fcf8] p-3.5 text-gray-800 shadow-2xs sm:p-4"
    >
      <div className="flex items-start justify-between gap-2 border-b border-emerald-100 pb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <CalendarPlus size={15} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Schedule Visit</h4>
            <p className="text-[11px] text-gray-500">
              Pre-filled from your profile & records — review or edit before saving.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          aria-label="Dismiss appointment form"
          className="rounded-full p-1 text-gray-400 transition hover:bg-emerald-100/60 hover:text-gray-600 disabled:opacity-50"
        >
          <X size={15} />
        </button>
      </div>

      {errorMessage && (
        <div className="mt-2.5 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
          {errorMessage}
        </div>
      )}

      <div className="mt-3 space-y-2.5">
        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-reason`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Reason for Visit <span className="text-red-500">*</span>
            </label>
            <input
              id={`${fieldId}-reason`}
              type="text"
              required
              disabled={isSubmitting}
              value={reason}
              onChange={(e) => {
                setHasUserEdited(true);
                setReason(e.target.value);
              }}
              placeholder="e.g., 20-Week Scan"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-datetime`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              id={`${fieldId}-datetime`}
              type="datetime-local"
              required
              disabled={isSubmitting}
              value={scheduledAt}
              onChange={(e) => {
                setHasUserEdited(true);
                setScheduledAt(e.target.value);
              }}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label
              htmlFor={`${fieldId}-doctor`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Doctor Name <span className="text-red-500">*</span>
            </label>
            <input
              id={`${fieldId}-doctor`}
              type="text"
              required
              disabled={isSubmitting}
              value={doctorName}
              onChange={(e) => {
                setHasUserEdited(true);
                setDoctorName(e.target.value);
              }}
              placeholder="Dr. Smith"
              className={inputClass}
            />
          </div>

          <div>
            <label
              htmlFor={`${fieldId}-specialty`}
              className="block text-[11px] font-semibold text-gray-700"
            >
              Specialty
            </label>
            <input
              id={`${fieldId}-specialty`}
              type="text"
              disabled={isSubmitting}
              value={specialty}
              onChange={(e) => {
                setHasUserEdited(true);
                setSpecialty(e.target.value);
              }}
              placeholder="OB-GYN"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-hospital`}
            className="block text-[11px] font-semibold text-gray-700"
          >
            Hospital / Clinic
          </label>
          <input
            id={`${fieldId}-hospital`}
            type="text"
            disabled={isSubmitting}
            value={hospital}
            onChange={(e) => {
              setHasUserEdited(true);
              setHospital(e.target.value);
            }}
            placeholder="Clinic or Hospital Name"
            className={inputClass}
          />
        </div>

        <div>
          <label
            htmlFor={`${fieldId}-questions`}
            className="block text-[11px] font-semibold text-gray-700"
          >
            Questions to Ask (one per line)
          </label>
          <textarea
            id={`${fieldId}-questions`}
            rows={3}
            disabled={isSubmitting}
            value={questionsText}
            onChange={(e) => {
              setHasUserEdited(true);
              setQuestionsText(e.target.value);
            }}
            placeholder="Add any questions you want to ask your doctor..."
            className={`${inputClass} resize-y leading-relaxed`}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-emerald-100 pt-2.5">
        <button
          type="button"
          onClick={handleDismiss}
          disabled={isSubmitting}
          className="rounded-full px-3.5 py-2 text-xs font-semibold text-gray-600 transition hover:bg-emerald-100/60 hover:text-gray-800 disabled:opacity-50"
        >
          Not now
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Scheduling...</span>
            </>
          ) : (
            <>
              <CalendarPlus size={13} />
              <span>Save Appointment</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ChatAppointmentFormCard;
