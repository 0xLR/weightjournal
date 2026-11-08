import React, { useState } from 'react';
import { Edit2, Trash2, Search, ArrowLeft } from 'lucide-react';
import { WeightEntry, Unit } from '../types/weight';
import { deleteWeight, formatWeight } from '../services/api';

interface WeightHistoryProps {
  entries: WeightEntry[];
  unit: Unit;
  onRefresh: () => void;
  onEdit: (entry: WeightEntry) => void;
  onBackToChart: () => void;
}

export const WeightHistory: React.FC<WeightHistoryProps> = ({
  entries,
  unit,
  onRefresh,
  onEdit,
  onBackToChart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<WeightEntry | null>(null);

  // Sort descending by date
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const filteredEntries = sortedEntries.filter((e) =>
    e.date.includes(searchTerm.trim())
  );

  const handleDeleteConfirm = async () => {
    if (!deleteCandidate) return;
    try {
      await deleteWeight(deleteCandidate.id);
      setDeleteCandidate(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete weight', err);
    }
  };

  return (
    <div className="history-view">
      <div className="view-header">
        <button className="back-btn" onClick={onBackToChart}>
          <ArrowLeft size={16} />
          <span>Chart</span>
        </button>
        <h2>Weight History</h2>
        <span className="count-badge">{entries.length} entries</span>
      </div>

      <div className="history-search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search date (e.g. 2026-08)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="history-list-container">
        {filteredEntries.length === 0 ? (
          <div className="history-empty">
            <p>No entries found matching your search.</p>
          </div>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Weight</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="date-cell">{entry.date}</td>
                  <td className="weight-cell">
                    <strong>{formatWeight(entry.weight_kg, unit)}</strong>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="icon-action-btn edit-btn"
                      onClick={() => onEdit(entry)}
                      title="Edit Entry"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="icon-action-btn delete-btn"
                      onClick={() => setDeleteCandidate(entry)}
                      title="Delete Entry"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="modal-backdrop" onClick={() => setDeleteCandidate(null)}>
          <div className="modal-card delete-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Weight Entry?</h3>
            <div className="delete-info-box">
              <div className="delete-date">{deleteCandidate.date}</div>
              <div className="delete-weight">{formatWeight(deleteCandidate.weight_kg, unit)}</div>
            </div>
            <p className="warning-text">This action cannot be undone.</p>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
