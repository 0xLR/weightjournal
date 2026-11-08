import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { ChartRange } from '../types/weight';

interface RangeSelectorProps {
  currentRange: ChartRange;
  customStartDate?: string;
  customEndDate?: string;
  onSelectRange: (range: ChartRange, customStart?: string, customEnd?: string) => void;
}

export const RangeSelector: React.FC<RangeSelectorProps> = ({
  currentRange,
  customStartDate,
  customEndDate,
  onSelectRange,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [startInput, setStartInput] = useState(customStartDate || '');
  const [endInput, setEndInput] = useState(customEndDate || '');

  const ranges: { key: ChartRange; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '30d', label: '30D' },
    { key: '3m', label: '3M' },
    { key: '6m', label: '6M' },
    { key: '12m', label: '12M' },
    { key: 'custom', label: 'Custom' },
  ];

  const handleRangeClick = (r: ChartRange) => {
    if (r === 'custom') {
      setShowCustomModal(true);
    } else {
      onSelectRange(r);
    }
  };

  const handleApplyCustom = () => {
    if (startInput && endInput) {
      onSelectRange('custom', startInput, endInput);
      setShowCustomModal(false);
    }
  };

  return (
    <div className="range-selector-wrapper">
      <div className="range-pills">
        {ranges.map((r) => (
          <button
            key={r.key}
            className={`range-pill ${currentRange === r.key ? 'active' : ''}`}
            onClick={() => handleRangeClick(r.key)}
          >
            {r.key === 'custom' && <Calendar size={12} className="pill-icon" />}
            {r.label}
          </button>
        ))}
      </div>

      {showCustomModal && (
        <div className="modal-backdrop" onClick={() => setShowCustomModal(false)}>
          <div className="modal-card range-custom-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Custom Date Range</h3>
            <p className="modal-desc">Select start and end dates for the chart view.</p>
            
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="input-field"
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleApplyCustom}
                disabled={!startInput || !endInput}
              >
                Apply Range
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
