mod db;
mod models;
mod commands;

use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use db::Database;

pub fn run() {
    // Initialize Database
    let db = Database::new();
    if let Err(e) = db.init() {
        eprintln!("Failed to initialize database: {}", e);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::add_weight,
            commands::update_weight,
            commands::delete_weight,
            commands::get_weight,
            commands::get_weights,
            commands::get_latest_weight,
            commands::get_first_weight,
            commands::get_all_settings,
            commands::set_setting,
            commands::preview_csv_import,
            commands::import_csv,
            commands::export_csv,
            commands::export_database,
            commands::import_database,
            commands::select_save_file,
            commands::select_open_file,
            commands::set_always_on_top,
            commands::set_start_with_windows,
            commands::start_drag,
            commands::hide_window,
            commands::show_window,
            commands::close_app,
        ])
        .setup(move |app| {
            // Build Tray Menu
            let item_header = MenuItem::with_id(app, "header", "Weight Journal", false, None::<&str>)?;
            let item_show = MenuItem::with_id(app, "show", "Show Widget", true, None::<&str>)?;
            let item_add = MenuItem::with_id(app, "add_weight", "Add Weight", true, None::<&str>)?;
            let item_history = MenuItem::with_id(app, "history", "History", true, None::<&str>)?;
            let item_settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
            let separator1 = PredefinedMenuItem::separator(app)?;
            let item_exit = MenuItem::with_id(app, "exit", "Exit Weight Journal", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[
                    &item_header,
                    &item_show,
                    &item_add,
                    &item_history,
                    &item_settings,
                    &separator1,
                    &item_exit,
                ],
            )?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app_handle, event| {
                    let id = event.id().as_ref();
                    if let Some(window) = app_handle.get_webview_window("main") {
                        match id {
                            "show" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            "add_weight" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("navigate-to", "add");
                            }
                            "history" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("navigate-to", "history");
                            }
                            "settings" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                                let _ = window.emit("navigate-to", "settings");
                            }
                            "exit" => {
                                app_handle.exit(0);
                            }
                            _ => {}
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app_handle = tray.app_handle();
                        if let Some(window) = app_handle.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Apply always_on_top setting if saved
            if let Ok(settings) = db.get_all_settings() {
                if let Some(window) = app.get_webview_window("main") {
                    if settings.get("always_on_top").map(|v| v == "true").unwrap_or(false) {
                        let _ = window.set_always_on_top(true);
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
