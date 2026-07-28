import { useEffect, useRef, useState } from 'react';
import '../../../styles/features/health/components/UploadReportDialog.css';
import { LoaderCircle, UploadCloud } from 'lucide-react';

interface UploadReportDialogProps {
  onConfirmUpload?: (file: File) => void;
}

export default function UploadReportDialog({ onConfirmUpload }: UploadReportDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup the object URL to avoid memory leaks when the component unmounts or pdfUrl changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setError(null);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfUrl(URL.createObjectURL(file));
    setError(null);
  };

  const handleConfirmUpload = () => {
    if (!selectedFile) return;

    if (onConfirmUpload) {
      onConfirmUpload(selectedFile);
    }
    handleCancelPreview();
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <section className="upload-report-dialog">
      <div className="upload-report-dialog__header">
        <div>
          <p className="upload-report-dialog__label">Report Upload</p>
          <h2 className="upload-report-dialog__title">Share a new report</h2>
        </div>

        <div className="upload-report-dialog__icon">
          <UploadCloud size={18} />
        </div>
      </div>

      <p className="upload-report-dialog__copy">
        Upload a PDF scan or lab result to generate a concise pregnancy-care summary.
      </p>

      <input
        type="file"
        accept="application/pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        style={{ display: 'none' }}
      />

      <button
        type="button"
        className="upload-report-dialog__button"
        onClick={handleUploadClick}
      >
        Upload Report
      </button>

      {selectedFile && (
        <div className="upload-report-dialog__preview-modal">
          <div className="upload-report-dialog__preview-card">
            <h3 className="upload-report-dialog__preview-title">Selected Report</h3>
            <p className="upload-report-dialog__preview-name">{selectedFile.name}</p>

            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                title="PDF Preview"
                className="mt-4 h-[420px] w-full rounded-2xl border-none bg-gray-50 shadow-inner ring-1 ring-gray-200"
              />
            ) : (
              <div className="mt-4 flex h-[420px] w-full items-center justify-center rounded-2xl bg-gray-50 ring-1 ring-gray-200">
                <LoaderCircle size={24} className="animate-spin text-gray-400" />
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-full px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                onClick={handleCancelPreview}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-800 disabled:opacity-50"
                onClick={handleConfirmUpload}
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="upload-report-dialog__error">{error}</p>}
    </section>
  );
}
