export interface WeightEntry {
  id: number;
  date: string; // YYYY-MM-DD
  weight_kg: number;
  created_at: string;
  updated_at: string;
}

export type Unit = 'lb' | 'kg';

export type ChartRange = '7d' | '30d' | '3m' | '6m' | '12m' | 'custom';

export type BaselineMode = 'first_entry' | 'period_start';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserSettings {
  unit: Unit;
  goal_weight: string; // kg or lb string input
  show_goal_line: boolean;
  chart_range: ChartRange;
  custom_start_date?: string;
  custom_end_date?: string;
  show_raw: boolean;
  show_trend: boolean;
  theme: ThemeMode;
  always_on_top: boolean;
  start_with_windows: boolean;
  progress_baseline: BaselineMode;
}

export interface CsvPreviewRow {
  line_number: number;
  date: string;
  weight: number;
  is_valid: boolean;
  error_message?: string;
  is_duplicate: boolean;
  existing_weight?: number;
}

export interface CsvPreview {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  duplicate_rows: number;
  rows: CsvPreviewRow[];
}

export interface ImportSummary {
  imported_count: number;
  skipped_count: number;
  replaced_count: number;
}
