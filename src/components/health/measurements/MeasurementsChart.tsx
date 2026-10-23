import { useId, useMemo, useState } from 'react';
import { Activity, Calendar, TrendingDown, TrendingUp, Minus, X } from 'lucide-react';
import type { VitalCategory } from '../../../models/measurement';

export type Point = {
  date: string;
  value: number;
  displayValue?: string;
  notes?: string;
};

export interface Series {
  id: string;
  label: string;
  unit: string;
  category?: VitalCategory;
  normalRange?: string;
  points: Point[];
}

interface MeasurementsChartProps {
  series: Series[];
  initialSelectedId?: string;
  onClose: () => void;
}

const SERIES_COLORS: Record<string, { stroke: string; fill: string; badge: string }> = {
  'maternal-weight': {
    stroke: '#7c3aed',
    fill: 'rgba(124, 58, 237, 0.12)',
    badge: 'bg-purple-50 text-purple-700 ring-purple-200',
  },
  'baby-weight': {
    stroke: '#db2777',
    fill: 'rgba(219, 39, 119, 0.12)',
    badge: 'bg-pink-50 text-pink-700 ring-pink-200',
  },
  'blood-pressure': {
    stroke: '#e11d48',
    fill: 'rgba(225, 29, 72, 0.12)',
    badge: 'bg-rose-50 text-rose-700 ring-rose-200',
  },
  'fetal-heart-rate': {
    stroke: '#0d9488',
    fill: 'rgba(13, 148, 136, 0.12)',
    badge: 'bg-teal-50 text-teal-700 ring-teal-200',
  },
  'blood-sugar': {
    stroke: '#d97706',
    fill: 'rgba(217, 119, 6, 0.12)',
    badge: 'bg-amber-50 text-amber-700 ring-amber-200',
  },
  hemoglobin: {
    stroke: '#2563eb',
    fill: 'rgba(37, 99, 235, 0.12)',
    badge: 'bg-blue-50 text-blue-700 ring-blue-200',
  },
};

