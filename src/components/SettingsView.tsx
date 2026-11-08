import React, { useState } from 'react';
import { ArrowLeft, Download, Upload, Database as DbIcon, FileSpreadsheet, CheckCircle, AlertCircle, LogOut, Minus } from 'lucide-react';
import { UserSettings, Unit, ChartRange, ThemeMode, CsvPreview, ImportSummary } from '../types/weight';
import {
  setSetting,
  setAlwaysOnTop,
  setStartWithWindows,
  selectSaveFile,
  selectOpenFile,
  exportCsv,
  exportDatabase,
  importDatabase,
  previewCsvImport,
  importCsv,
  kgToDisplay,
  displayToKg,
  closeApp,
  hideWindow,
} from '../services/api';

interface SettingsViewProps {
  settings: UserSettings;
  onRefreshSettings: () => void;
  onBackToChart: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onRefreshSettings,
  onBackToChart,
}) => {
  // Goal Weight Input local state
  const goalValDisplay = settings.goal_weight
    ? String(kgToDisplay(parseFloat(settings.goal_weight), settings.unit))
    : '';

  const [goalInput, setGoalInput] = useState(goalValDisplay);
  const [csvPreview, setCsvPreview] = useState<CsvPreview | null>(null);
  const [csvPath, setCsvPath] = useState<string | null>(null);
  const [replaceDuplicates, setReplaceDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<ImportSummary | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleUnitChange = async (newUnit: Unit) => {
    await setSetting('unit', newUnit);
    onRefreshSettings();
  };

  const handleSaveGoal = async () => {
    if (!goalInput || isNaN(parseFloat(goalInput))) {
      await setSetting('goal_weight', '');
    } else {
      const kg = displayToKg(parseFloat(goalInput), settings.unit);
      await setSetting('goal_weight', String(kg));
    }
    onRefreshSettings();
    setStatusMsg({ text: 'Goal weight updated.' });
  };

  const handleToggleGoalLine = async (checked: boolean) => {
    await setSetting('show_goal_line', checked ? 'true' : 'false');
    onRefreshSettings();
  };

  const handleChartRangeChange = async (range: ChartRange) => {
    await setSetting('chart_range', range);
    onRefreshSettings();
  };

  const handleToggleRaw = async (checked: boolean) => {
    await setSetting('show_raw', checked ? 'true' : 'false');
    onRefreshSettings();
  };

  const handleToggleTrend = async (checked: boolean) => {
    await setSetting('show_trend', checked ? 'true' : 'false');
    onRefreshSettings();
  };

  const handleThemeChange = async (theme: ThemeMode) => {
    await setSetting('theme', theme);
    onRefreshSettings();
  };

  const handleAlwaysOnTopChange = async (checked: boolean) => {
    try {
      await setAlwaysOnTop(checked);
      onRefreshSettings();
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  const handleStartWithWindowsChange = async (checked: boolean) => {
    try {
      await setStartWithWindows(checked);
      onRefreshSettings();
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  // CSV Export
  const handleExportCsv = async () => {
    try {
      const path = await selectSaveFile(
        'Export Weight History to CSV',
        'weight_history.csv',
        'CSV Files',
        'csv'
      );
      if (path) {
        await exportCsv(path, settings.unit);
        setStatusMsg({ text: `Successfully exported CSV to ${path}` });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  // Database Backup Export
  const handleExportDb = async () => {
    try {
      const path = await selectSaveFile(
        'Export SQLite Database Backup',
        'weight_backup.db',
        'SQLite Database',
        'db'
      );
      if (path) {
        await exportDatabase(path);
        setStatusMsg({ text: `Successfully backed up database to ${path}` });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  // Database Restore Import
  const handleImportDb = async () => {
    try {
      const path = await selectOpenFile(
        'Select SQLite Database Backup to Restore',
        'SQLite Database',
        'db'
      );
      if (path) {
        if (window.confirm('Restoring database will replace all current data. Proceed?')) {
          await importDatabase(path);
          onRefreshSettings();
          setStatusMsg({ text: 'Database restored successfully!' });
        }
      }
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  // CSV Import Preview
  const handleSelectImportCsv = async () => {
    try {
      const path = await selectOpenFile('Select CSV File to Import', 'CSV Files', 'csv');
      if (path) {
        const preview = await previewCsvImport(path, settings.unit);
        setCsvPath(path);
        setCsvPreview(preview);
        setImportResult(null);
      }
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  const handleConfirmImportCsv = async () => {
    if (!csvPath) return;
    try {
      const summary = await importCsv(csvPath, settings.unit, replaceDuplicates);
      setImportResult(summary);
      setCsvPreview(null);
      setCsvPath(null);
      onRefreshSettings();
    } catch (err: any) {
      setStatusMsg({ text: err.toString(), isError: true });
    }
  };

  return (
    <div className="settings-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBackToChart}>
          <ArrowLeft size={16} />
          <span>Chart</span>
        </button>
        <h2>Settings</h2>
      </div>

      {statusMsg && (
        <div className={`status-banner ${statusMsg.isError ? 'error' : 'success'}`}>
          {statusMsg.isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="settings-section-list">
        {/* Goal Weight Section */}
        <div className="settings-card">
          <h3>Goal Weight</h3>
          <div className="form-group inline-group">
            <div className="input-with-unit flex-1">
              <input
                type="number"
                step="0.1"
                placeholder="e.g. 190.0"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="input-field"
              />
              <span className="unit-badge">{settings.unit}</span>
            </div>
            <button className="btn btn-secondary" onClick={handleSaveGoal}>
              Save Goal
            </button>
          </div>

          <label className="checkbox-label mt-3">
            <input
              type="checkbox"
              checked={settings.show_goal_line}
              onChange={(e) => handleToggleGoalLine(e.target.checked)}
            />
            <span>Show goal horizontal line on chart</span>
          </label>
        </div>

        {/* Units Section */}
        <div className="settings-card">
          <h3>Measurement Units</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="unit"
                checked={settings.unit === 'lb'}
                onChange={() => handleUnitChange('lb')}
              />
              <span>Pounds (lb)</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="unit"
                checked={settings.unit === 'kg'}
                onChange={() => handleUnitChange('kg')}
              />
              <span>Kilograms (kg)</span>
            </label>
          </div>
        </div>

        {/* Chart Preferences */}
        <div className="settings-card">
          <h3>Chart Preferences</h3>
          <div className="form-group">
            <label>Default Chart Range</label>
            <select
              value={settings.chart_range}
              onChange={(e) => handleChartRangeChange(e.target.value as ChartRange)}
              className="select-field"
            >
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
              <option value="3m">3 Months (Default)</option>
              <option value="6m">6 Months</option>
              <option value="12m">12 Months (Max)</option>
            </select>
          </div>

          <div className="checkbox-group mt-3">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.show_raw}
                onChange={(e) => handleToggleRaw(e.target.checked)}
              />
              <span>Show raw daily measurements</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.show_trend}
                onChange={(e) => handleToggleTrend(e.target.checked)}
              />
              <span>Show 7-day moving average trend line</span>
            </label>
          </div>
        </div>

        {/* Theme Section */}
        <div className="settings-card">
          <h3>Appearance</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'system'}
                onChange={() => handleThemeChange('system')}
              />
              <span>System Default</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'dark'}
                onChange={() => handleThemeChange('dark')}
              />
              <span>Dark Mode</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="theme"
                checked={settings.theme === 'light'}
                onChange={() => handleThemeChange('light')}
              />
              <span>Light Mode</span>
            </label>
          </div>
        </div>

        {/* Widget Behavior */}
        <div className="settings-card">
          <h3>Desktop Widget Behavior</h3>
          <div className="checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.always_on_top}
                onChange={(e) => handleAlwaysOnTopChange(e.target.checked)}
              />
              <span>Always on top</span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.start_with_windows}
                onChange={(e) => handleStartWithWindowsChange(e.target.checked)}
              />
              <span>Start Weight Journal with Windows</span>
            </label>
          </div>
        </div>

        {/* Application Controls */}
        <div className="settings-card">
          <h3>Application Controls</h3>
          <p className="card-desc mb-3">Manage or close the running desktop widget.</p>
          <div className="action-buttons-grid">
            <button className="btn btn-secondary" onClick={() => hideWindow()}>
              <Minus size={16} />
              <span>Minimize to Tray</span>
            </button>
            <button className="btn btn-danger" onClick={() => closeApp()}>
              <LogOut size={16} />
              <span>Exit Application</span>
            </button>
          </div>
        </div>

        {/* Data & Backup Section */}
        <div className="settings-card">
          <h3>Data & Backups</h3>
          <p className="card-desc">Your weight history is stored 100% locally on your computer.</p>
          
          <div className="action-buttons-grid">
            <button className="btn btn-outline" onClick={handleExportCsv}>
              <FileSpreadsheet size={16} />
              <span>Export CSV</span>
            </button>

            <button className="btn btn-outline" onClick={handleSelectImportCsv}>
              <Upload size={16} />
              <span>Import CSV</span>
            </button>

            <button className="btn btn-outline" onClick={handleExportDb}>
              <Download size={16} />
              <span>Backup Database</span>
            </button>

            <button className="btn btn-outline" onClick={handleImportDb}>
              <DbIcon size={16} />
              <span>Restore Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* CSV Import Preview Modal */}
      {csvPreview && (
        <div className="modal-backdrop" onClick={() => setCsvPreview(null)}>
          <div className="modal-card csv-preview-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import CSV Preview</h3>
            
            <div className="preview-summary-pills">
              <div className="pill count-pill">Total: {csvPreview.total_rows}</div>
              <div className="pill valid-pill">Valid: {csvPreview.valid_rows}</div>
              <div className="pill invalid-pill">Invalid: {csvPreview.invalid_rows}</div>
              <div className="pill dup-pill">Duplicates: {csvPreview.duplicate_rows}</div>
            </div>

            {csvPreview.duplicate_rows > 0 && (
              <label className="checkbox-label mt-3">
                <input
                  type="checkbox"
                  checked={replaceDuplicates}
                  onChange={(e) => setReplaceDuplicates(e.target.checked)}
                />
                <span>Replace existing entries on duplicate dates</span>
              </label>
            )}

            <div className="preview-rows-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Line</th>
                    <th>Date</th>
                    <th>Weight ({settings.unit})</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.rows.slice(0, 50).map((row, i) => (
                    <tr key={i} className={!row.is_valid ? 'invalid-row' : ''}>
                      <td>{row.line_number}</td>
                      <td>{row.date || '-'}</td>
                      <td>{row.weight > 0 ? `${row.weight} ${settings.unit}` : '-'}</td>
                      <td>
                        {!row.is_valid ? (
                          <span className="badge badge-error">{row.error_message}</span>
                        ) : row.is_duplicate ? (
                          <span className="badge badge-warning">Duplicate Date</span>
                        ) : (
                          <span className="badge badge-success">Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions mt-4">
              <button className="btn btn-secondary" onClick={() => setCsvPreview(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmImportCsv}
                disabled={csvPreview.valid_rows === 0}
              >
                Import {csvPreview.valid_rows} Entries
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Result Notification */}
      {importResult && (
        <div className="modal-backdrop" onClick={() => setImportResult(null)}>
          <div className="modal-card import-result-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Import Finished</h3>
            <p>Import summary:</p>
            <ul>
              <li><strong>{importResult.imported_count}</strong> new entries imported</li>
              <li><strong>{importResult.replaced_count}</strong> duplicate entries replaced</li>
              <li><strong>{importResult.skipped_count}</strong> entries skipped</li>
            </ul>
            <div className="modal-actions mt-4">
              <button className="btn btn-primary" onClick={() => setImportResult(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
