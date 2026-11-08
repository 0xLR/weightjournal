use std::collections::HashMap;
use tauri::{AppHandle, WebviewWindow};
use crate::db::Database;
use crate::models::{WeightEntry, CsvPreview, ImportSummary};

#[tauri::command]
pub fn add_weight(date: String, weight_kg: f64) -> Result<WeightEntry, String> {
    let db = Database::new();
    db.add_weight(&date, weight_kg)
}

#[tauri::command]
pub fn update_weight(id: i64, date: String, weight_kg: f64) -> Result<WeightEntry, String> {
    let db = Database::new();
    db.update_weight(id, &date, weight_kg)
}

#[tauri::command]
pub fn delete_weight(id: i64) -> Result<(), String> {
    let db = Database::new();
    db.delete_weight(id)
}

#[tauri::command]
pub fn get_weight(date: String) -> Result<Option<WeightEntry>, String> {
    let db = Database::new();
    db.get_weight_by_date(&date)
}

#[tauri::command]
pub fn get_weights(start_date: Option<String>, end_date: Option<String>) -> Result<Vec<WeightEntry>, String> {
    let db = Database::new();
    db.get_weights(start_date, end_date)
}

#[tauri::command]
pub fn get_latest_weight() -> Result<Option<WeightEntry>, String> {
    let db = Database::new();
    db.get_latest_weight()
}

#[tauri::command]
pub fn get_first_weight() -> Result<Option<WeightEntry>, String> {
    let db = Database::new();
    db.get_first_weight()
}

#[tauri::command]
pub fn get_all_settings() -> Result<HashMap<String, String>, String> {
    let db = Database::new();
    db.get_all_settings()
}

#[tauri::command]
pub fn set_setting(key: String, value: String) -> Result<(), String> {
    let db = Database::new();
    db.set_setting(&key, &value)
}

#[tauri::command]
pub fn preview_csv_import(path: String, unit: String) -> Result<CsvPreview, String> {
    let db = Database::new();
    db.preview_csv_import(&path, &unit)
}

#[tauri::command]
pub fn import_csv(path: String, unit: String, replace_duplicates: bool) -> Result<ImportSummary, String> {
    let db = Database::new();
    db.import_csv(&path, &unit, replace_duplicates)
}

#[tauri::command]
pub fn export_csv(path: String, unit: String) -> Result<(), String> {
    let db = Database::new();
    db.export_csv(&path, &unit)
}

#[tauri::command]
pub fn export_database(path: String) -> Result<(), String> {
    let db = Database::new();
    db.export_database(&path)
}

#[tauri::command]
pub fn import_database(path: String) -> Result<(), String> {
    let db = Database::new();
    db.import_database(&path)
}

#[tauri::command]
pub fn select_save_file(title: String, default_name: String, filter_name: String, filter_ext: String) -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title(&title)
        .set_file_name(&default_name)
        .add_filter(&filter_name, &[&filter_ext]);

    let res = dialog.save_file();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn select_open_file(title: String, filter_name: String, filter_ext: String) -> Result<Option<String>, String> {
    let dialog = rfd::FileDialog::new()
        .set_title(&title)
        .add_filter(&filter_name, &[&filter_ext]);

    let res = dialog.pick_file();
    Ok(res.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub fn set_always_on_top(window: WebviewWindow, always_on_top: bool) -> Result<(), String> {
    let _ = window.set_always_on_top(always_on_top);
    let db = Database::new();
    let _ = db.set_setting("always_on_top", if always_on_top { "true" } else { "false" });
    Ok(())
}

#[tauri::command]
pub fn set_start_with_windows(enable: bool) -> Result<(), String> {
    // Preserve the legacy startup registration key across the display-name change.
    let app_name = "WeightWidget";
    let app_path = std::env::current_exe().map_err(|e| e.to_string())?;
    
    let auto = auto_launch::AutoLaunchBuilder::new()
        .set_app_name(app_name)
        .set_app_path(&app_path.to_string_lossy())
        .build()
        .map_err(|e| format!("AutoLaunch init error: {}", e))?;

    if enable {
        let _ = auto.enable();
    } else {
        let _ = auto.disable();
    }

    let db = Database::new();
    let _ = db.set_setting("start_with_windows", if enable { "true" } else { "false" });
    Ok(())
}

#[tauri::command]
pub fn start_drag(window: WebviewWindow) -> Result<(), String> {
    let _ = window.start_dragging();
    Ok(())
}

#[tauri::command]
pub fn hide_window(window: WebviewWindow) -> Result<(), String> {
    let _ = window.hide();
    Ok(())
}

#[tauri::command]
pub fn show_window(window: WebviewWindow) -> Result<(), String> {
    let _ = window.show();
    let _ = window.set_focus();
    Ok(())
}

#[tauri::command]
pub fn close_app(app_handle: AppHandle) -> Result<(), String> {
    app_handle.exit(0);
    Ok(())
}
