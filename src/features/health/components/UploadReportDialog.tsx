import '../../../styles/features/health/components/UploadReportDialog.css';
import { UploadCloud } from 'lucide-react';

export default function UploadReportDialog() {
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
        Scan or lab results can be added here so your care summary stays current.
      </p>

      <button type="button" className="upload-report-dialog__button">
        Upload Report
      </button>
    </section>
  );
}
