import { useId, useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import type { Medication } from '../../../models/medication';

interface ActiveMedicationsFormDialogProps {
  initialMedications: Medication[];
  onClose: () => void;
  onSubmit: (medications: Medication[]) => void;
}

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-purple-600 focus:bg-white focus:ring-4 focus:ring-purple-100';

const formatDateForInput = (isoString?: string) => {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

export default function ActiveMedicationsFormDialog({
  initialMedications,
  onClose,
  onSubmit,
}: ActiveMedicationsFormDialogProps) {
  const titleId = useId();
  const [medications, setMedications] = useState<Partial<Medication>[]>(
    initialMedications.length > 0
      ? initialMedications
      : [{ name: '', dose: '', frequency: '', duration: '', instructions: '', startedAt: '' }]
  );

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedications(newMeds);
  };

  const addMedication = () => {
    setMedications([
      ...medications,
      { name: '', dose: '', frequency: '', duration: '', instructions: '', startedAt: '' },
    ]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty medications and ensure they adhere to the Medication type
    const validMedications = medications.filter((m) => m.name?.trim()) as Medication[];
    
    // Ensure all medications have an ID
    const completeMedications = validMedications.map((m) => ({
      ...m,
      id: m.id || crypto.randomUUID(),
    }));

    onSubmit(completeMedications);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="max-h-[84dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold text-gray-900">
              Active Medications
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Update your current active medications and dosages.
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <div className="space-y-4">
            {medications.map((med, index) => (
              <div key={index} className="relative rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-700">Medication {index + 1}</h4>
                  <button type="button" onClick={() => removeMedication(index)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" aria-label="Remove medication">
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <input required value={med.name || ''} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} placeholder="Medication Name (e.g. Prenatal Vitamins)" className={inputClass} />
                  </div>
                  <input value={med.dose || ''} onChange={(e) => handleMedicationChange(index, 'dose', e.target.value)} placeholder="Dose (e.g. 1 tablet)" className={inputClass} />
                  <input value={med.frequency || ''} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="Frequency (e.g. Daily)" className={inputClass} />
                  <input value={med.duration || ''} onChange={(e) => handleMedicationChange(index, 'duration', e.target.value)} placeholder="Duration (e.g. 3 months)" className={inputClass} />
                  <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 transition focus-within:border-purple-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-purple-100">
                    <span className="mr-2 text-sm text-gray-500 whitespace-nowrap">Started:</span>
                    <input
                      type="date"
                      value={formatDateForInput(med.startedAt || med.continuedAt)}
                      onChange={(e) => handleMedicationChange(index, 'startedAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                      className="w-full bg-transparent text-sm outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input value={med.instructions || ''} onChange={(e) => handleMedicationChange(index, 'instructions', e.target.value)} placeholder="Instructions (e.g. Take with food)" className={inputClass} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" onClick={addMedication} className="mt-5 flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900 transition-colors">
            <Plus size={18} /> Add Another Medication
          </button>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700">
              Save Medications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}