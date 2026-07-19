import '../../../styles/features/health/components/TimelineCard.css';
import { Clock3 } from 'lucide-react';
import type { TimelineEvent } from '../types';

interface TimelineCardProps {
  events: TimelineEvent[];
}

export default function TimelineCard({ events }: TimelineCardProps) {
  return (
    <section className="timeline-card">
      <div className="timeline-card__header">
        <div>
          <p className="timeline-card__label">Pregnancy Timeline</p>
          <h2 className="timeline-card__title">Milestone Tracker</h2>
        </div>

        <div className="timeline-card__meta">
          <Clock3 size={18} />
        </div>
      </div>

      <div className="timeline-card__list">
        {events.map((event, index) => (
          <div key={event.id} className="timeline-event">
            <div className="timeline-event__marker" />
            {index < events.length - 1 && <div className="timeline-event__line" />}
            <div className="timeline-event__entry">
              <div className="timeline-event__row">
                <p className="timeline-event__week">{event.week}</p>
                <span className="timeline-event__status">{event.status}</span>
              </div>
              <p className="timeline-event__title">{event.title}</p>
              <p className="timeline-event__date">{event.date}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
