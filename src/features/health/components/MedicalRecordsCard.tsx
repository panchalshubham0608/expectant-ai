import { useEffect, useState } from 'react';
import '../../../styles/features/health/components/ReportsCard.css';
import { FileText } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { useParams } from 'react-router-dom';
import type { Report } from '../../../models/report';
import { getGeminiApiKey } from '../../../services/profiles/profileService';
import { saveAnalyzedMedicalReport, subscribeToMedicalReports } from '../../../services/reports/medicalReportService';
import { summarizePdfReport } from '../../../services/ai/reportSummaryService';
import { uploadReportToGoogleDrive } from '../../../services/reports/reportsService';
import UploadReportDialog from './UploadReportDialog';
import ProcessingModal, { type StepStatus } from './ProcessingModal';
import ReportDetails from './ReportDetails';

interface ReportsCardProps {
  records: Report[];
}

export default function ReportsCard({ records }: ReportsCardProps) {
  const { user } = useAuth();
  const { id : profileId } = useParams<{ id: string }>();
  const [recordList, setRecordList] = useState(records);
  const [selectedRecord, setSelectedRecord] = useState<Report | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<StepStatus>('pending');
  const [analyzeStep, setAnalyzeStep] = useState<StepStatus>('pending');
  const [processError, setProcessError] = useState<string | null>(null);

  useEffect(() => {
    setRecordList(records);
  }, [records]);

  useEffect(() => {
    if (!user?.uid || !profileId) {
      return;
    }

    const unsubscribe = subscribeToMedicalReports(user.uid, profileId, (nextRecords: Report[]) => {
      setRecordList(nextRecords);
    }, () => undefined);

    return unsubscribe;
  }, [profileId, user?.uid]);

  const handleConfirmUpload = async (file: File) => {
    if (!user?.uid || !profileId) {
      throw new Error('You must be signed in to upload a report.');
    }

    setIsProcessingModalOpen(true);
    setUploadStep('processing');
    setAnalyzeStep('pending');
    setProcessError(null);

    try {
      const apiKey = await getGeminiApiKey(user.uid, profileId);

      // Step 1: Upload to Google Drive
      const reportUrl = await uploadReportToGoogleDrive(user.uid, profileId, file);
      setUploadStep('done');

      // Step 2: Analyze with Gemini
      setAnalyzeStep('processing');
      const generatedSummary = await summarizePdfReport(file, apiKey || undefined);
      await saveAnalyzedMedicalReport(user.uid, profileId, reportUrl, generatedSummary);
      setAnalyzeStep('done');
    } catch (error) {
      if (uploadStep === 'processing') setUploadStep('error');
      if (analyzeStep === 'processing') setAnalyzeStep('error');
      setProcessError(error instanceof Error ? error.message : 'An error occurred during processing.');
    }
  };

  return (
    <section className="medical-records-card">
      <div className="medical-records-card__header">
        <div>
          <p className="medical-records-card__label">Medical Records</p>
          <h2 className="medical-records-card__title">Recent Reports</h2>
        </div>

        <FileText size={20} className="medical-records-card__icon" />
      </div>

      <ProcessingModal
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        uploadStep={uploadStep}
        analyzeStep={analyzeStep}
        error={processError}
      />

      <UploadReportDialog onConfirmUpload={handleConfirmUpload} />

      <div className="medical-records-card__list">
        {recordList.map((record) => (
          <button
            key={record.id}
            type="button"
            className="record-card"
            onClick={() => setSelectedRecord(record)}
          >
            <div className="record-card__row">
              <div>
                <p className="record-card__title">{record.title}</p>
                <p className="record-card__date">{record.reportDate}</p>
                <p className="record-card__type">{record.reportType}</p>
                <p className="record-card__summary">{record.summary.plainEnglish}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedRecord && (
        <ReportDetails report={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </section>
  );
}
