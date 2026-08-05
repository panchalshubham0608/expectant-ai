import { useId, useState } from 'react';
import { X } from 'lucide-react';
import type { Medication } from '../../../models/medication';

interface ContinueMedicationDialogProps {
  medication: Medication;
  onClose: () => void;
  onConfirm: (date: string) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100';

export default function ContinueMedicationDialog({
  medication,
  onClose,
  onConfirm,
}: ContinueMedicationDialogProps) {
  const titleId = useId();
  // Default to today's date in local time for the input[type="date"] format YYYY-MM-DD
  const [date, setDate] = useState(() => {
    const today = new Date();
    return new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .split('T')[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(new Date(date).toISOString());
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] bg-[#faf9f6] shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
              Resume Medication
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <p className="mb-5 text-sm text-gray-600">
            Are you sure you want to resume <strong>{medication.name}</strong>? Please select the date of continuation.
          </p>

          <div className="space-y-2">
            <label htmlFor="continueDate" className="block text-sm font-medium text-gray-700">
              Continuation Date
            </label>
            <input id="continueDate" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">Cancel</button>
            <button type="submit" className="rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}