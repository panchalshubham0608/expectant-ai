import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pill, Edit3, Loader2 } from 'lucide-react';
import type { Medication } from '../../../models/medication';
import ActiveMedicationsFormDialog from './ActiveMedicationsFormDialog';
import { useAuth } from '../../../auth/useAuth';
import { subscribeToMedications, syncMedicationsList } from '../../../services/medication/medicationService';

export default function ActiveMedicationsCard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid || !id) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = subscribeToMedications(
      user.uid,
      id,
      (fetchedMedications) => {
        setMedications(fetchedMedications);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching medications:', err);
        setError('Failed to load medications.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, id]);

  const handleSave = async (updatedMedications: Medication[]) => {
    if (!user?.uid || !id) return;
    try {
      await syncMedicationsList(user.uid, id, updatedMedications);
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to save medications:', err);
    }
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
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
        >
          <Edit3 size={16} />
          <span>Edit</span>
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="animate-spin text-purple-500" size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : medications.length > 0 ? (
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