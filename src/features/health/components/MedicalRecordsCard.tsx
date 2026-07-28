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
        <div className="medical-records-card__modal">
          <div className="medical-records-card__modal-card">
            <div className="medical-records-card__modal-header">
              <div>
                <p className="medical-records-card__label">Report Details</p>
                <h3 className="medical-records-card__title">{selectedRecord.title}</h3>
                <p className="medical-records-card__modal-meta">{selectedRecord.reportDate} · {selectedRecord.reportType}</p>
              </div>
              <button type="button" className="medical-records-card__close" onClick={() => setSelectedRecord(null)}>
                Close
              </button>
            </div>

            <div className="medical-records-card__detail-grid">
              <section className="medical-records-card__detail-panel medical-records-card__detail-panel--highlight">
                <p className="medical-records-card__detail-label">Summary</p>
                <p className="medical-records-card__detail-value medical-records-card__detail-value--lead">{selectedRecord.summary.plainEnglish}</p>

                <div className="medical-records-card__detail-actions">
                  <a
                    href={selectedRecord.reportUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="medical-records-card__detail-button"
                  >
                    View report
                  </a>
                </div>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Metadata</p>
                <p className="medical-records-card__detail-value">
                  {selectedRecord.metadata.hospital || 'Hospital not available'} · {selectedRecord.metadata.doctor || 'Doctor not available'} · {selectedRecord.metadata.reportDate || 'Date unavailable'}
                </p>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Important findings</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.summary.importantFindings.length > 0 ? (
                    selectedRecord.summary.importantFindings.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No important findings listed.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Follow-up actions</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.summary.followUpActions.length > 0 ? (
                    selectedRecord.summary.followUpActions.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No follow-up actions listed.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Questions for doctor</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.summary.questionsForDoctor.length > 0 ? (
                    selectedRecord.summary.questionsForDoctor.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No questions listed.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Medicines</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.medicines.length > 0 ? (
                    selectedRecord.medicines.map((medicine) => (
                      <li key={`${medicine.name}-${medicine.dose}`}>{medicine.name} · {medicine.dose} · {medicine.frequency} · {medicine.duration}</li>
                    ))
                  ) : (
                    <li>No medicines listed.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Diagnoses mentioned</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.diagnosesMentioned.length > 0 ? (
                    selectedRecord.diagnosesMentioned.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No diagnoses mentioned.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Recommendations</p>
                <ul className="medical-records-card__detail-value medical-records-card__detail-list">
                  {selectedRecord.recommendations.length > 0 ? (
                    selectedRecord.recommendations.map((item) => <li key={item}>{item}</li>)
                  ) : (
                    <li>No recommendations listed.</li>
                  )}
                </ul>
              </section>

              <section className="medical-records-card__detail-panel">
                <p className="medical-records-card__detail-label">Next visit</p>
                <p className="medical-records-card__detail-value">{selectedRecord.nextVisit || 'No next visit scheduled.'}</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
