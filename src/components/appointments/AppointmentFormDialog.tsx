import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { X, Loader2, Plus, Trash2 } from 'lucide-react';
import type { Appointment } from '../../models/appointment';
import type { Medication } from '../../models/medication';
import FileChooser from '../common/FileChooser';
import { uploadReportToGoogleDrive } from '../../services/medical-records/reportsService';
import FileUploadProgressModal, { type FileStatus } from '../common/FileUploadProgressModal';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';

interface AppointmentFormDialogProps {
  initialValues?: Partial<Appointment>;
  mode?: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (data: Partial<Appointment>) => void | Promise<void>;
}

const formatForDatetimeLocal = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const inputClass =
  'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100';

export default function AppointmentFormDialog({ initialValues, mode = 'create', onClose, onSubmit }: AppointmentFormDialogProps) {
  const { id: profileId } = useParams<{ id: string }>();
  const { user } = useAuth();

  const titleId = useId();
  const isEditing = mode === 'edit';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const isCompleted = initialValues?.status === 'completed';

  const [form, setForm] = useState({
    reason: initialValues?.reason || '',
    scheduledAt: formatForDatetimeLocal(initialValues?.scheduledAt),
    doctorName: initialValues?.doctorName || '',
    specialty: initialValues?.specialty || '',
    hospital: initialValues?.hospital || '',
    questions: initialValues?.questions ? initialValues.questions.join('\n') : '',
    observations: initialValues?.observations ? initialValues.observations.join('\n') : '',
    diagnoses: initialValues?.diagnoses ? initialValues.diagnoses.join('\n') : '',
    recommendations: initialValues?.recommendations ? initialValues.recommendations.join('\n') : '',
    completedAt: formatForDatetimeLocal(initialValues?.completedAt),
    followUpDate: formatForDatetimeLocal(initialValues?.followUpDate),
  });

  const [prescribedMedications, setPrescribedMedications] = useState<Partial<Medication>[]>(
    initialValues?.prescribedMedications?.length ? initialValues.prescribedMedications : [{ name: '', dose: '', frequency: '' }]
  );

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...prescribedMedications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setPrescribedMedications(newMeds);
  };

  const addMedication = () => setPrescribedMedications([...prescribedMedications, { name: '', dose: '', frequency: '' }]);
  const removeMedication = (index: number) => setPrescribedMedications(prescribedMedications.filter((_, i) => i !== index));

  const [files, setFiles] = useState<File[]>([]);

  const update = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    if (!user?.uid || !profileId) return;
    event.preventDefault();
    setIsSubmitting(true);
    
    try {
      const uploadedFilesMetadata = [];
      if (files.length > 0) {
        setFileStatuses(files.map(f => ({ name: f.name, status: 'pending' })));
        setIsUploading(true);
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileStatuses(prev => {
          const next = [...prev];
          next[i].status = 'uploading';
          return next;
        });
        try {
          const url = await uploadReportToGoogleDrive(user?.uid, profileId, file);
          uploadedFilesMetadata.push({ name: file.name, url });
          setFileStatuses(prev => {
            const next = [...prev];
            next[i].status = 'done';
            return next;
          });
        } catch (error) {
          setFileStatuses(prev => {
            const next = [...prev];
            next[i].status = 'error';
            return next;
          });
          throw error;
        }
      }
      setIsUploading(false);

      const scheduledAt = form.scheduledAt 
        ? new Date(form.scheduledAt).toISOString()
        : new Date().toISOString();

      const questions = form.questions
        .split('\n')
        .map(q => q.trim())
        .filter(q => q.length > 0);

      const baseData: Partial<Appointment> = {
        ...initialValues,
        reason: form.reason,
        scheduledAt,
        doctorName: form.doctorName,
        specialty: form.specialty,
        hospital: form.hospital,
        questions,
        status: initialValues?.status || 'scheduled',
        attachedFiles: initialValues?.attachedFiles ? [...initialValues.attachedFiles, ...uploadedFilesMetadata] : uploadedFilesMetadata,
      };

      if (isCompleted) {
        Object.assign(baseData, {
          observations: form.observations.split('\n').filter(Boolean),
          diagnoses: form.diagnoses.split('\n').filter(Boolean),
          recommendations: form.recommendations.split('\n').filter(Boolean),
          prescribedMedications: prescribedMedications.filter(m => m.name) as Medication[],
          completedAt: form.completedAt ? new Date(form.completedAt).toISOString() : new Date().toISOString(),
          followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : null,
        });
      }

      await onSubmit(baseData as any);
    } catch (error) {
      console.error('Failed to save appointment or upload files:', error);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
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
              {isEditing ? 'Edit Visit' : 'Schedule Visit'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isEditing ? 'Update details for this appointment.' : 'Track your upcoming appointments and questions for the doctor.'}
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

        <FileUploadProgressModal isOpen={isUploading} files={fileStatuses} />

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
          disabled={isCompleted}
          className={`${inputClass} ${isCompleted ? 'cursor-not-allowed opacity-60' : ''}`}
            />
        {isCompleted && (
          <p className="mt-1 text-xs text-amber-600">Scheduled time cannot be changed for completed appointments.</p>
        )}
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

          {isCompleted && (
            <div className="border-t border-gray-100 pt-5 mt-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Visit Details</h3>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor={`${titleId}-completedAt`} className="text-sm font-medium text-gray-800">
                    Completed At
                  </label>
                  <input
                    id={`${titleId}-completedAt`}
                    type="datetime-local"
                    required
                    value={form.completedAt}
                    onChange={(e) => update('completedAt', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor={`${titleId}-observations`} className="text-sm font-medium text-gray-800">Observations</label>
                  <textarea id={`${titleId}-observations`} value={form.observations} onChange={(e) => update('observations', e.target.value)} placeholder="Fetal heart rate was normal..." className={`${inputClass} min-h-[100px] resize-y`} />
                </div>
                <div>
                  <label htmlFor={`${titleId}-diagnoses`} className="text-sm font-medium text-gray-800">Diagnoses</label>
                  <textarea id={`${titleId}-diagnoses`} value={form.diagnoses} onChange={(e) => update('diagnoses', e.target.value)} placeholder="Healthy ongoing pregnancy..." className={`${inputClass} min-h-[100px] resize-y`} />
                </div>
                <div>
                  <label htmlFor={`${titleId}-recommendations`} className="text-sm font-medium text-gray-800">Recommendations</label>
                  <textarea id={`${titleId}-recommendations`} value={form.recommendations} onChange={(e) => update('recommendations', e.target.value)} placeholder="Continue prenatal vitamins..." className={`${inputClass} min-h-[100px] resize-y`} />
                </div>

                <div className="rounded-2xl border border-purple-100 bg-purple-50/60 p-4">
                  <p className="text-sm font-semibold text-gray-800">Prescribed Medications</p>
                  <div className="mt-4 space-y-3">
                    {prescribedMedications.map((med, index) => (
                      <div key={index} className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 items-center bg-white p-3 rounded-xl border border-purple-100 shadow-sm">
                        <input value={med.name || ''} onChange={(e) => handleMedicationChange(index, 'name', e.target.value)} placeholder="Medication Name" className={inputClass + ' mt-0'} />
                        <input value={med.dose || ''} onChange={(e) => handleMedicationChange(index, 'dose', e.target.value)} placeholder="Dosage (e.g., 200mg)" className={inputClass + ' mt-0'} />
                        <div className="flex items-center gap-2">
                          <input value={med.frequency || ''} onChange={(e) => handleMedicationChange(index, 'frequency', e.target.value)} placeholder="Frequency (e.g., daily)" className={inputClass + ' mt-0'} />
                          <button type="button" onClick={() => removeMedication(index)} className="shrink-0 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors" aria-label="Remove medication">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addMedication} className="mt-4 flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900">
                    <Plus size={16} /> Add Medication
                  </button>
                </div>

                <div>
                  <label htmlFor={`${titleId}-followUp`} className="text-sm font-medium text-gray-800">
                    Follow-up Appointment
                  </label>
                  <input
                    id={`${titleId}-followUp`}
                    type="datetime-local"
                    value={form.followUpDate}
                    onChange={(e) => update('followUpDate', e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          )}

          <FileChooser 
            files={files} 
            onFilesChange={setFiles} 
            label="Attached Reports"
            description="Add reports or test results to discuss." 
          />

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-70">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}