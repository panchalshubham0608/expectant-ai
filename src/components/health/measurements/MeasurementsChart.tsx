import './MeasurementsChart.css';
import { useMemo, useState } from 'react';

type Point = { date: string; value: number };

interface Series {
  id: string;
  label: string;
  unit: string;
  points: Point[];
}

interface MeasurementsChartProps {
  series: Series[];
  onClose: () => void;
}

const colors = ['#059669', '#0ea5a4', '#7c3aed', '#f97316'];

function formatDateLabel(d: string) {
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function MeasurementsChart({ series, onClose }: MeasurementsChartProps) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(series.map((s) => [s.id, true])),
  );
  const [hover, setHover] = useState<{ x: number; y: number; label: string; value: string } | null>(
    null,
  );

  const allDates = useMemo(() => {
    const s = new Set<string>();
    series.forEach((ser) => ser.points.forEach((p) => s.add(p.date)));
    return Array.from(s).sort((a, b) => +new Date(a) - +new Date(b));
  }, [series]);

  const height = 220;
  const width = 640;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };

  const xScale = (date: string) => {
    const i = allDates.indexOf(date);
    if (i === -1) return padding.left;
    const usable = width - padding.left - padding.right;
    return padding.left + (i / Math.max(1, allDates.length - 1)) * usable;
  };

  const yMax = useMemo(() => {
    let m = -Infinity;
    series.forEach((ser) => ser.points.forEach((p) => (m = Math.max(m, p.value))));
    return m === -Infinity ? 1 : m;
  }, [series]);
  const yMin = 0;
  const yScale = (v: number) => {
    const usable = height - padding.top - padding.bottom;
    return padding.top + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * usable;
  };

  return (
    <div className="measurements-chart__overlay" onClick={onClose}>
      <div className="measurements-chart__modal" onClick={(e) => e.stopPropagation()}>
        <div className="measurements-chart__header">
          <h3 className="measurements-chart__title">Measurements Trends</h3>
          <button className="measurements-chart__close" onClick={onClose}>
            Close
          </button>
        </div>

        <svg className="measurements-chart__svg" viewBox={`0 0 ${width} ${height}`}>
          {/* grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <line
              key={i}
              x1={padding.left}
              x2={width - padding.right}
              y1={padding.top + t * (height - padding.top - padding.bottom)}
              y2={padding.top + t * (height - padding.top - padding.bottom)}
              stroke="#e6e6e6"
            />
          ))}

          {/* series paths */}
          {series.map((ser, idx) => {
            if (!visible[ser.id]) return null;
            const path = ser.points
              .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.date)} ${yScale(p.value)}`)
              .join(' ');
            return (
              <g key={ser.id}>
                <path d={path} fill="none" stroke={colors[idx % colors.length]} strokeWidth={2} />
                {ser.points.map((p) => (
                  <circle
                    key={p.date + ser.id}
                    cx={xScale(p.date)}
                    cy={yScale(p.value)}
                    r={4}
                    fill={colors[idx % colors.length]}
                    onMouseEnter={() =>
                      setHover({
                        x: xScale(p.date),
                        y: yScale(p.value),
                        label: ser.label,
                        value: `${p.value} ${ser.unit}`,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                ))}
              </g>
            );
          })}

          {/* x labels */}
          {allDates.map((d) => (
            <text key={d} x={xScale(d)} y={height - 6} fontSize={10} textAnchor="middle">
              {formatDateLabel(d)}
            </text>
          ))}
        </svg>

        <div className="measurements-chart__legend">
          {series.map((ser, i) => (
            <label key={ser.id} className="measurements-chart__legend-item">
              <input
                type="checkbox"
                checked={!!visible[ser.id]}
                onChange={() => setVisible((v) => ({ ...v, [ser.id]: !v[ser.id] }))}
              />
              <span
                style={{ background: colors[i % colors.length] }}
                className="measurements-chart__legend-swatch"
              />
              {ser.label}
            </label>
          ))}
        </div>

        {hover && (
          <div
            className="measurements-chart__tooltip"
            style={{ left: hover.x + 8, top: hover.y - 12 }}
          >
            <div className="measurements-chart__tooltip-label">{hover.label}</div>
            <div className="measurements-chart__tooltip-value">{hover.value}</div>
          </div>
        )}
      </div>
    </div>
  );
}
