import { useRef, useState } from 'react';
import '../../../styles/features/health/components/UploadReportDialog.css';
import { UploadCloud } from 'lucide-react';
import { formatPregnancySummary, summarizePdfReport, type PregnancyReportSummary } from '../reportSummaryService';

interface UploadReportDialogProps {
  onSummaryGenerated?: (summary: PregnancyReportSummary, fileName: string) => void;
}

export default function UploadReportDialog({ onSummaryGenerated }: UploadReportDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [summary, setSummary] = useState<PregnancyReportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setIsUploading(true);
    setSummary(null);
    setError(null);

    try {
      const generatedSummary = await summarizePdfReport(file);
      setSummary(generatedSummary);
      onSummaryGenerated?.(generatedSummary, file.name);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to summarize this report.');
    } finally {
      setIsUploading(false);
      event.target.value = '';
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
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="upload-report-dialog__input"
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="upload-report-dialog__button"
        onClick={handleUploadClick}
        disabled={isUploading}
      >
        {isUploading ? 'Analyzing PDF…' : 'Upload Report'}
      </button>

      {error && <p className="upload-report-dialog__error">{error}</p>}
      {summary && (
        <div className="upload-report-dialog__summary">
          <p>{formatPregnancySummary(summary)}</p>
        </div>
      )}
    </section>
  );
}
