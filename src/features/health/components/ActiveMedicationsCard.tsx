import { useState } from 'react';
import { Pill, Edit3 } from 'lucide-react';
import type { Medication } from '../../../models/medication';
import ActiveMedicationsFormDialog from './ActiveMedicationsFormDialog';

const initialMockMedications: Medication[] = [
  {
    id: 'm1',
    name: 'Prenatal Vitamins',
    dose: '1 tablet',
    frequency: 'Daily',
    instructions: 'Take with food to prevent nausea',
  },
  {
    id: 'm2',
    name: 'Iron Supplement',
    dose: '65 mg',
    frequency: 'Every other day',
    duration: '3 months',
  },
];

export default function ActiveMedicationsCard() {
  const [medications, setMedications] = useState<Medication[]>(initialMockMedications);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSave = (updatedMedications: Medication[]) => {
    setMedications(updatedMedications);
    setIsEditOpen(false);
  };

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Pill className="text-purple-500" size={20} />
          Active Medications
        </h3>
        <button
          onClick={() => setIsEditOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100"
        >
          <Edit3 size={16} />
          <span>Edit</span>
        </button>
      </div>
      {medications.length > 0 ? (
        <div className="space-y-4">
          {medications.map((med) => (
            <div
              key={med.id}
              className="flex items-start justify-between rounded-2xl bg-purple-50/50 p-4"
            >
              <div>
                <p className="font-semibold text-gray-900">{med.name}</p>
                {(med.dose || med.frequency || med.duration) && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                    {med.dose && <span>{med.dose}</span>}
                    {med.dose && med.frequency && <span>•</span>}
                    {med.frequency && <span>{med.frequency}</span>}
                    {(med.dose || med.frequency) && med.duration && <span>•</span>}
                    {med.duration && <span>For {med.duration}</span>}
                  </div>
                )}
                {med.instructions && (
                  <p className="mt-2 text-sm italic text-gray-600">{med.instructions}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No active medications
        </div>
      )}

      {isEditOpen && (
        <ActiveMedicationsFormDialog
          initialMedications={medications}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleSave}
        />
      )}
    </div>
  );
}