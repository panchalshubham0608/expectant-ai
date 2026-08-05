import { CheckCircle, Loader2, Clock, XCircle } from 'lucide-react';

export type FileUploadStatus = 'pending' | 'uploading' | 'done' | 'error';

export interface FileStatus {
  name: string;
  status: FileUploadStatus;
}

interface FileUploadProgressModalProps {
  isOpen: boolean;
  files: FileStatus[];
}

export default function FileUploadProgressModal({ isOpen, files }: FileUploadProgressModalProps) {
  if (!isOpen) return null;

  const renderIcon = (status: FileUploadStatus) => {
    switch (status) {
      case 'pending': return <Clock size={16} className="text-gray-400 shrink-0" />;
      case 'uploading': return <Loader2 size={16} className="animate-spin text-indigo-500 shrink-0" />;
      case 'done': return <CheckCircle size={16} className="text-green-500 shrink-0" />;
      case 'error': return <XCircle size={16} className="text-rose-500 shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-gray-100">
        <h3 className="mb-5 text-xl font-bold text-gray-900">Uploading Files...</h3>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-3">
              {renderIcon(file.status)}
              <span className={`text-sm truncate ${file.status === 'uploading' ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                {file.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}