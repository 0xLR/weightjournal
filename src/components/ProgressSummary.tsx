import React from 'react';
import { Target, TrendingDown, ArrowDownRight, ArrowUpRight, Award } from 'lucide-react';
import { WeightEntry, Unit, BaselineMode } from '../types/weight';
import { kgToDisplay, formatWeight } from '../services/api';

interface ProgressSummaryProps {
  entries: WeightEntry[];
  firstEntry: WeightEntry | null;
  unit: Unit;
  goalWeightKg: number | null;
  baselineMode: BaselineMode;
}

export const ProgressSummary: React.FC<ProgressSummaryProps> = ({
  entries,
  firstEntry,
  unit,
  goalWeightKg,
  baselineMode,
}) => {
  if (entries.length === 0) return null;

  const currentEntry = entries[entries.length - 1]; // latest in date ASC order
  const currentKg = currentEntry.weight_kg;

  // Determine baseline weight
  let baselineKg = currentKg;
  if (baselineMode === 'first_entry' && firstEntry) {
    baselineKg = firstEntry.weight_kg;
  } else if (baselineMode === 'period_start' && entries.length > 0) {
    baselineKg = entries[0].weight_kg;
  }

  const changeKg = currentKg - baselineKg;
  const changeDisplay = Math.abs(kgToDisplay(changeKg, unit));
  const changePercent = baselineKg > 0 ? (changeKg / baselineKg) * 100 : 0;
  const isLoss = changeKg <= 0;

  // Goal calculations
  let remainingKg: number | null = null;
  let percentToGoal: number | null = null;

  if (goalWeightKg !== null) {
    remainingKg = currentKg - goalWeightKg;
    const initialToGoal = baselineKg - goalWeightKg;
    if (initialToGoal !== 0) {
      const progress = ((baselineKg - currentKg) / initialToGoal) * 100;
      percentToGoal = Math.min(Math.max(Number(progress.toFixed(1)), 0), 100);
    }
  }

  // Min / Max in range
  const allKg = entries.map((e) => e.weight_kg);
  const minKg = Math.min(...allKg);
  const maxKg = Math.max(...allKg);

  return (
    <div className="progress-summary-grid">
      {/* Current Weight Card */}
      <div className="stat-card primary-card">
        <div className="stat-header">
          <span className="stat-title">Current</span>
          <span className="stat-date">{currentEntry.date}</span>
        </div>
        <div className="stat-value">{formatWeight(currentKg, unit)}</div>
        <div className={`stat-badge ${isLoss ? 'loss-badge' : 'gain-badge'}`}>
          {isLoss ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
          <span>
            {isLoss ? '↓' : '↑'} {changeDisplay.toFixed(1)} {unit} ({Math.abs(changePercent).toFixed(1)}%)
          </span>
        </div>
      </div>

      {/* Goal Card */}
      {goalWeightKg !== null ? (
        <div className="stat-card goal-card">
          <div className="stat-header">
            <span className="stat-title">Goal Target</span>
            <Target size={14} className="stat-icon" />
          </div>
          <div className="stat-value">{formatWeight(goalWeightKg, unit)}</div>
          <div className="stat-subtext">
            {remainingKg !== null && (
              <span>
                {remainingKg <= 0
                  ? 'Goal Achieved! 🎉'
                  : `${kgToDisplay(remainingKg, unit).toFixed(1)} ${unit} remaining`}
              </span>
            )}
          </div>
          {percentToGoal !== null && (
            <div className="goal-progress-bar">
              <div
                className="goal-progress-fill"
                style={{ width: `${percentToGoal}%` }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="stat-card minmax-card">
          <div className="stat-header">
            <span className="stat-title">Range Low / High</span>
            <TrendingDown size={14} className="stat-icon" />
          </div>
          <div className="stat-value-split">
            <div>
              <span className="mini-label">Lowest</span>
              <strong>{formatWeight(minKg, unit)}</strong>
            </div>
            <div className="split-divider" />
            <div>
              <span className="mini-label">Highest</span>
              <strong>{formatWeight(maxKg, unit)}</strong>
            </div>
          </div>
        </div>
      )}

      {/* Additional Stats Card if Goal present */}
      {goalWeightKg !== null && (
        <div className="stat-card minmax-card">
          <div className="stat-header">
            <span className="stat-title">Range Bounds</span>
            <Award size={14} className="stat-icon" />
          </div>
          <div className="stat-value-split">
            <div>
              <span className="mini-label">Lowest</span>
              <strong>{formatWeight(minKg, unit)}</strong>
            </div>
            <div className="split-divider" />
            <div>
              <span className="mini-label">Highest</span>
              <strong>{formatWeight(maxKg, unit)}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
