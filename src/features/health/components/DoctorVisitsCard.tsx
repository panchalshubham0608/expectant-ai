import '../../../styles/DoctorVisitsCard.css';
import { CalendarCheck, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import type { DoctorVisit } from '../types';

interface DoctorVisitsCardProps {
  visits: DoctorVisit[];
}

type VisitState = DoctorVisit & { completed?: boolean; completedNote?: string };

const todayISO = () => new Date('2026-07-19').toISOString().split('T')[0];

export default function DoctorVisitsCard({ visits }: DoctorVisitsCardProps) {
  const [visitList, setVisitList] = useState<VisitState[]>(visits.map((v) => ({ ...v })));
  const [showPast, setShowPast] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newVisit, setNewVisit] = useState({
    provider: '',
    specialty: '',
    date: todayISO(),
    note: '',
  });
  const [completing, setCompleting] = useState<VisitState | null>(null);
  const [completeDetails, setCompleteDetails] = useState('');

  const addVisit = () => {
    const id = `visit-${Date.now()}`;
    setVisitList((prev) => [{ id, ...newVisit }, ...prev]);
    setShowAdd(false);
    setNewVisit({ provider: '', specialty: '', date: todayISO(), note: '' });
  };

  const markCompleted = (visitId: string, details: string) => {
    setVisitList((prev) =>
      prev.map((v) => (v.id === visitId ? { ...v, completed: true, completedNote: details } : v)),
    );
    setCompleting(null);
    setCompleteDetails('');
  };

  const upcoming = visitList.filter((v) => v.date >= todayISO());
  const past = visitList.filter((v) => v.date < todayISO() || v.completed);

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
        {(showPast ? past : upcoming).map((visit) => (
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
        ))}
      </div>

      {completing && (
        <div className="doctor-visits-card__overlay" onClick={() => setCompleting(null)}>
          <div className="doctor-visits-card__complete-modal" onClick={(e) => e.stopPropagation()}>
            <h4 className="text-lg font-semibold">Mark {completing.provider} visit as completed</h4>
            <textarea
              placeholder="Completion details"
              value={completeDetails}
              onChange={(e) => setCompleteDetails(e.target.value)}
              className="w-full mt-3 rounded-xl border border-slate-200 px-3 py-2"
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
