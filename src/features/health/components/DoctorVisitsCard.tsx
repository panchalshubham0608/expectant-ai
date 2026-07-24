import '../../../styles/DoctorVisitsCard.css';
import { CalendarCheck, Stethoscope } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DoctorVisit } from '../types';

const LOCAL_STORAGE_KEYS = {
  provider: 'expectant-ai:doctor-visit-provider',
  specialty: 'expectant-ai:doctor-visit-specialty',
};

interface DoctorVisitsCardProps {
  visits: DoctorVisit[];
  onAddVisit?: (visit: Omit<DoctorVisit, 'id'>) => Promise<void>;
  onCompleteVisit?: (visitId: string, details: string) => Promise<void>;
}

type VisitState = DoctorVisit & { completed?: boolean; completedNote?: string | null };

const todayISO = () => new Date().toISOString().split('T')[0];

export default function DoctorVisitsCard({ visits, onAddVisit, onCompleteVisit }: DoctorVisitsCardProps) {
  const [visitList, setVisitList] = useState<VisitState[]>(visits.map((v) => ({ ...v })));
  const [showPast, setShowPast] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newVisit, setNewVisit] = useState(() => ({
    provider: typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_STORAGE_KEYS.provider) ?? '' : '',
    specialty: typeof window !== 'undefined' ? window.localStorage.getItem(LOCAL_STORAGE_KEYS.specialty) ?? '' : '',
    date: todayISO(),
    note: '',
  }));
  const [completing, setCompleting] = useState<VisitState | null>(null);
  const [completeDetails, setCompleteDetails] = useState('');

  useEffect(() => {
    setVisitList(visits.map((visit) => ({ ...visit, completed: visit.completed ?? false })));
  }, [visits]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(LOCAL_STORAGE_KEYS.provider, newVisit.provider);
    window.localStorage.setItem(LOCAL_STORAGE_KEYS.specialty, newVisit.specialty);
  }, [newVisit.provider, newVisit.specialty]);

  const addVisit = async () => {
    if (!newVisit.provider.trim() || !newVisit.specialty.trim() || !newVisit.note.trim()) {
      return;
    }

    await onAddVisit?.({ ...newVisit, completed: false, completedNote: null });
    setShowAdd(false);
    setNewVisit({ provider: '', specialty: '', date: todayISO(), note: '' });
  };

  const markCompleted = async (visitId: string, details: string) => {
    await onCompleteVisit?.(visitId, details || 'Completed');
    setCompleting(null);
    setCompleteDetails('');
  };

  const upcoming = visitList.filter((v) => !v.completed && v.date >= todayISO());
  const past = visitList.filter((v) => v.completed || v.date < todayISO());

  const getStatusClass = (visit: VisitState) => {
    if (visit.completed) {
      return 'doctor-visit__status doctor-visit__status--completed';
    }

    if (visit.date >= todayISO()) {
      return 'doctor-visit__status doctor-visit__status--upcoming';
    }

    return 'doctor-visit__status doctor-visit__status--missed';
  };

  const getStatusLabel = (visit: VisitState) => {
    if (visit.completed) {
      return 'Completed';
    }

    if (visit.date >= todayISO()) {
      return 'Upcoming';
    }

    return 'MISSED';
  };

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

      <div className="doctor-visits-card__controls">
        <button className="doctor-visits-card__btn" onClick={() => setShowAdd((s) => !s)}>
          Add appointment
        </button>
        <button
          className="doctor-visits-card__btn doctor-visits-card__btn--secondary"
          onClick={() => setShowPast((s) => !s)}
        >
          {showPast ? 'Hide past' : 'Browse past appointments'}
        </button>
      </div>

      {showAdd && (
        <div className="doctor-visits-card__add">
          <input
            placeholder="Provider"
            value={newVisit.provider}
            onChange={(e) => setNewVisit({ ...newVisit, provider: e.target.value })}
          />
          <input
            placeholder="Specialty"
            value={newVisit.specialty}
            onChange={(e) => setNewVisit({ ...newVisit, specialty: e.target.value })}
          />
          <input
            type="date"
            value={newVisit.date}
            onChange={(e) => setNewVisit({ ...newVisit, date: e.target.value })}
          />
          <input
            placeholder="Note"
            value={newVisit.note}
            onChange={(e) => setNewVisit({ ...newVisit, note: e.target.value })}
          />
          <div className="doctor-visits-card__add-actions">
            <button onClick={addVisit} className="doctor-visits-card__btn">
              Save
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="doctor-visits-card__btn doctor-visits-card__btn--secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="doctor-visits-card__list">
        {(showPast ? past : upcoming).length === 0 ? (
          <div className="doctor-visits-card__empty">
            No {showPast ? 'past' : 'upcoming'} appointments yet.
          </div>
        ) : (
          (showPast ? past : upcoming).map((visit) => (
            <div key={visit.id} className="doctor-visit">
              <div className="doctor-visit__row">
                <div>
                  <p className="doctor-visit__provider">{visit.provider}</p>
                  <p className="doctor-visit__specialty">{visit.specialty}</p>
                </div>
                <div className="doctor-visit__meta">
                  <span className={getStatusClass(visit)}>
                    {getStatusLabel(visit)}
                  </span>
                  <span className="doctor-visit__date">
                    <CalendarCheck size={14} />
                    {visit.date}
                  </span>
                </div>
              </div>
              <p className="doctor-visit__note">
                {visit.note}
                {visit.completedNote ? ` — Completed: ${visit.completedNote}` : ''}
              </p>
              {!visit.completed && visit.date >= todayISO() && (
                <div className="doctor-visit__actions">
                  <button
                    onClick={() => {
                      setCompleting(visit);
                      setCompleteDetails('');
                    }}
                    className="doctor-visits-card__btn"
                  >
                    Mark completed
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {completing && (
        <div className="doctor-visits-card__overlay" onClick={() => setCompleting(null)}>
          <div className="doctor-visits-card__complete-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="doctor-visits-card__complete-modal-title">Mark {completing.provider} visit as completed</h4>
            <textarea
              placeholder="Completion details"
              value={completeDetails}
              onChange={(e) => setCompleteDetails(e.target.value)}
              className="doctor-visits-card__complete-modal-textarea"
            />
            <div className="doctor-visits-card__add-actions mt-3">
              <button
                onClick={() => markCompleted(completing.id, completeDetails || 'Completed')}
                className="doctor-visits-card__btn"
              >
                Save
              </button>
              <button
                onClick={() => setCompleting(null)}
                className="doctor-visits-card__btn doctor-visits-card__btn--secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
