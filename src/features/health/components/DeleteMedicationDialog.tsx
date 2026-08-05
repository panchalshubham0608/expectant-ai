import { useId } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Medication } from '../../../models/medication';

interface DeleteMedicationDialogProps {
  medication: Medication;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteMedicationDialog({
  medication,
  onClose,
  onConfirm,
}: DeleteMedicationDialogProps) {
  const titleId = useId();

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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle size={20} />
            </div>
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">Delete Medication</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900" aria-label="Close dialog">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <p className="mb-5 text-sm text-gray-600">
            Are you sure you want to permanently delete <strong>{medication.name}</strong> from your history? This action cannot be undone.
          </p>
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">Cancel</button>
            <button type="button" onClick={onConfirm} className="rounded-full bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700">Delete Permanently</button>
          </div>
        </div>
      </div>
    </div>
  );
}