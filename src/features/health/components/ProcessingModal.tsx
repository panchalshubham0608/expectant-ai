import { CheckCircle, LoaderCircle, XCircle, Clock } from 'lucide-react';

export type StepStatus = 'pending' | 'processing' | 'done' | 'error';

interface ProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadStep: StepStatus;
  analyzeStep: StepStatus;
  error: string | null;
}

export default function ProcessingModal({
  isOpen,
  onClose,
  uploadStep,
  analyzeStep,
  error,
}: ProcessingModalProps) {
  if (!isOpen) return null;

  const renderStepIcon = (status: StepStatus) => {
    switch (status) {
      case 'pending': return <Clock size={20} className="text-gray-300" />;
      case 'processing': return <LoaderCircle size={20} className="animate-spin text-blue-500" />;
      case 'done': return <CheckCircle size={20} className="text-green-500" />;
      case 'error': return <XCircle size={20} className="text-red-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col rounded-3xl bg-white p-6 shadow-xl">
        <h3 className="mb-5 text-xl font-bold text-gray-900">Processing Report</h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {renderStepIcon(uploadStep)}
            <span className={`text-sm ${uploadStep === 'processing' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
              Upload report to Google Drive
            </span>
          </div>
          <div className="flex items-center gap-3">
            {renderStepIcon(analyzeStep)}
            <span className={`text-sm ${analyzeStep === 'processing' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
              Analyze report with Gemini
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={uploadStep === 'processing' || analyzeStep === 'processing'}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}