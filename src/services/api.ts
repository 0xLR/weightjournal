import { invoke } from '@tauri-apps/api/core';
import { WeightEntry, UserSettings, CsvPreview, ImportSummary, Unit } from '../types/weight';

export const KG_TO_LB = 2.20462;

export function kgToDisplay(kg: number, unit: Unit): number {
  if (unit === 'lb') {
    return Number((kg * KG_TO_LB).toFixed(1));
  }
  return Number(kg.toFixed(1));
}

export function displayToKg(val: number, unit: Unit): number {
  if (unit === 'lb') {
    return val / KG_TO_LB;
  }
  return val;
}

export function formatWeight(kg: number, unit: Unit): string {
  const val = kgToDisplay(kg, unit);
  return `${val.toFixed(1)} ${unit}`;
}

export async function addWeight(date: string, weightKg: number): Promise<WeightEntry> {
  return await invoke<WeightEntry>('add_weight', { date, weightKg });
}

export async function updateWeight(id: number, date: string, weightKg: number): Promise<WeightEntry> {
  return await invoke<WeightEntry>('update_weight', { id, date, weightKg });
}

export async function deleteWeight(id: number): Promise<void> {
  return await invoke<void>('delete_weight', { id });
}

export async function getWeight(date: string): Promise<WeightEntry | null> {
  return await invoke<WeightEntry | null>('get_weight', { date });
}

export async function getWeights(startDate?: string, endDate?: string): Promise<WeightEntry[]> {
  return await invoke<WeightEntry[]>('get_weights', { startDate, endDate });
}

export async function getLatestWeight(): Promise<WeightEntry | null> {
  return await invoke<WeightEntry | null>('get_latest_weight');
}

export async function getFirstWeight(): Promise<WeightEntry | null> {
  return await invoke<WeightEntry | null>('get_first_weight');
}

export async function getAllSettings(): Promise<UserSettings> {
  const rawMap = await invoke<Record<string, string>>('get_all_settings');
  return {
    unit: (rawMap.unit as Unit) || 'lb',
    goal_weight: rawMap.goal_weight || '',
    show_goal_line: rawMap.show_goal_line !== 'false',
    chart_range: (rawMap.chart_range as any) || '3m',
    custom_start_date: rawMap.custom_start_date,
    custom_end_date: rawMap.custom_end_date,
    show_raw: rawMap.show_raw !== 'false',
    show_trend: rawMap.show_trend !== 'false',
    theme: (rawMap.theme as any) || 'system',
    always_on_top: rawMap.always_on_top === 'true',
    start_with_windows: rawMap.start_with_windows === 'true',
    progress_baseline: (rawMap.progress_baseline as any) || 'first_entry',
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  return await invoke<void>('set_setting', { key, value });
}

export async function previewCsvImport(path: string, unit: Unit): Promise<CsvPreview> {
  return await invoke<CsvPreview>('preview_csv_import', { path, unit });
}

export async function importCsv(path: string, unit: Unit, replaceDuplicates: boolean): Promise<ImportSummary> {
  return await invoke<ImportSummary>('import_csv', { path, unit, replaceDuplicates });
}

export async function exportCsv(path: string, unit: Unit): Promise<void> {
  return await invoke<void>('export_csv', { path, unit });
}

export async function exportDatabase(path: string): Promise<void> {
  return await invoke<void>('export_database', { path });
}

export async function importDatabase(path: string): Promise<void> {
  return await invoke<void>('import_database', { path });
}

export async function selectSaveFile(title: string, defaultName: string, filterName: string, filterExt: string): Promise<string | null> {
  return await invoke<string | null>('select_save_file', { title, defaultName, filterName, filterExt });
}

export async function selectOpenFile(title: string, filterName: string, filterExt: string): Promise<string | null> {
  return await invoke<string | null>('select_open_file', { title, filterName, filterExt });
}

export async function setAlwaysOnTop(alwaysOnTop: boolean): Promise<void> {
  return await invoke<void>('set_always_on_top', { alwaysOnTop });
}

export async function setStartWithWindows(enable: boolean): Promise<void> {
  return await invoke<void>('set_start_with_windows', { enable });
}

export async function startDrag(): Promise<void> {
  return await invoke<void>('start_drag');
}

export async function hideWindow(): Promise<void> {
  return await invoke<void>('hide_window');
}

export async function showWindow(): Promise<void> {
  return await invoke<void>('show_window');
}

export async function closeApp(): Promise<void> {
  return await invoke<void>('close_app');
}
