import { useId, useState } from 'react';
import type { FormEvent } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import type { Appointment } from '../../models/appointment';
import type { Medication } from '../../models/medication';
import FileChooser from '../common/FileChooser';
import { uploadReportToGoogleDrive } from '../../services/medical-records/reportsService';
import FileUploadProgressModal, { type FileStatus } from '../common/FileUploadProgressModal';

interface CompleteAppointmentFormDialogProps {
  appointment: Appointment;
  onClose: () => void;
  onSubmit: (data: Partial<Appointment>) => void | Promise<void>;
}

const inputClass = 'mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100';
const textareaClass = `${inputClass} min-h-[100px] resize-y`;

export default function CompleteAppointmentFormDialog({ appointment, onClose, onSubmit }: CompleteAppointmentFormDialogProps) {
  const titleId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const [observations, setObservations] = useState('');
  const [diagnoses, setDiagnoses] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [completionDate, setCompletionDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  });
  const [followUpDate, setFollowUpDate] = useState('');
  const [prescribedMedications, setPrescribedMedications] = useState<Partial<Medication>[]>([{ name: '', dose: '', frequency: '' }]);

  const [files, setFiles] = useState<File[]>([]);

  const handleMedicationChange = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...prescribedMedications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setPrescribedMedications(newMeds);
  };

  const addMedication = () => {
    setPrescribedMedications([...prescribedMedications, { name: '', dose: '', frequency: '' }]);
  };

  const removeMedication = (index: number) => {
    setPrescribedMedications(prescribedMedications.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
          const url = await uploadReportToGoogleDrive(file);
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

      const data: Partial<Appointment> = {
        observations: observations.split('\n').filter(Boolean),
        diagnoses: diagnoses.split('\n').filter(Boolean),
        recommendations: recommendations.split('\n').filter(Boolean),
        prescribedMedications: prescribedMedications.filter(m => m.name) as Medication[],
        followUpDate: followUpDate ? new Date(followUpDate).toISOString() : null,
        status: 'completed',
        completedAt: completionDate ? new Date(completionDate).toISOString() : new Date().toISOString(),
        attachedFiles: appointment.attachedFiles ? [...appointment.attachedFiles, ...uploadedFilesMetadata] : uploadedFilesMetadata,
      } as any;

      await onSubmit(data);
    } catch (error) {
      console.error('Failed to save completion details or upload files:', error);
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
      <div className="max-h-[84dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]">
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div>
            <p className="text-sm font-medium text-green-700">Complete Appointment</p>
            <h2 id={titleId} className="mt-1 text-2xl font-semibold text-gray-900">
              {appointment.reason}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Add observations, diagnoses, and recommendations from the visit.
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

        <form onSubmit={handleSubmit} className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <div>
            <label htmlFor={`${titleId}-observations`} className="text-sm font-medium text-gray-800">Observations</label>
            <textarea id={`${titleId}-observations`} value={observations} onChange={(e) => setObservations(e.target.value)} placeholder="Fetal heart rate was normal..." className={textareaClass} />
            <p className="mt-2 text-xs leading-5 text-gray-500">Enter each observation on a new line.</p>
          </div>
          <div>
            <label htmlFor={`${titleId}-diagnoses`} className="text-sm font-medium text-gray-800">Diagnoses</label>
            <textarea id={`${titleId}-diagnoses`} value={diagnoses} onChange={(e) => setDiagnoses(e.target.value)} placeholder="Healthy ongoing pregnancy..." className={textareaClass} />
            <p className="mt-2 text-xs leading-5 text-gray-500">Enter each diagnosis on a new line.</p>
          </div>
          <div>
            <label htmlFor={`${titleId}-recommendations`} className="text-sm font-medium text-gray-800">Recommendations</label>
            <textarea id={`${titleId}-recommendations`} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} placeholder="Continue prenatal vitamins..." className={textareaClass} />
            <p className="mt-2 text-xs leading-5 text-gray-500">Enter each recommendation on a new line.</p>
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

          <FileChooser 
            files={files} 
            onFilesChange={setFiles} 
            label="Attachments" 
            description="Add lab reports, ultrasounds, or discharge notes." 
          />

          <div>
            <label htmlFor={`${titleId}-completionDate`} className="text-sm font-medium text-gray-800">
              Completion Date & Time
            </label>
            <input
              id={`${titleId}-completionDate`}
              type="datetime-local"
              required
              value={completionDate}
              onChange={(e) => setCompletionDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-followUp`} className="text-sm font-medium text-gray-800">
              Follow-up Appointment
            </label>
            <input
              id={`${titleId}-followUp`}
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-70">
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Completion Details'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}