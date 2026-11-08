import React, { useState, useMemo } from 'react';
import { WeightEntry, Unit } from '../types/weight';
import { kgToDisplay, formatWeight } from '../services/api';

interface WeightChartProps {
  entries: WeightEntry[];
  unit: Unit;
  showRaw: boolean;
  showTrend: boolean;
  goalWeightKg: number | null;
  showGoalLine: boolean;
}

interface TrendPoint {
  date: string;
  rawKg: number;
  trendKg: number;
}

export const WeightChart: React.FC<WeightChartProps> = ({
  entries,
  unit,
  showRaw,
  showTrend,
  goalWeightKg,
  showGoalLine,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Compute 7-day moving average
  const chartPoints: TrendPoint[] = useMemo(() => {
    if (entries.length === 0) return [];

    return entries.map((entry) => {
      const entryDate = new Date(entry.date);
      const sevenDaysAgo = new Date(entryDate);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

      // Find all entries within [sevenDaysAgo, entryDate]
      const windowEntries = entries.filter((e) => {
        const d = new Date(e.date);
        return d >= sevenDaysAgo && d <= entryDate;
      });

      const sum = windowEntries.reduce((acc, curr) => acc + curr.weight_kg, 0);
      const avg = sum / windowEntries.length;

      return {
        date: entry.date,
        rawKg: entry.weight_kg,
        trendKg: avg,
      };
    });
  }, [entries]);

  if (entries.length === 0) {
    return null;
  }

  // Calculate Y min and Y max
  const allRawVals = entries.map((e) => kgToDisplay(e.weight_kg, unit));
  const allTrendVals = chartPoints.map((p) => kgToDisplay(p.trendKg, unit));

  let minVal = Math.min(...allRawVals, ...allTrendVals);
  let maxVal = Math.max(...allRawVals, ...allTrendVals);

  if (goalWeightKg !== null && showGoalLine) {
    const goalVal = kgToDisplay(goalWeightKg, unit);
    minVal = Math.min(minVal, goalVal);
    maxVal = Math.max(maxVal, goalVal);
  }

  const valRange = maxVal - minVal;
  const padding = valRange > 0 ? valRange * 0.12 : 2.0;
  const yMin = Math.floor(minVal - padding);
  const yMax = Math.ceil(maxVal + padding);

  // SVG viewport dimensions
  const svgWidth = 600;
  const svgHeight = 280;
  const marginTop = 20;
  const marginBottom = 35;
  const marginLeft = 45;
  const marginRight = 25;

  const plotWidth = svgWidth - marginLeft - marginRight;
  const plotHeight = svgHeight - marginTop - marginBottom;

  // Scale helpers
  const getX = (index: number) => {
    if (entries.length === 1) return marginLeft + plotWidth / 2;
    return marginLeft + (index / (entries.length - 1)) * plotWidth;
  };

  const getY = (valDisplay: number) => {
    if (yMax === yMin) return marginTop + plotHeight / 2;
    const ratio = (valDisplay - yMin) / (yMax - yMin);
    return marginTop + plotHeight - ratio * plotHeight;
  };

  // Generate paths
  const rawPoints = chartPoints.map((p, idx) => ({
    x: getX(idx),
    y: getY(kgToDisplay(p.rawKg, unit)),
  }));

  const trendPoints = chartPoints.map((p, idx) => ({
    x: getX(idx),
    y: getY(kgToDisplay(p.trendKg, unit)),
  }));

  const rawPathD =
    rawPoints.length > 0
      ? rawPoints.reduce(
          (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
          ''
        )
      : '';

  const trendPathD =
    trendPoints.length > 0
      ? trendPoints.reduce(
          (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
          ''
        )
      : '';

  // Area fill under trend or raw
  const activePathPoints = showTrend ? trendPoints : rawPoints;
  const areaD =
    activePathPoints.length > 1
      ? `${activePathPoints.reduce(
          (acc, pt, i) => (i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`),
          ''
        )} L ${activePathPoints[activePathPoints.length - 1].x},${marginTop + plotHeight} L ${
          activePathPoints[0].x
        },${marginTop + plotHeight} Z`
      : '';

  // Gridlines & Ticks (4 ticks)
  const yTicks: number[] = [];
  const tickCount = 4;
  const step = (yMax - yMin) / (tickCount - 1);
  for (let i = 0; i < tickCount; i++) {
    yTicks.push(Number((yMin + i * step).toFixed(1)));
  }

  // X-axis label formatter
  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // X Ticks (up to 5 labels)
  const xTickIndices: number[] = [];
  if (entries.length <= 5) {
    for (let i = 0; i < entries.length; i++) xTickIndices.push(i);
  } else {
    const interval = (entries.length - 1) / 4;
    for (let i = 0; i < 5; i++) {
      xTickIndices.push(Math.round(i * interval));
    }
  }

  // Goal Line Y
  const goalY =
    goalWeightKg !== null && showGoalLine
      ? getY(kgToDisplay(goalWeightKg, unit))
      : null;

  // Active hovered point details
  const hoveredEntry = hoveredIdx !== null ? entries[hoveredIdx] : null;
  const hoveredTrend = hoveredIdx !== null ? chartPoints[hoveredIdx] : null;

  let deltaStr = '';
  if (hoveredIdx !== null && hoveredIdx > 0) {
    const prevKg = entries[hoveredIdx - 1].weight_kg;
    const diffKg = entries[hoveredIdx].weight_kg - prevKg;
    const diffVal = kgToDisplay(Math.abs(diffKg), unit);
    const sign = diffKg > 0 ? '+' : '-';
    deltaStr = `${sign}${diffVal} ${unit}`;
  }

  return (
    <div className="weight-chart-container">
      <svg
        className="svg-chart"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
          </linearGradient>

          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal Gridlines & Y-Axis Labels */}
        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={`y-grid-${i}`}>
              <line
                x1={marginLeft}
                y1={y}
                x2={svgWidth - marginRight}
                y2={y}
                className="grid-line"
              />
              <text
                x={marginLeft - 8}
                y={y + 4}
                className="axis-label y-axis-label"
                textAnchor="end"
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* X-Axis Date Labels */}
        {xTickIndices.map((idx) => {
          if (!entries[idx]) return null;
          const x = getX(idx);
          return (
            <text
              key={`x-tick-${idx}`}
              x={x}
              y={svgHeight - 10}
              className="axis-label x-axis-label"
              textAnchor="middle"
            >
              {formatDateLabel(entries[idx].date)}
            </text>
          );
        })}

        {/* Area Gradient Fill */}
        {areaD && <path d={areaD} fill="url(#areaGradient)" />}

        {/* Goal Reference Line */}
        {goalY !== null && (
          <g className="goal-line-group">
            <line
              x1={marginLeft}
              y1={goalY}
              x2={svgWidth - marginRight}
              y2={goalY}
              className="goal-line"
            />
            <text
              x={svgWidth - marginRight + 4}
              y={goalY + 4}
              className="goal-label"
            >
              Goal
            </text>
          </g>
        )}

        {/* Raw Measurement Polyline */}
        {showRaw && rawPathD && (
          <path d={rawPathD} className="chart-path raw-path" />
        )}

        {/* 7-Day Moving Average Trend Line */}
        {showTrend && trendPathD && (
          <path d={trendPathD} className="chart-path trend-path" filter="url(#glow)" />
        )}

        {/* Data Points (Dots) */}
        {showRaw &&
          rawPoints.map((pt, i) => (
            <circle
              key={`raw-dot-${i}`}
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 6 : 3.5}
              className={`data-dot ${hoveredIdx === i ? 'hovered' : ''}`}
              onMouseEnter={() => setHoveredIdx(i)}
            />
          ))}

        {/* Hover Vertical Guide Line */}
        {hoveredIdx !== null && (
          <line
            x1={getX(hoveredIdx)}
            y1={marginTop}
            x2={getX(hoveredIdx)}
            y2={marginTop + plotHeight}
            className="hover-guide-line"
          />
        )}

        {/* Invisible Overlay Rects for Easy Hovering */}
        {entries.map((_, i) => {
          const x = getX(i);
          const prevX = i > 0 ? getX(i - 1) : marginLeft;
          const nextX = i < entries.length - 1 ? getX(i + 1) : svgWidth - marginRight;
          const rectLeft = (x + prevX) / 2;
          const rectRight = (x + nextX) / 2;
          const width = rectRight - rectLeft;

          return (
            <rect
              key={`hover-rect-${i}`}
              x={rectLeft}
              y={marginTop}
              width={Math.max(width, 10)}
              height={plotHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIdx(i)}
            />
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoveredIdx !== null && hoveredEntry && hoveredTrend && (
        <div
          className="chart-tooltip"
          style={{
            left: `${(getX(hoveredIdx) / svgWidth) * 100}%`,
          }}
        >
          <div className="tooltip-date">{hoveredEntry.date}</div>
          <div className="tooltip-row">
            <span>Weight:</span>
            <strong>{formatWeight(hoveredEntry.weight_kg, unit)}</strong>
          </div>
          {showTrend && (
            <div className="tooltip-row">
              <span>7-Day Avg:</span>
              <strong>{formatWeight(hoveredTrend.trendKg, unit)}</strong>
            </div>
          )}
          {deltaStr && (
            <div className="tooltip-row delta">
              <span>Change:</span>
              <strong className={deltaStr.startsWith('-') ? 'loss' : 'gain'}>
                {deltaStr}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
