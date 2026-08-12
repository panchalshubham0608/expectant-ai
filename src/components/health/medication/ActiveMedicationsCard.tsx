import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Pill, Edit3, Loader2, Clock, Calendar, Info, XCircle, RotateCcw, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Medication } from '../../../models/medication';
import ActiveMedicationsFormDialog from './ActiveMedicationsFormDialog';
import DiscontinueMedicationDialog from './DiscontinueMedicationDialog';
import DeleteMedicationDialog from './DeleteMedicationDialog';
import ContinueMedicationDialog from './ContinueMedicationDialog';
import { useAuth } from '../../../hooks/useAuth';
import { subscribeToMedications, syncMedicationsList, deleteMedication, discontinueMedication, resumeMedication } from '../../../services/medication/medicationService';

export default function ActiveMedicationsCard() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [medicationToDiscontinue, setMedicationToDiscontinue] = useState<Medication | null>(null);
  const [medicationToDelete, setMedicationToDelete] = useState<Medication | null>(null);
  const [medicationToResume, setMedicationToResume] = useState<Medication | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeMedications = medications.filter((m) => !m.discontinued);
  const discontinuedMedications = medications.filter((m) => m.discontinued);

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
      const toSync = [...updatedMedications, ...discontinuedMedications];
      await syncMedicationsList(user.uid, id, toSync);
      setIsEditOpen(false);
    } catch (err) {
      console.error('Failed to save medications:', err);
    }
  };

  const handleDiscontinue = async (med: Medication, date: string) => {
    if (!user?.uid || !id) return;
    try {
      await discontinueMedication(user.uid, id, med, date);
    } catch (err) {
      console.error('Failed to discontinue medication:', err);
    }
  };

  const handleResume = async (med: Medication, date: string) => {
    if (!user?.uid || !id) return;
    try {
      await resumeMedication(user.uid, id, med, date);
    } catch (err) {
      console.error('Failed to resume medication:', err);
    }
  };

  const handleDelete = async (medId: string) => {
    if (!user?.uid || !id) return;
    try {
      await deleteMedication(user.uid, id, medId);
    } catch (err) {
      console.error('Failed to delete medication:', err);
    }
  };

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-sm ring-1 ring-gray-100">
      <div 
        className="flex cursor-pointer select-none items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Pill className="text-purple-500" size={20} />
          Active Medications
        </h3>
        <div className="flex items-center gap-3">
          {isExpanded && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditOpen(true);
              }}
              disabled={isLoading}
              className="flex items-center gap-1.5 rounded-full bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 transition hover:bg-purple-100 disabled:opacity-50"
            >
              <Edit3 size={16} />
              <span>Edit</span>
            </button>
          )}
          {isExpanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5">
      {isLoading ? (
        <div className="flex justify-center p-6">
          <Loader2 className="animate-spin text-purple-500" size={24} />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <>
          {activeMedications.length > 0 ? (
            <div className="space-y-4">
              {activeMedications.map((med) => (
            <div
              key={med.id}
              className="relative flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-purple-50/50 to-white p-4 ring-1 ring-purple-100/50"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex-1 pt-0.5">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{med.name}</h4>
                    {(med.dose || med.frequency || med.duration) && (
                      <>
                        {med.dose && (
                          <span className="inline-flex items-center rounded-md bg-white px-2 py-1 text-xs font-semibold text-purple-700 shadow-sm ring-1 ring-purple-200/50">
                            {med.dose}
                          </span>
                        )}
                        {med.frequency && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50">
                            <Clock size={12} className="text-slate-400" />
                            {med.frequency}
                          </span>
                        )}
                        {med.duration && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200/50">
                            <Calendar size={12} className="text-slate-400" />
                            {med.duration}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  
                  {med.startedAt && (
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Started on {new Date(med.startedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {med.continuedAt && !med.startedAt && (
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      Continued on {new Date(med.continuedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                        onClick={() => setMedicationToDiscontinue(med)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-orange-50 hover:text-orange-600"
                        title="Discontinue Medication"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
              </div>
              {med.instructions && (
                <div className="mt-1 flex items-start gap-2.5 rounded-xl bg-white/60 px-3 py-2.5 text-sm text-slate-600 ring-1 ring-inset ring-slate-200/50">
                  <Info className="mt-0.5 shrink-0 text-slate-400" size={16} />
                  <p className="leading-relaxed">{med.instructions}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
          No active medications
        </div>
      )}

          {discontinuedMedications.length > 0 && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Past Medications</h4>
              <div className="space-y-3">
                {discontinuedMedications.map((med) => (
                  <div
                    key={med.id}
                    className="relative flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4 opacity-75 ring-1 ring-slate-100 transition-opacity hover:opacity-100"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h4 className="font-medium text-slate-700 line-through decoration-slate-300">{med.name}</h4>
                          {(med.dose || med.frequency) && (
                            <div className="flex items-center gap-1.5">
                              {med.dose && <span className="text-xs text-slate-500">{med.dose}</span>}
                              {med.dose && med.frequency && <span className="text-xs text-slate-400">•</span>}
                              {med.frequency && <span className="text-xs text-slate-500">{med.frequency}</span>}
                            </div>
                          )}
                        </div>
                        {med.discontinuedAt && (
                          <p className="mt-1 text-xs text-slate-400">
                            Discontinued on {new Date(med.discontinuedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => setMedicationToResume(med)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-green-50 hover:text-green-600"
                        title="Resume Medication"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => setMedicationToDelete(med)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete Permanently"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
        </div>
      )}

      {isEditOpen && (
        <ActiveMedicationsFormDialog
          initialMedications={activeMedications}
          onClose={() => setIsEditOpen(false)}
          onSubmit={handleSave}
        />
      )}

      {medicationToDiscontinue && (
        <DiscontinueMedicationDialog
          medication={medicationToDiscontinue}
          onClose={() => setMedicationToDiscontinue(null)}
          onConfirm={(date) => {
            handleDiscontinue(medicationToDiscontinue, date);
            setMedicationToDiscontinue(null);
          }}
        />
      )}

      {medicationToResume && (
        <ContinueMedicationDialog
          medication={medicationToResume}
          onClose={() => setMedicationToResume(null)}
          onConfirm={(date) => {
            handleResume(medicationToResume, date);
            setMedicationToResume(null);
          }}
        />
      )}

      {medicationToDelete && (
        <DeleteMedicationDialog
          medication={medicationToDelete}
          onClose={() => setMedicationToDelete(null)}
          onConfirm={() => {
            handleDelete(medicationToDelete.id);
            setMedicationToDelete(null);
          }}
        />
      )}
    </div>
  );
}