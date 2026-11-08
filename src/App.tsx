import { useState, useEffect, useCallback, useMemo } from 'react';
import { listen } from '@tauri-apps/api/event';
import { WeightEntry, UserSettings, ChartRange } from './types/weight';
import {
  getAllSettings,
  getWeights,
  getFirstWeight,
  setSetting,
} from './services/api';

import { WidgetHeader } from './components/WidgetHeader';
import { WeightChart } from './components/WeightChart';
import { ProgressSummary } from './components/ProgressSummary';
import { RangeSelector } from './components/RangeSelector';
import { AddWeightModal } from './components/AddWeightModal';
import { WeightHistory } from './components/WeightHistory';
import { SettingsView } from './components/SettingsView';
import { FirstRunWizard } from './components/FirstRunWizard';
import { EmptyState } from './components/EmptyState';

export function App() {
  const [activeTab, setActiveTab] = useState<'chart' | 'history' | 'settings'>('chart');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [allEntries, setAllEntries] = useState<WeightEntry[]>([]);
  const [firstEntry, setFirstEntry] = useState<WeightEntry | null>(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WeightEntry | null>(null);
  const [showFirstRun, setShowFirstRun] = useState(false);

  // Load Settings & Entries
  const refreshData = useCallback(async () => {
    try {
      const loadedSettings = await getAllSettings();
      setSettings(loadedSettings);

      const loadedWeights = await getWeights();
      setAllEntries(loadedWeights);

      const first = await getFirstWeight();
      setFirstEntry(first);

      // Check first run condition: zero entries in db
      if (loadedWeights.length === 0 && !localStorage.getItem('first_run_dismissed')) {
        setShowFirstRun(true);
      } else {
        setShowFirstRun(false);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Apply Theme CSS attribute
  useEffect(() => {
    if (!settings) return;
    const root = document.documentElement;

    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', settings.theme);
    }
  }, [settings?.theme]);

  // Listen to Tray Navigation Events
  useEffect(() => {
    const unlisten = listen<string>('navigate-to', (event) => {
      const target = event.payload;
      if (target === 'add') {
        setActiveTab('chart');
        setEditingEntry(null);
        setIsAddModalOpen(true);
      } else if (target === 'history') {
        setActiveTab('history');
      } else if (target === 'settings') {
        setActiveTab('settings');
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingEntry(null);
        setIsAddModalOpen(true);
      } else if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTab('history');
      } else if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        setActiveTab('settings');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter entries based on active ChartRange
  const filteredEntries = useMemo(() => {
    if (!settings || allEntries.length === 0) return [];
    if (settings.chart_range === 'custom') {
      if (!settings.custom_start_date || !settings.custom_end_date) return allEntries;
      return allEntries.filter(
        (e) => e.date >= settings.custom_start_date! && e.date <= settings.custom_end_date!
      );
    }

    const now = new Date();
    let cutoff = new Date(now);

    switch (settings.chart_range) {
      case '7d':
        cutoff.setDate(now.getDate() - 7);
        break;
      case '30d':
        cutoff.setDate(now.getDate() - 30);
        break;
      case '3m':
        cutoff.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        cutoff.setMonth(now.getMonth() - 6);
        break;
      case '12m':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
      default:
        cutoff.setMonth(now.getMonth() - 3);
    }

    const cutoffStr = cutoff.toISOString().split('T')[0];
    return allEntries.filter((e) => e.date >= cutoffStr);
  }, [allEntries, settings]);

  const handleSelectRange = (
    range: ChartRange,
    customStart?: string,
    customEnd?: string
  ) => {
    if (!settings) return;
    setSettings((prev) => (prev ? { ...prev, chart_range: range } : null));

    // Persist to backend settings
    setSetting('chart_range', range);
    if (range === 'custom' && customStart && customEnd) {
      setSetting('custom_start_date', customStart);
      setSetting('custom_end_date', customEnd);
    }
  };

  const handleFirstRunComplete = () => {
    localStorage.setItem('first_run_dismissed', 'true');
    setShowFirstRun(false);
    refreshData();
  };

  if (!settings) {
    return <div className="loading-screen">Loading Weight Journal...</div>;
  }

  const goalKgNum = settings.goal_weight && !isNaN(parseFloat(settings.goal_weight))
    ? parseFloat(settings.goal_weight)
    : null;

  return (
    <div className="widget-app-shell">
      {/* Borderless Header */}
      <WidgetHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingEntry(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Main View Area */}
      <main className="widget-body">
        {activeTab === 'chart' && (
          <div className="chart-view-shell">
            {allEntries.length === 0 ? (
              <EmptyState
                onAddClick={() => {
                  setEditingEntry(null);
                  setIsAddModalOpen(true);
                }}
              />
            ) : (
              <>
                {/* Range Selector Pills */}
                <RangeSelector
                  currentRange={settings.chart_range}
                  customStartDate={settings.custom_start_date}
                  customEndDate={settings.custom_end_date}
                  onSelectRange={handleSelectRange}
                />

                {/* Interactive SVG Chart */}
                <WeightChart
                  entries={filteredEntries}
                  unit={settings.unit}
                  showRaw={settings.show_raw}
                  showTrend={settings.show_trend}
                  goalWeightKg={goalKgNum}
                  showGoalLine={settings.show_goal_line}
                />

                {/* Progress Summary Cards */}
                <ProgressSummary
                  entries={filteredEntries}
                  firstEntry={firstEntry}
                  unit={settings.unit}
                  goalWeightKg={goalKgNum}
                  baselineMode={settings.progress_baseline}
                />
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <WeightHistory
            entries={allEntries}
            unit={settings.unit}
            onRefresh={refreshData}
            onEdit={(entry) => {
              setEditingEntry(entry);
              setIsAddModalOpen(true);
            }}
            onBackToChart={() => setActiveTab('chart')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onRefreshSettings={refreshData}
            onBackToChart={() => setActiveTab('chart')}
          />
        )}
      </main>

      {/* Add / Edit Weight Modal */}
      {isAddModalOpen && (
        <AddWeightModal
          unit={settings.unit}
          initialEntry={editingEntry}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingEntry(null);
          }}
          onSuccess={() => {
            refreshData();
          }}
        />
      )}

      {/* First Run Onboarding Wizard */}
      {showFirstRun && (
        <FirstRunWizard onComplete={handleFirstRunComplete} />
      )}
    </div>
  );
}

export default App;
