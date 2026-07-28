import { useEffect, useState } from 'react';
import '../../../styles/features/health/components/MedicalRecordsCard.css';
import { FileText } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { useParams } from 'react-router-dom';
import type { MedicalRecord } from '../types';
import { getGeminiApiKey } from '../../profiles/profileService';
import { saveAnalyzedMedicalReport, subscribeToMedicalReports } from '../medicalRecordsService';
import { summarizePdfReport } from '../reportSummaryService';
import { uploadReportToGoogleDrive } from '../reportsService';
import UploadReportDialog from './UploadReportDialog';
import ProcessingModal, { type StepStatus } from './ProcessingModal';
import MedicalRecordDetails from './MedicalRecordDetails';

interface MedicalRecordsCardProps {
  records: MedicalRecord[];
}

export default function MedicalRecordsCard({ records }: MedicalRecordsCardProps) {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const [recordList, setRecordList] = useState(records);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<StepStatus>('pending');
  const [analyzeStep, setAnalyzeStep] = useState<StepStatus>('pending');
  const [processError, setProcessError] = useState<string | null>(null);

  useEffect(() => {
    setRecordList(records);
  }, [records]);

  useEffect(() => {
    if (!user?.uid || !id) {
      return;
    }

    const unsubscribe = subscribeToMedicalReports(user.uid, id, (nextRecords) => {
      setRecordList(nextRecords);
    }, () => undefined);

    return unsubscribe;
  }, [id, user?.uid]);

  const handleConfirmUpload = async (file: File) => {
    if (!user?.uid || !id) {
      throw new Error('You must be signed in to upload a report.');
    }

    setIsProcessingModalOpen(true);
    setUploadStep('processing');
    setAnalyzeStep('pending');
    setProcessError(null);

    try {
      const apiKey = await getGeminiApiKey(user.uid, id);

      // Step 1: Upload to Google Drive
      const reportUrl = await uploadReportToGoogleDrive(file);
      setUploadStep('done');

      // Step 2: Analyze with Gemini
      setAnalyzeStep('processing');
      const generatedSummary = await summarizePdfReport(file, apiKey || undefined);
      await saveAnalyzedMedicalReport(user.uid, id, reportUrl, generatedSummary);
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
        <MedicalRecordDetails report={selectedRecord} onClose={() => setSelectedRecord(null)} />
      )}
    </section>
  );
}
