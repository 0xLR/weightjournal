import React from 'react';
import { TrendingUp, History, Settings, Plus, Minus, X, GripHorizontal } from 'lucide-react';
import { startDrag, hideWindow, closeApp } from '../services/api';

interface WidgetHeaderProps {
  activeTab: 'chart' | 'history' | 'settings';
  setActiveTab: (tab: 'chart' | 'history' | 'settings') => void;
  onOpenAddModal: () => void;
}

export const WidgetHeader: React.FC<WidgetHeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
}) => {
  const handleStartDrag = (e: React.MouseEvent) => {
    if (e.button === 0) {
      startDrag().catch((err) => console.error('Drag failed', err));
    }
  };

  const stopProp = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <header
      className="widget-header"
      data-tauri-drag-region
      onMouseDown={handleStartDrag}
    >
      <div className="header-left" data-tauri-drag-region onMouseDown={handleStartDrag}>
        <div
          className="drag-handle"
          data-tauri-drag-region
          title="Click and drag to move widget"
          onMouseDown={handleStartDrag}
        >
          <GripHorizontal size={18} className="drag-icon" />
        </div>
        <div className="app-badge" data-tauri-drag-region onMouseDown={handleStartDrag}>
          <TrendingUp className="app-icon" size={18} />
          <span className="app-title">Weight Journal</span>
        </div>
      </div>

      <div className="header-nav" onMouseDown={stopProp}>
        <button
          className={`nav-btn ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
          title="Chart Progress"
        >
          <TrendingUp size={16} />
          <span className="nav-label">Chart</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
          title="Weight History"
        >
          <History size={16} />
          <span className="nav-label">History</span>
        </button>

        <button
          className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="Settings"
        >
          <Settings size={16} />
          <span className="nav-label">Settings</span>
        </button>

        <button
          className="add-quick-btn"
          onClick={onOpenAddModal}
          title="Add Weight Entry"
        >
          <Plus size={16} />
          <span>Add</span>
        </button>
      </div>

      <div className="header-controls" onMouseDown={stopProp}>
        <button
          className="window-btn minimize-btn"
          onClick={() => hideWindow()}
          title="Minimize to System Tray"
        >
          <Minus size={14} />
        </button>
        <button
          className="window-btn close-btn"
          onClick={() => closeApp()}
          title="Exit Application"
        >
          <X size={14} />
        </button>
      </div>
    </header>
  );
};
