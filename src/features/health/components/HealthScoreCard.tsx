import '../../../styles/features/health/components/HealthScoreCard.css';
import { ArrowUpRight, HeartPulse } from 'lucide-react';
import type { HealthScore } from '../types';

interface HealthScoreCardProps {
  data: HealthScore;
}

export default function HealthScoreCard({ data }: HealthScoreCardProps) {
  return (
    <section className="health-score-card">
      <div className="health-score-card__header">
        <div>
          <p className="health-score-card__label">Health Score</p>
          <h2 className="health-score-card__value">{data.score}%</h2>
        </div>

        <div className="health-score-card__hero">
          <HeartPulse size={28} />
        </div>
      </div>

      <div className="health-score-card__trend">
        <div className="health-score-card__trend-row">
          <p className="health-score-card__text">{data.trend}</p>
          <span className="health-score-card__trend-badge">
            <ArrowUpRight size={12} /> Trending
          </span>
        </div>

        <p className="health-score-card__text">{data.highlight}</p>
      </div>

      <ul className="health-score-card__details">
        {data.details.map((detail) => (
          <li key={detail} className="health-score-card__detail">
            <span className="health-score-card__dot" />
            {detail}
          </li>
        ))}
      </ul>
    </section>
  );
}
