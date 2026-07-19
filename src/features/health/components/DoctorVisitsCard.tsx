import '../../../styles/features/health/components/DoctorVisitsCard.css';
import { CalendarCheck, Stethoscope } from 'lucide-react';
import type { DoctorVisit } from '../types';

interface DoctorVisitsCardProps {
  visits: DoctorVisit[];
}

export default function DoctorVisitsCard({ visits }: DoctorVisitsCardProps) {
  return (
    <section className="doctor-visits-card">
      <div className="doctor-visits-card__header">
        <div>
          <p className="doctor-visits-card__label">Doctor Visits</p>
          <h2 className="doctor-visits-card__title">Upcoming Care</h2>
        </div>

        <div className="doctor-visits-card__meta">
          <Stethoscope size={18} />
        </div>
      </div>

      <div className="doctor-visits-card__list">
        {visits.map((visit) => (
          <div key={visit.id} className="doctor-visit">
            <div className="doctor-visit__row">
              <div>
                <p className="doctor-visit__provider">{visit.provider}</p>
                <p className="doctor-visit__specialty">{visit.specialty}</p>
              </div>
              <span className="doctor-visit__date">
                <CalendarCheck size={14} />
                {visit.date}
              </span>
            </div>
            <p className="doctor-visit__note">{visit.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