const DEFAULT_COLOR = {
  stroke: '#059669',
  fill: 'rgba(5, 150, 105, 0.12)',
  badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  if (!dateStr) return '';
  const parsed = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MeasurementsChart({
  series,
  initialSelectedId,
  onClose,
}: MeasurementsChartProps) {
  const titleId = useId();
  const seriesWithPoints = useMemo(
    () => series.filter((s) => s.points.length > 0),
    [series],
  );
  const availableSeries = seriesWithPoints.length > 0 ? seriesWithPoints : series;

  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialSelectedId && availableSeries.some((s) => s.id === initialSelectedId)) {
      return initialSelectedId;
    }
    return availableSeries[0]?.id ?? '';
  });

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeSeries = useMemo(
    () => availableSeries.find((s) => s.id === selectedId) ?? availableSeries[0],
    [availableSeries, selectedId],
  );

  const colorTheme = activeSeries
    ? SERIES_COLORS[activeSeries.id] ?? DEFAULT_COLOR
    : DEFAULT_COLOR;

  const sortedPoints = useMemo(() => {
    if (!activeSeries) return [];
    return [...activeSeries.points].sort((a, b) => a.date.localeCompare(b.date));
  }, [activeSeries]);

  const height = 230;
  const width = 620;
  const padding = { top: 24, right: 28, bottom: 36, left: 52 };

  const { yMin, yMax, yTicks } = useMemo(() => {
    if (sortedPoints.length === 0) {
      return { yMin: 0, yMax: 100, yTicks: [0, 25, 50, 75, 100] };
    }
    const values = sortedPoints.map((p) => p.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    if (minVal === maxVal) {
      const delta = Math.max(1, Math.abs(minVal * 0.1));
      const low = Math.max(0, Number((minVal - delta).toFixed(1)));
      const high = Number((maxVal + delta).toFixed(1));
      const step = (high - low) / 4;
      return {
        yMin: low,
        yMax: high,
        yTicks: [0, 1, 2, 3, 4].map((i) => Number((low + step * i).toFixed(1))),
      };
    }

    const spread = maxVal - minVal;
    const pad = spread * 0.15;
    const low = Math.max(0, Number((minVal - pad).toFixed(1)));
    const high = Number((maxVal + pad).toFixed(1));
    const step = (high - low) / 4;
    return {
      yMin: low,
      yMax: high,
      yTicks: [0, 1, 2, 3, 4].map((i) => Number((low + step * i).toFixed(1))),
    };
  }, [sortedPoints]);

  const xScale = (index: number) => {
    const usable = width - padding.left - padding.right;
    if (sortedPoints.length <= 1) {
      return padding.left + usable / 2;
    }
    return padding.left + (index / (sortedPoints.length - 1)) * usable;
  };

  const yScale = (val: number) => {
    const usable = height - padding.top - padding.bottom;
    const ratio = (val - yMin) / Math.max(0.0001, yMax - yMin);
    return padding.top + (1 - ratio) * usable;
  };

  const linePath = useMemo(() => {
    if (sortedPoints.length === 0) return '';
    return sortedPoints
      .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${xScale(idx)} ${yScale(p.value)}`)
      .join(' ');
  }, [sortedPoints, yMin, yMax]);

  const areaPath = useMemo(() => {
    if (sortedPoints.length < 2) return '';
    const baseline = height - padding.bottom;
    const firstX = xScale(0);
    const lastX = xScale(sortedPoints.length - 1);
    return `${linePath} L ${lastX} ${baseline} L ${firstX} ${baseline} Z`;
  }, [linePath, sortedPoints.length]);

  const hoveredPoint =
    hoveredIndex !== null && sortedPoints[hoveredIndex]
      ? sortedPoints[hoveredIndex]
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-[#faf9f6] shadow-2xl sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-100 bg-[#faf9f6]/95 px-5 py-4 backdrop-blur sm:px-6 sm:py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Activity size={20} />
            </div>
            <div>
              <h2 id={titleId} className="text-xl font-semibold text-gray-900">
                Vital Trends & History
              </h2>
              <p className="text-xs text-gray-500">
                Track how your pregnancy vitals and baby growth progress over time
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close trends modal"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {/* Vital Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {series.map((ser) => {
              const isSelected = activeSeries?.id === ser.id;
              const count = ser.points.length;
              return (
                <button
                  key={ser.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(ser.id);
                    setHoveredIndex(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{ser.label}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {activeSeries ? (
            <>
              {/* Active Vital Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      {activeSeries.label}
                    </h3>
                    {activeSeries.unit && (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {activeSeries.unit}
                      </span>
                    )}
                  </div>
                  {activeSeries.normalRange && (
                    <p className="mt-0.5 text-xs text-slate-500">
                      Typical reference: {activeSeries.normalRange}
                    </p>
                  )}
                </div>

                {sortedPoints.length > 0 && (
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-400">Latest Reading</p>
                    <p className="text-lg font-bold text-slate-900">
                      {sortedPoints[sortedPoints.length - 1].displayValue ??
                        sortedPoints[sortedPoints.length - 1].value}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        {activeSeries.unit}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* SVG Chart Card */}
              {sortedPoints.length > 0 ? (
                <div className="relative rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-100">
                  <svg
                    className="h-auto w-full overflow-visible"
                    viewBox={`0 0 ${width} ${height}`}
                  >
                    {/* Horizontal grid lines & Y-axis labels */}
                    {yTicks.map((tickValue, idx) => {
                      const y = yScale(tickValue);
                      return (
                        <g key={idx}>
                          <line
                            x1={padding.left}
                            x2={width - padding.right}
                            y1={y}
                            y2={y}
                            stroke="#f1f5f9"
                            strokeDasharray={idx === 0 ? undefined : '4 4'}
                            strokeWidth={1}
                          />
                          <text
                            x={padding.left - 8}
                            y={y + 4}
                            fontSize={10}
                            fill="#94a3b8"
                            textAnchor="end"
                          >
                            {tickValue}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area under curve */}
                    {areaPath && <path d={areaPath} fill={colorTheme.fill} />}

                    {/* Line path */}
                    {sortedPoints.length > 1 && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={colorTheme.stroke}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Data points & X-axis labels */}
                    {sortedPoints.map((pt, idx) => {
                      const cx = xScale(idx);
                      const cy = yScale(pt.value);
                      const isHovered = hoveredIndex === idx;
                      const showDateLabel =
                        sortedPoints.length <= 7 ||
                        idx === 0 ||
                        idx === sortedPoints.length - 1 ||
                        idx % Math.ceil(sortedPoints.length / 5) === 0;

                      return (
                        <g key={`${pt.date}-${idx}`}>
                          {showDateLabel && (
                            <text
                              x={cx}
                              y={height - 10}
                              fontSize={10}
                              fill="#64748b"
                              textAnchor="middle"
                            >
                              {formatShortDate(pt.date)}
                            </text>
                          )}
                          <circle
                            cx={cx}
                            cy={cy}
                            r={isHovered ? 6 : 4.5}
                            fill="#ffffff"
                            stroke={colorTheme.stroke}
                            strokeWidth={2.5}
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredIndex(idx)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() =>
                              setHoveredIndex(hoveredIndex === idx ? null : idx)
                            }
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {hoveredPoint && (
                    <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-2 text-xs text-white">
                      <span className="font-medium text-slate-300">
                        {formatFullDate(hoveredPoint.date)}
                      </span>
                      <span className="font-bold">
                        {hoveredPoint.displayValue ?? hoveredPoint.value}{' '}
                        {activeSeries.unit}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                  <p className="text-sm font-medium text-slate-600">
                    No readings logged for {activeSeries.label} yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Log a reading from the Vital Health Factors card to see trends over time.
                  </p>
                </div>
              )}

              {/* Historical Timeline List */}
              {sortedPoints.length > 0 && (
                <div className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-100">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Recorded History ({sortedPoints.length})
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {[...sortedPoints].reverse().map((pt, revIdx, arr) => {
                      const prevPt = arr[revIdx + 1];
                      const diff =
                        prevPt !== undefined
                          ? Number((pt.value - prevPt.value).toFixed(2))
                          : null;

                      return (
                        <div
                          key={`${pt.date}-${revIdx}`}
                          className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0"
                        >
                          <div className="flex items-center gap-2.5">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {formatFullDate(pt.date)}
                              </p>
                              {pt.notes && (
                                <p className="text-xs text-slate-500">{pt.notes}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5">
                            {diff !== null && diff !== 0 && (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
                                  diff > 0
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {diff > 0 ? (
                                  <TrendingUp size={12} />
                                ) : (
                                  <TrendingDown size={12} />
                                )}
                                {diff > 0 ? `+${diff}` : diff} {activeSeries.unit}
                              </span>
                            )}
                            {diff === 0 && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                <Minus size={12} />0 {activeSeries.unit}
                              </span>
                            )}
                            <span className="text-sm font-bold text-slate-900">
                              {pt.displayValue ?? pt.value} {activeSeries.unit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
              No vital measurements available to chart.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

