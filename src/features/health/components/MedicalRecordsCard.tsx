import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import '../../../styles/features/health/components/MedicalRecordsCard.css';
import { FileText, ArrowRight } from 'lucide-react';
import type { MedicalRecord } from '../types';
import { formatPregnancySummary, type PregnancyReportSummary } from '../reportSummaryService';
import UploadReportDialog from './UploadReportDialog';

interface MedicalRecordsCardProps {
  records: MedicalRecord[];
}

export default function MedicalRecordsCard({ records }: MedicalRecordsCardProps) {
  const [recordList, setRecordList] = useState(records);

  useEffect(() => {
    setRecordList(records);
  }, [records]);

  const handleSummaryGenerated = (summary: PregnancyReportSummary, fileName: string) => {
    const nextRecord: MedicalRecord = {
      id: `record-${Date.now()}`,
      title: fileName || 'Uploaded PDF Report',
      date: format(new Date(), 'dd MMM yyyy'),
      status: 'Completed',
      summary: formatPregnancySummary(summary),
    };

    setRecordList((currentRecords) => [nextRecord, ...currentRecords]);
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

      <UploadReportDialog onSummaryGenerated={handleSummaryGenerated} />

      <div className="medical-records-card__list">
        {recordList.map((record) => (
          <div key={record.id} className="record-card">
            <div className="record-card__row">
              <div>
                <p className="record-card__title">{record.title}</p>
                <p className="record-card__date">{record.date}</p>
              </div>
              <span
                className={`record-status ${
                  record.status === 'Completed'
                    ? 'record-status--completed'
                    : record.status === 'Pending'
                      ? 'record-status--pending'
                      : 'record-status--action'
                }`}
              >
                {record.status}
              </span>
            </div>
            <p className="record-card__summary">{record.summary}</p>
          </div>
        ))}
      </div>

      <button type="button" className="medical-records-card__button">
        View all records
        <ArrowRight size={16} />
      </button>
    </section>
  );
}
