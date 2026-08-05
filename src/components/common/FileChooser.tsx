import { useRef } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';

interface FileChooserProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  description?: string;
}

export default function FileChooser({ 
  files, 
  onFilesChange, 
  label = 'Attachments', 
  description 
}: FileChooserProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      onFilesChange([...files, ...selectedFiles]);
    }
    // Reset input so the same file can be selected again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div>
      <label className="text-sm font-medium text-gray-800">{label}</label>
      <div className="mt-2 flex flex-col gap-3">
        {files.map((file, index) => (
          <div key={index} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 shrink-0">
                <FileText size={18} />
              </div>
              <span className="truncate text-sm font-medium text-gray-700">{file.name}</span>
            </div>
            <button type="button" onClick={() => removeFile(index)} className="p-1 text-gray-400 hover:text-red-500 transition-colors" aria-label="Remove file">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 px-4 py-4 text-sm font-medium text-indigo-700 hover:bg-indigo-50 transition-colors">
          <Upload size={18} />
          <span>Upload Files</span>
        </button>
        <input type="file" multiple ref={fileInputRef} onChange={handleFileChange} className="hidden" />
      </div>
      {description && <p className="mt-2 text-xs leading-5 text-gray-500">{description}</p>}
    </div>
  );
}