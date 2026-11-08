import React from 'react';
import { PlusCircle, TrendingUp } from 'lucide-react';

interface EmptyStateProps {
  onAddClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAddClick }) => {
  return (
    <div className="empty-state-card">
      <div className="empty-icon-circle">
        <TrendingUp size={32} />
      </div>
      <h3>No Weight Entries Yet</h3>
      <p>Add your first measurement to start tracking your weight progress over time.</p>
      <button className="btn btn-primary mt-4" onClick={onAddClick}>
        <PlusCircle size={18} />
        <span>Add Your First Weight</span>
      </button>
    </div>
  );
};
