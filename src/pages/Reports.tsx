import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  FileText, 
  ChevronRight, 
  Loader2, 
  Droplets, 
  Activity, 
  Pill, 
  Stethoscope, 
  Syringe, 
  Hospital, 
  Dna, 
  FlaskConical,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import type { Report } from '../models/report';
import { saveAnalyzedMedicalReport, subscribeToMedicalReports, deleteMedicalReport } from '../services/reports/medicalReportService';
import { getGeminiApiKey } from '../services/profiles/profileService';
import { summarizePdfReport } from '../services/ai/reportSummaryService';
import { uploadReportToGoogleDrive } from '../services/reports/reportsService';

import UploadReportDialog from '../components/reports/UploadReportDialog';
import ProcessingModal, { type StepStatus } from '../components/reports/ProcessingModal';
import ReportDetails from '../components/reports/ReportDetails';
import '../styles/features/reports/ReportsCard.css';

const formatReportDate = (dateString: string) => {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
  } catch {
    return dateString;
  }
};

const getReportDate = (report: Report) : Date => {
  try {
    const date = new Date(report.reportDate);
    if (isNaN(date.getTime())) return new Date();
    return date;    
  } catch(error) {
    console.log(error);
    return new Date(report.createdAt || Date.now());
  }
}

const getReportIcon = (type: string) => {
  switch (type) {
    case 'blood-test': return <Droplets size={16} className="text-rose-500" />;
    case 'ultrasound': return <Activity size={16} className="text-indigo-500" />;
    case 'urine-test': return <FlaskConical size={16} className="text-amber-500" />;
    case 'prescription': return <Pill size={16} className="text-purple-500" />;
    case 'consultation': return <Stethoscope size={16} className="text-teal-500" />;
    case 'vaccination': return <Syringe size={16} className="text-cyan-500" />;
    case 'hospital': return <Hospital size={16} className="text-blue-500" />;
    case 'genetic-screening': return <Dna size={16} className="text-emerald-500" />;
    default: return <FileText size={16} className="text-gray-500" />;
  }
};

function Reports() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedRecord, setSelectedRecord] = useState<Report | null>(null);
  const [isProcessingModalOpen, setIsProcessingModalOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState<StepStatus>('pending');
  const [analyzeStep, setAnalyzeStep] = useState<StepStatus>('pending');
  const [processError, setProcessError] = useState<string | null>(null);

  const [reportToDelete, setReportToDelete] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user?.uid || !id) {
      return;
    }

    const unsubscribeMedical = subscribeToMedicalReports(user.uid, id, (nextRecords : Report[]) => {
      nextRecords.sort((a, b) => getReportDate(b).getTime() - getReportDate(a).getTime());
      setReports(nextRecords);
      setIsLoading(false);
    }, () => {
      setIsLoading(false);
    });

    return () => {
      unsubscribeMedical();
    };
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

      const reportUrl = await uploadReportToGoogleDrive(user.uid, id, file);
      setUploadStep('done');

      setAnalyzeStep('processing');
      const generatedSummary = await summarizePdfReport(file, apiKey || undefined);
      await saveAnalyzedMedicalReport(user.uid, id, reportUrl, generatedSummary);
      setAnalyzeStep('done');
    } catch (error) {
      console.log(error);
      if (uploadStep === 'processing') setUploadStep('error');
      if (analyzeStep === 'processing') setAnalyzeStep('error');
      setProcessError(error instanceof Error ? error.message : 'An error occurred during processing.');
    }
  };

  const confirmDelete = async () => {
    if (!user?.uid || !id || !reportToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMedicalReport(user.uid, id, reportToDelete.id);
      setReportToDelete(null);
      if (selectedRecord?.id === reportToDelete.id) {
        setSelectedRecord(null);
      }
    } catch (error) {
      console.error("Failed to delete report:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="-mx-4 -mt-6 pb-24">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-teal-600 to-cyan-800 px-6 pb-20 pt-12 shadow-lg">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-white opacity-10 blur-2xl"></div>
        <div className="absolute -left-8 top-16 h-32 w-32 rounded-full bg-white opacity-10 blur-2xl"></div>
        
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Medical Reports</h1>
          <p className="text-sm text-teal-50/90 max-w-[280px] leading-relaxed">
            All your pregnancy reports in one place, with AI-generated summaries and key details for quick review.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-20 -mt-8 px-4">
        <div className="space-y-4">
          <UploadReportDialog onConfirmUpload={handleConfirmUpload} />

          {isLoading ? (
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-teal-500" />
              <p className="mt-1 text-sm text-gray-500">Loading reports...</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-10 text-center shadow-sm ring-1 ring-gray-100">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">No medical reports</h3>
              <p className="mt-1 text-sm text-gray-500">Upload a PDF report to extract insights.</p>
            </div>
          ) : (
            reports.map((record) => {
              const formattedDate = formatReportDate(record.reportDate);
              const dateParts = formattedDate.split(' ');
              const month = dateParts.length > 1 ? dateParts[0] : '';
              const day = dateParts.length > 1 ? dateParts[1]?.replace(',', '') : dateParts[0];

              return (
                <div 
                  key={record.id} 
                  onClick={() => setSelectedRecord(record)}
                  className="relative overflow-hidden rounded-[2rem] bg-white p-5 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md cursor-pointer flex items-center justify-between"
                >
                  <div className="flex gap-4 items-center">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-teal-50 px-3 py-2 text-teal-700 min-w-[72px]">
                      <span className="text-xs font-semibold uppercase tracking-wider">{month}</span>
                      <span className="text-xl font-bold leading-none my-0.5">{day}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-gray-900 break-words">{record.title}</h3>
                      <div className="flex items-center gap-1.5 mt-1">
                        {getReportIcon(record.reportType)}
                        <p className="text-sm font-medium text-gray-600 capitalize">
                          {record.reportType.replace(/-/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 shrink-0 ml-2" />
                </div>
              );
            })
          )}
        </div>
      </div>

      <ProcessingModal
        isOpen={isProcessingModalOpen}
        onClose={() => setIsProcessingModalOpen(false)}
        uploadStep={uploadStep}
        analyzeStep={analyzeStep}
        error={processError}
      />

      {selectedRecord && (
        <ReportDetails 
          report={selectedRecord} 
          onClose={() => setSelectedRecord(null)}
          onDeleteClick={() => setReportToDelete(selectedRecord)}
        />
      )}

      {reportToDelete && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
          onClick={() => setReportToDelete(null)}
        >
          <div 
            className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-gray-100 p-6 sm:p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 mb-6">
              <AlertTriangle size={32} className="text-rose-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Delete Report?</h2>
            <p className="text-sm text-gray-500 mb-8">
              Are you sure you want to delete "{reportToDelete.title}"? This action cannot be undone.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button 
                onClick={() => setReportToDelete(null)}
                disabled={isDeleting}
                className="w-full rounded-full px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 sm:w-auto"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 sm:w-auto disabled:opacity-70"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reports;
