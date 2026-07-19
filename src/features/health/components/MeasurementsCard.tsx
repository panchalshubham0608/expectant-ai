import '../../../styles/features/health/components/MeasurementsCard.css';
import type { Measurement } from '../types';

interface MeasurementsCardProps {
  measurements: Measurement[];
}

export default function MeasurementsCard({ measurements }: MeasurementsCardProps) {
  return (
    <section className="measurements-card">
      <div className="measurements-card__header">
        <div>
          <p className="measurements-card__label">Measurements</p>
          <h2 className="measurements-card__title">Vitals & Growth</h2>
        </div>

        <span className="measurements-card__meta">Updated weekly</span>
      </div>

      <div className="measurements-card__grid">
        {measurements.map((measurement) => (
          <div key={measurement.label} className="measurement-item">
            <p className="measurement-item__label">{measurement.label}</p>
            <p className="measurement-item__value">{measurement.value}</p>
            <p className="measurement-item__change">{measurement.change}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
