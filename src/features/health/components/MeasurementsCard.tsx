import '../../../styles/features/health/components/MeasurementsCard.css';
import { Edit3, X, Check, Activity } from 'lucide-react';
import { useState } from 'react';
import MeasurementsChart from './MeasurementsChart';
import type { Measurement } from '../types';

interface MeasurementsCardProps {
  measurements: Measurement[];
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  }).format(date);
};

const isNumericMeasurement = (label: string): boolean => {
  return label !== 'Blood Pressure';
};

const calculateChange = (
  newNumericValue: string,
  previousValue: string | undefined,
  label: string,
): string => {
  if (!previousValue || !isNumericMeasurement(label)) return '';

  const newNum = parseFloat(newNumericValue);
  const prevNum = parseFloat(previousValue);

  if (isNaN(newNum) || isNaN(prevNum)) return '';

  const diff = newNum - prevNum;
  const sign = diff > 0 ? '+' : '';
  const rounded = diff.toFixed(2);

  return `${sign}${rounded}`;
};

const getTodayDateString = (): string => {
  const today = new Date(); // Current date from context
  return today.toISOString().split('T')[0];
};

const formatValue = (value: string, label: string): string => {
  if (isNumericMeasurement(label)) {
    const num = parseFloat(value);
    return isNaN(num) ? '0' : Math.round(num * 100) / 100 + ''; // Round to 2 decimal place    
  }
  return value;
}

export default function MeasurementsCard({ measurements }: MeasurementsCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isChartOpen, setIsChartOpen] = useState(false);
  const [lastMeasuredDate, setLastMeasuredDate] = useState<string>(
    measurements[0]?.lastMeasuredDate || getTodayDateString(),
  );
  const [formData, setFormData] = useState<Measurement[]>(
    measurements.map((m) => ({
      ...m,
      value: m.value,
    })),
  );

  // Create a map of measurement units for consistent lookup
  const unitMap = new Map(measurements.map((m) => [m.id, m.unit]));

  const chartSeries = formData
    .filter((m) => isNumericMeasurement(m.label))
    .map((m) => {
      const unit = unitMap.get(m.id) || '';
      // build 3 sample points: 4 days ago, 2 days ago (previous), today (current)
      const base = new Date(lastMeasuredDate || getTodayDateString());
      const d1 = new Date(base);
      d1.setDate(base.getDate() - 4);
      const d2 = new Date(base);
      d2.setDate(base.getDate() - 2);
      const d3 = new Date(base);

      const prev =
        parseFloat(
          measurements.find((mm) => mm.id === m.id)?.previousValue?.match(/(-?\d+\.?\d*)/)?.[1] ||
          '',
        ) || 0;
      const cur = parseFloat(String(m.value)) || prev;
      const older = Math.max(0, prev - (cur - prev));

      return {
        id: m.id,
        label: m.label,
        unit,
        points: [
          { date: d1.toISOString().split('T')[0], value: Number(older.toFixed(2)) },
          { date: d2.toISOString().split('T')[0], value: Number(prev.toFixed(2)) },
          { date: d3.toISOString().split('T')[0], value: Number(cur.toFixed(2)) },
        ],
      };
    });

  const handleMeasurementChange = (id: string, value: string) => {
    setFormData((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return { ...m, value: value };
        }
        return m;
      }),
    );
  };

  const handleSave = () => {
    // Update all measurements with the common lastMeasuredDate
    setFormData((prev) =>
      prev.map((m) => ({
          ...m,
          previousValue: measurements.find((mm) => mm.id === m.id)?.value,
          lastMeasuredDate,
        }))
    );
    // TODO: Persist changes to backend
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData(
      measurements.map((m) => ({
        ...m,
        value: m.value,
      })),
    );
    setLastMeasuredDate(measurements[0]?.lastMeasuredDate || getTodayDateString());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <section className="measurements-card">
        <div className="measurements-card__header">
          <div>
            <p className="measurements-card__label">Measurements</p>
            <h2 className="measurements-card__title">Vitals & Growth</h2>
          </div>

          <div className="measurements-card__icon" onClick={() => setIsChartOpen(true)}>
            <Activity size={18} />
          </div>
        </div>

        <div className="measurements-card__form">
          {formData.map((measurement) => (
            <div key={measurement.id} className="measurements-card__form-group">
              <div className="measurements-card__form-row">
                <div className="measurements-card__form-field">
                  <label className="measurements-card__form-label">
                    {measurement.label} {measurement.unit && `(${measurement.unit})`}
                  </label>
                  <input
                    type={isNumericMeasurement(measurement.label) ? 'number' : 'text'}
                    value={measurement.value || ''}
                    onChange={(e) => handleMeasurementChange(measurement.id, e.target.value)
                    }
                    className="measurements-card__form-input"
                    placeholder={
                      isNumericMeasurement(measurement.label) ? 'e.g., 62.6' : 'e.g., 118/76'
                    }
                    step="0.1"
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="measurements-card__form-field">
            <label className="measurements-card__form-label">Last Measured</label>
            <input
              type="date"
              value={lastMeasuredDate}
              onChange={(e) => setLastMeasuredDate(e.target.value)}
              className="measurements-card__form-input"
            />
          </div>
        </div>

        <div className="measurements-card__form-actions">
          <button
            type="button"
            onClick={handleSave}
            className="measurements-card__form-button measurements-card__form-button--save"
          >
            <Check size={16} />
            Save
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="measurements-card__form-button measurements-card__form-button--cancel"
          >
            <X size={16} />
            Cancel
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="measurements-card">
      <div className="measurements-card__header">
        <div>
          <p className="measurements-card__label">Measurements</p>
          <h2 className="measurements-card__title">Vitals & Growth</h2>
        </div>

        <div className="measurements-card__icon-group">
          <div
            className="measurements-card__icon"
            role="button"
            tabIndex={0}
            onClick={() => setIsChartOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setIsChartOpen(true);
            }}
          >
            <Activity size={18} />
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="measurements-card__edit-button"
          >
            <Edit3 size={16} />
          </button>
        </div>
      </div>

      <div className="measurements-card__grid">
        {formData.map((measurement) => {
          const change = calculateChange(measurement.value, measurement.previousValue, measurement.label);
          return (
            <div key={measurement.id} className="measurement-item">
              <p className="measurement-item__label">{measurement.label}</p>
              <p className="measurement-item__value">{formatValue(measurement.value, measurement.label)} {measurement.unit}</p>
              {change &&
                <p className="measurement-item__change">
                  {formatValue(change, measurement.label)} {measurement.unit}
                </p>}
              {measurement.lastMeasuredDate && <p className="measurement-item__date">{formatDate(measurement.lastMeasuredDate)}</p>}
            </div>
          );
        })}
      </div>
      {isChartOpen && (
        <MeasurementsChart series={chartSeries} onClose={() => setIsChartOpen(false)} />
      )}
    </section>
  );
}
