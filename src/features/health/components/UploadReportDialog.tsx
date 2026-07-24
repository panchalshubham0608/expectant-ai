import { useMemo, useState } from 'react';
import '../../../styles/features/health/components/UploadReportDialog.css';
import { LoaderCircle, UploadCloud } from 'lucide-react';
import { formatPregnancySummary, summarizePublicReportUrl, type GeminiPregnancyReportResponse } from '../reportSummaryService';

interface UploadReportDialogProps {
  onSummaryGenerated?: (summary: GeminiPregnancyReportResponse, fileName: string) => void;
  onConfirmUpload?: (reportUrl: string) => Promise<GeminiPregnancyReportResponse>;
}

export default function UploadReportDialog({ onSummaryGenerated, onConfirmUpload }: UploadReportDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [reportUrl, setReportUrl] = useState('');
  const [summary, setSummary] = useState<GeminiPregnancyReportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewSource = useMemo(() => {
    const trimmed = reportUrl.trim();

    if (!trimmed) {
      return '';
    }

    return trimmed.replace(/^https?:\/\//i, 'https://');
  }, [reportUrl]);

  const handleUploadClick = () => {
    setIsLinkModalOpen(true);
    setError(null);
  };

  const handleConfirmPreview = async () => {
    if (!reportUrl.trim()) {
      setError('Please paste a public report link first.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const generatedSummary = await (onConfirmUpload?.(reportUrl) ?? summarizePublicReportUrl(reportUrl));
      setSummary(generatedSummary);
      onSummaryGenerated?.(generatedSummary, reportUrl);
      setReportUrl('');
      setIsLinkModalOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to summarize this report.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setReportUrl('');
    setIsLinkModalOpen(false);
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
        Paste a direct public PDF URL that points to the file itself.
      </p>

      <button
        type="button"
        className="upload-report-dialog__button"
        onClick={handleUploadClick}
      >
        Add report
      </button>

      {isLinkModalOpen && (
        <div className="upload-report-dialog__preview-modal">
          <div className="upload-report-dialog__preview-card">
            <h3 className="upload-report-dialog__preview-title">Use a public report link</h3>
            <p className="upload-report-dialog__preview-name">Paste a direct PDF link you want analyzed.</p>
            <input
              type="url"
              value={reportUrl}
              onChange={(event) => setReportUrl(event.target.value)}
              placeholder="https://drive.google.com/..."
              className="upload-report-dialog__link-input"
            />

            {previewSource && (
              <iframe
                title="Report Preview"
                src={previewSource}
                className="upload-report-dialog__preview-frame"
              />
            )}

            <div className="upload-report-dialog__preview-actions">
              <button type="button" className="upload-report-dialog__preview-btn upload-report-dialog__preview-btn--secondary" onClick={handleCancelPreview}>
                Cancel
              </button>
              <button type="button" className="upload-report-dialog__preview-btn upload-report-dialog__preview-btn--loading" onClick={handleConfirmPreview}>
                {isUploading ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Analyzing link…
                  </>
                ) : (
                  'Analyze and Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="upload-report-dialog__error">{error}</p>}
      {summary && (
        <div className="upload-report-dialog__summary">
          <p>{formatPregnancySummary(summary)}</p>
        </div>
      )}
    </section>
  );
}
