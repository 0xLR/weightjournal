import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Unit } from '../types/weight';
import { setSetting, addWeight, displayToKg } from '../services/api';

interface FirstRunWizardProps {
  onComplete: () => void;
}

export const FirstRunWizard: React.FC<FirstRunWizardProps> = ({ onComplete }) => {
  const [unit, setUnit] = useState<Unit>('lb');
  const [currentWeight, setCurrentWeight] = useState('');
  const [startWeight, setStartWeight] = useState('');
  const [goalWeight, setGoalWeight] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const currNum = parseFloat(currentWeight);
    if (isNaN(currNum) || currNum <= 0) {
      setErrorMsg('Please enter your current weight to get started.');
      return;
    }

    try {
      // Save unit setting
      await setSetting('unit', unit);

      // Save goal weight if entered
      if (goalWeight && !isNaN(parseFloat(goalWeight))) {
        const goalKg = displayToKg(parseFloat(goalWeight), unit);
        await setSetting('goal_weight', String(goalKg));
      }

      // Add starting weight entry if provided and different date or value
      if (startWeight && !isNaN(parseFloat(startWeight))) {
        // We add start weight 30 days prior if user entered a starting weight
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const startValKg = displayToKg(parseFloat(startWeight), unit);
        await addWeight(d.toISOString().split('T')[0], startValKg);
      }

      // Add current weight entry for today
      const currValKg = displayToKg(currNum, unit);
      await addWeight(getTodayStr(), currValKg);

      onComplete();
    } catch (err: any) {
      setErrorMsg(err.toString() || 'Setup failed. Please try again.');
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card wizard-card">
        <div className="wizard-header">
          <Sparkles className="wizard-icon" size={28} />
          <h2>Welcome to Weight Journal!</h2>
          <p>Let's set up your weight tracker in 10 seconds.</p>
        </div>

        <form onSubmit={handleSubmit} className="wizard-form">
          <div className="form-group">
            <label>Weight Unit</label>
            <div className="unit-toggle-pills">
              <button
                type="button"
                className={`toggle-pill ${unit === 'lb' ? 'active' : ''}`}
                onClick={() => setUnit('lb')}
              >
                Pounds (lb)
              </button>
              <button
                type="button"
                className={`toggle-pill ${unit === 'kg' ? 'active' : ''}`}
                onClick={() => setUnit('kg')}
              >
                Kilograms (kg)
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Current Weight ({unit})</label>
            <input
              type="number"
              step="0.1"
              placeholder={unit === 'lb' ? 'e.g. 214.2' : 'e.g. 97.1'}
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="input-field"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Starting Weight (optional)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 240.0"
              value={startWeight}
              onChange={(e) => setStartWeight(e.target.value)}
              className="input-field"
            />
          </div>

          <div className="form-group">
            <label>Goal Weight (optional)</label>
            <input
              type="number"
              step="0.1"
              placeholder="e.g. 190.0"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
              className="input-field"
            />
          </div>

          {errorMsg && <div className="error-message">{errorMsg}</div>}

          <button type="submit" className="btn btn-primary btn-block mt-4">
            Get Started
          </button>
        </form>
      </div>
    </div>
  );
};
