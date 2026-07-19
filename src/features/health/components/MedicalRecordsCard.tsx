import '../../../styles/features/health/components/MedicalRecordsCard.css';
import { FileText, ArrowRight } from 'lucide-react';
import type { MedicalRecord } from '../types';
import UploadReportDialog from './UploadReportDialog';

interface MedicalRecordsCardProps {
  records: MedicalRecord[];
}

export default function MedicalRecordsCard({ records }: MedicalRecordsCardProps) {
  return (
    <section className="medical-records-card">
      <div className="medical-records-card__header">
        <div>
          <p className="medical-records-card__label">Medical Records</p>
          <h2 className="medical-records-card__title">Recent Reports</h2>
        </div>

        <FileText size={20} className="medical-records-card__icon" />
      </div>

      <UploadReportDialog />

      <div className="medical-records-card__list">
        {records.map((record) => (
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
