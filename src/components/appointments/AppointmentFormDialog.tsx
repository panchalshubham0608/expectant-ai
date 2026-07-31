import React, { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Appointment } from '../../models/doctorVisit';

interface AppointmentFormDialogProps {
  onClose: () => void;
  onSubmit: (data: Partial<Appointment>) => void;
}

const inputClass =
  'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100';

export default function AppointmentFormDialog({ onClose, onSubmit }: AppointmentFormDialogProps) {
  const titleId = useId();
  const [form, setForm] = useState({
    reason: '',
    scheduledAt: '',
    doctorName: '',
    specialty: '',
    hospital: '',
    questions: '',
  });

  const update = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    const scheduledAt = form.scheduledAt 
      ? new Date(form.scheduledAt).toISOString()
      : new Date().toISOString();

    const questions = form.questions
      .split('\n')
      .map(q => q.trim())
      .filter(q => q.length > 0);

    onSubmit({
      reason: form.reason,
      scheduledAt,
      doctorName: form.doctorName,
      specialty: form.specialty,
      hospital: form.hospital,
      questions,
      status: 'scheduled',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="max-h-[84dvh] w-full max-w-xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-medium text-indigo-700">Expectant AI</p>
            <h2 id={titleId} className="mt-1 text-2xl font-semibold text-gray-900">
              Schedule Visit
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Track your upcoming appointments and questions for the doctor.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close form"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <label htmlFor={`${titleId}-reason`} className="text-sm font-medium text-gray-800">
              Reason for Visit <span className="text-red-500">*</span>
            </label>
            <input
              id={`${titleId}-reason`}
              required
              placeholder="e.g., 20-Week Scan"
              value={form.reason}
              onChange={(event) => update('reason', event.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-date`} className="text-sm font-medium text-gray-800">
              Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              id={`${titleId}-date`}
              type="datetime-local"
              required
              value={form.scheduledAt}
              onChange={(event) => update('scheduledAt', event.target.value)}
              className={inputClass}
            />
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
            <p className="text-sm font-semibold text-gray-800">Location & Provider</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${titleId}-doctor`} className="text-sm font-medium text-gray-700">
                  Doctor Name <span className="text-red-500">*</span>
                </label>
                <input 
                  id={`${titleId}-doctor`} 
                  required
                  value={form.doctorName} 
                  onChange={(e) => update('doctorName', e.target.value)} 
                  placeholder="Dr. Smith" 
                  className={inputClass} 
                />
              </div>
              <div>
                <label htmlFor={`${titleId}-specialty`} className="text-sm font-medium text-gray-700">Specialty</label>
                <input id={`${titleId}-specialty`} value={form.specialty} onChange={(e) => update('specialty', e.target.value)} placeholder="OB-GYN" className={inputClass} />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor={`${titleId}-hospital`} className="text-sm font-medium text-gray-700">Hospital / Clinic</label>
                <input id={`${titleId}-hospital`} value={form.hospital} onChange={(e) => update('hospital', e.target.value)} placeholder="Medical Center" className={inputClass} />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor={`${titleId}-questions`} className="text-sm font-medium text-gray-800">
              Questions to ask
            </label>
            <textarea
              id={`${titleId}-questions`}
              value={form.questions}
              onChange={(event) => update('questions', event.target.value)}
              placeholder="List any questions you want to remember..."
              className={`${inputClass} min-h-[100px] resize-y`}
            />
            <p className="mt-2 text-xs leading-5 text-gray-500">Put each question on a new line.</p>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" className="rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700">
              Save Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}