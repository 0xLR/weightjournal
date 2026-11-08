import React, { useState, useEffect, useRef } from 'react';
import { Unit, WeightEntry } from '../types/weight';
import { getWeight, addWeight, updateWeight, displayToKg, kgToDisplay } from '../services/api';

interface AddWeightModalProps {
  unit: Unit;
  onClose: () => void;
  onSuccess: () => void;
  initialEntry?: WeightEntry | null; // set when editing
}

export const AddWeightModal: React.FC<AddWeightModalProps> = ({
  unit,
  onClose,
  onSuccess,
  initialEntry,
}) => {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(initialEntry ? initialEntry.date : getTodayStr());
  const [weightVal, setWeightVal] = useState(
    initialEntry ? String(kgToDisplay(initialEntry.weight_kg, unit)) : ''
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [existingEntry, setExistingEntry] = useState<WeightEntry | null>(null);
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false);

  const weightInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus weight input on mount
    setTimeout(() => {
      weightInputRef.current?.focus();
      weightInputRef.current?.select();
    }, 100);
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const num = parseFloat(weightVal);
    if (isNaN(num) || num <= 0) {
      setErrorMsg('Please enter a valid weight.');
      return;
    }

    const minWeight = unit === 'lb' ? 40 : 18;
    const maxWeight = unit === 'lb' ? 1000 : 450;

    if (num < minWeight || num > maxWeight) {
      setErrorMsg(`Weight must be between ${minWeight} and ${maxWeight} ${unit}.`);
      return;
    }

    const targetKg = displayToKg(num, unit);

    try {
      // If editing existing entry by ID
      if (initialEntry) {
        await updateWeight(initialEntry.id, date, targetKg);
        onSuccess();
        onClose();
        return;
      }

      // Check if entry exists for this date
      const existing = await getWeight(date);
      if (existing && !showReplaceConfirm) {
        setExistingEntry(existing);
        setShowReplaceConfirm(true);
        return;
      }

      if (existing && showReplaceConfirm) {
        await updateWeight(existing.id, date, targetKg);
      } else {
        await addWeight(date, targetKg);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.toString() || 'Failed to save weight.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-card add-weight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{initialEntry ? 'Edit Weight Entry' : 'Add Weight Entry'}</h3>
          <button className="modal-close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        {showReplaceConfirm && existingEntry ? (
          <div className="replace-warning-box">
            <p>
              A weight entry already exists for <strong>{date}</strong>.
            </p>
            <div className="existing-val-highlight">
              Current: {kgToDisplay(existingEntry.weight_kg, unit).toFixed(1)} {unit}
            </div>
            <p className="subtext">Would you like to replace it with <strong>{parseFloat(weightVal).toFixed(1)} {unit}</strong>?</p>

            <div className="modal-actions mt-4">
              <button className="btn btn-secondary" onClick={() => setShowReplaceConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={() => handleSubmit()}>
                Replace Entry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal-body">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div className="form-group">
              <label>Weight ({unit})</label>
              <div className="input-with-unit">
                <input
                  ref={weightInputRef}
                  type="number"
                  step="0.1"
                  placeholder="e.g. 175.4"
                  value={weightVal}
                  onChange={(e) => setWeightVal(e.target.value)}
                  className="input-field weight-input"
                  required
                />
                <span className="unit-badge">{unit}</span>
              </div>
            </div>

            {errorMsg && <div className="error-message">{errorMsg}</div>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Entry
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
