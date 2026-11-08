use std::fs;
use std::path::PathBuf;
use rusqlite::{params, Connection, Result as SqlResult};
use chrono::Utc;
use crate::models::{WeightEntry, CsvPreviewRow, CsvPreview, ImportSummary};

pub struct Database {
    db_path: PathBuf,
}

impl Database {
    pub fn new() -> Self {
        // Keep the legacy folder so existing journals survive the display-name change.
        // An explicit override lets development and screenshots use isolated sample data.
        let mut path = std::env::var_os("WEIGHT_JOURNAL_DATA_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|| {
                let mut path = dirs::data_dir().unwrap_or_else(|| PathBuf::from("."));
                path.push("WeightWidget");
                path
            });
        if !path.exists() {
            let _ = fs::create_dir_all(&path);
        }
        path.push("weight.db");
        Database { db_path: path }
    }

    pub fn get_connection(&self) -> SqlResult<Connection> {
        Connection::open(&self.db_path)
    }

    pub fn init(&self) -> SqlResult<()> {
        let conn = self.get_connection()?;
        
        // Create tables
        conn.execute(
            "CREATE TABLE IF NOT EXISTS weight_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL UNIQUE,
                weight REAL NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );",
            [],
        )?;

        // Default initial settings if not present
        let defaults = [
            ("unit", "lb"),
            ("goal_weight", ""),
            ("show_goal_line", "true"),
            ("chart_range", "3m"),
            ("show_raw", "true"),
            ("show_trend", "true"),
            ("theme", "system"),
            ("always_on_top", "false"),
            ("start_with_windows", "false"),
            ("progress_baseline", "first_entry"),
        ];

        for (k, v) in defaults.iter() {
            conn.execute(
                "INSERT OR IGNORE INTO settings (key, value) VALUES (?1, ?2);",
                params![k, v],
            )?;
        }

        Ok(())
    }

    pub fn add_weight(&self, date: &str, weight_kg: f64) -> Result<WeightEntry, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO weight_entries (date, weight, created_at, updated_at) VALUES (?1, ?2, ?3, ?4);",
            params![date, weight_kg, now, now],
        ).map_err(|e| format!("Failed to insert weight: {}", e))?;

        let id = conn.last_insert_rowid();

        Ok(WeightEntry {
            id,
            date: date.to_string(),
            weight_kg,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn update_weight(&self, id: i64, date: &str, weight_kg: f64) -> Result<WeightEntry, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        conn.execute(
            "UPDATE weight_entries SET date = ?1, weight = ?2, updated_at = ?3 WHERE id = ?4;",
            params![date, weight_kg, now, id],
        ).map_err(|e| format!("Failed to update weight: {}", e))?;

        let mut stmt = conn
            .prepare("SELECT id, date, weight, created_at, updated_at FROM weight_entries WHERE id = ?1")
            .map_err(|e| e.to_string())?;

        let entry = stmt.query_row(params![id], |row| {
            Ok(WeightEntry {
                id: row.get(0)?,
                date: row.get(1)?,
                weight_kg: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }).map_err(|e| format!("Weight entry not found: {}", e))?;

        Ok(entry)
    }

    pub fn delete_weight(&self, id: i64) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM weight_entries WHERE id = ?1;", params![id])
            .map_err(|e| format!("Failed to delete entry: {}", e))?;
        Ok(())
    }

    pub fn get_weight_by_date(&self, date: &str) -> Result<Option<WeightEntry>, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, date, weight, created_at, updated_at FROM weight_entries WHERE date = ?1")
            .map_err(|e| e.to_string())?;

        let res = stmt.query_row(params![date], |row| {
            Ok(WeightEntry {
                id: row.get(0)?,
                date: row.get(1)?,
                weight_kg: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        });

        match res {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_weights(&self, start_date: Option<String>, end_date: Option<String>) -> Result<Vec<WeightEntry>, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        let (query, params_vec): (String, Vec<Box<dyn rusqlite::ToSql>>) = match (start_date, end_date) {
            (Some(start), Some(end)) => (
                "SELECT id, date, weight, created_at, updated_at FROM weight_entries WHERE date >= ?1 AND date <= ?2 ORDER BY date ASC".to_string(),
                vec![Box::new(start), Box::new(end)],
            ),
            (Some(start), None) => (
                "SELECT id, date, weight, created_at, updated_at FROM weight_entries WHERE date >= ?1 ORDER BY date ASC".to_string(),
                vec![Box::new(start)],
            ),
            (None, Some(end)) => (
                "SELECT id, date, weight, created_at, updated_at FROM weight_entries WHERE date <= ?1 ORDER BY date ASC".to_string(),
                vec![Box::new(end)],
            ),
            (None, None) => (
                "SELECT id, date, weight, created_at, updated_at FROM weight_entries ORDER BY date ASC".to_string(),
                vec![],
            ),
        };

        let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
        let params_refs: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

        let rows = stmt.query_map(&params_refs[..], |row| {
            Ok(WeightEntry {
                id: row.get(0)?,
                date: row.get(1)?,
                weight_kg: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        }).map_err(|e| e.to_string())?;

        let mut entries = Vec::new();
        for r in rows {
            if let Ok(entry) = r {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    pub fn get_latest_weight(&self) -> Result<Option<WeightEntry>, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, date, weight, created_at, updated_at FROM weight_entries ORDER BY date DESC LIMIT 1")
            .map_err(|e| e.to_string())?;

        let res = stmt.query_row([], |row| {
            Ok(WeightEntry {
                id: row.get(0)?,
                date: row.get(1)?,
                weight_kg: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        });

        match res {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_first_weight(&self) -> Result<Option<WeightEntry>, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, date, weight, created_at, updated_at FROM weight_entries ORDER BY date ASC LIMIT 1")
            .map_err(|e| e.to_string())?;

        let res = stmt.query_row([], |row| {
            Ok(WeightEntry {
                id: row.get(0)?,
                date: row.get(1)?,
                weight_kg: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        });

        match res {
            Ok(entry) => Ok(Some(entry)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_all_settings(&self) -> Result<std::collections::HashMap<String, String>, String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT key, value FROM settings").map_err(|e| e.to_string())?;
        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, String>(0)?, row.get::<_, String>(1)?))
        }).map_err(|e| e.to_string())?;

        let mut map = std::collections::HashMap::new();
        for r in rows {
            if let Ok((k, v)) = r {
                map.insert(k, v);
            }
        }
        Ok(map)
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2;",
            params![key, value],
        ).map_err(|e| format!("Failed to set setting: {}", e))?;
        Ok(())
    }

    pub fn preview_csv_import(&self, path: &str, _unit: &str) -> Result<CsvPreview, String> {
        let mut rdr = csv::ReaderBuilder::new()
            .has_headers(true)
            .flexible(true)
            .from_path(path)
            .map_err(|e| format!("Failed to read CSV file: {}", e))?;

        let conn = self.get_connection().map_err(|e| e.to_string())?;
        
        let mut rows = Vec::new();
        let mut total_rows = 0;
        let mut valid_rows = 0;
        let mut invalid_rows = 0;
        let mut duplicate_rows = 0;

        for (idx, record_result) in rdr.records().enumerate() {
            total_rows += 1;
            let line_number = idx + 2; // header is line 1

            match record_result {
                Ok(record) => {
                    if record.len() < 2 {
                        invalid_rows += 1;
                        rows.push(CsvPreviewRow {
                            line_number,
                            date: "".to_string(),
                            weight: 0.0,
                            is_valid: false,
                            error_message: Some("Expected at least 2 columns (date, weight)".to_string()),
                            is_duplicate: false,
                            existing_weight: None,
                        });
                        continue;
                    }

                    let date_str = record[0].trim();
                    let weight_str = record[1].trim();

                    // Parse date YYYY-MM-DD
                    if chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").is_err() {
                        invalid_rows += 1;
                        rows.push(CsvPreviewRow {
                            line_number,
                            date: date_str.to_string(),
                            weight: 0.0,
                            is_valid: false,
                            error_message: Some(format!("Invalid date format '{}'. Expected YYYY-MM-DD", date_str)),
                            is_duplicate: false,
                            existing_weight: None,
                        });
                        continue;
                    }

                    // Parse weight
                    let parsed_weight: Result<f64, _> = weight_str.parse();
                    if parsed_weight.is_err() || parsed_weight.as_ref().unwrap() <= &0.0 {
                        invalid_rows += 1;
                        rows.push(CsvPreviewRow {
                            line_number,
                            date: date_str.to_string(),
                            weight: 0.0,
                            is_valid: false,
                            error_message: Some(format!("Invalid weight value '{}'", weight_str)),
                            is_duplicate: false,
                            existing_weight: None,
                        });
                        continue;
                    }

                    let raw_weight = parsed_weight.unwrap();

                    // Check duplicate
                    let mut stmt = conn.prepare("SELECT weight FROM weight_entries WHERE date = ?1").unwrap();
                    let existing: SqlResult<f64> = stmt.query_row(params![date_str], |r| r.get(0));
                    
                    let is_dup = existing.is_ok();
                    let existing_weight = existing.ok();

                    if is_dup {
                        duplicate_rows += 1;
                    }
                    valid_rows += 1;

                    rows.push(CsvPreviewRow {
                        line_number,
                        date: date_str.to_string(),
                        weight: raw_weight,
                        is_valid: true,
                        error_message: None,
                        is_duplicate: is_dup,
                        existing_weight,
                    });
                }
                Err(e) => {
                    invalid_rows += 1;
                    rows.push(CsvPreviewRow {
                        line_number,
                        date: "".to_string(),
                        weight: 0.0,
                        is_valid: false,
                        error_message: Some(e.to_string()),
                        is_duplicate: false,
                        existing_weight: None,
                    });
                }
            }
        }

        Ok(CsvPreview {
            total_rows,
            valid_rows,
            invalid_rows,
            duplicate_rows,
            rows,
        })
    }

    pub fn import_csv(&self, path: &str, unit: &str, replace_duplicates: bool) -> Result<ImportSummary, String> {
        let preview = self.preview_csv_import(path, unit)?;
        let conn = self.get_connection().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();

        let mut imported_count = 0;
        let mut skipped_count = 0;
        let mut replaced_count = 0;

        for row in preview.rows {
            if !row.is_valid {
                skipped_count += 1;
                continue;
            }

            let weight_kg = if unit == "lb" { row.weight / 2.20462 } else { row.weight };

            if row.is_duplicate {
                if replace_duplicates {
                    conn.execute(
                        "UPDATE weight_entries SET weight = ?1, updated_at = ?2 WHERE date = ?3;",
                        params![weight_kg, now, row.date],
                    ).map_err(|e| e.to_string())?;
                    replaced_count += 1;
                } else {
                    skipped_count += 1;
                }
            } else {
                conn.execute(
                    "INSERT INTO weight_entries (date, weight, created_at, updated_at) VALUES (?1, ?2, ?3, ?4);",
                    params![row.date, weight_kg, now, now],
                ).map_err(|e| e.to_string())?;
                imported_count += 1;
            }
        }

        Ok(ImportSummary {
            imported_count,
            skipped_count,
            replaced_count,
        })
    }

    pub fn export_csv(&self, path: &str, unit: &str) -> Result<(), String> {
        let entries = self.get_weights(None, None)?;
        let mut wtr = csv::Writer::from_path(path).map_err(|e| format!("Failed to create CSV file: {}", e))?;

        wtr.write_record(&["date", "weight"]).map_err(|e| e.to_string())?;

        for entry in entries {
            let display_weight = if unit == "lb" {
                entry.weight_kg * 2.20462
            } else {
                entry.weight_kg
            };
            wtr.write_record(&[entry.date, format!("{:.1}", display_weight)]).map_err(|e| e.to_string())?;
        }

        wtr.flush().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn export_database(&self, path: &str) -> Result<(), String> {
        fs::copy(&self.db_path, path).map_err(|e| format!("Failed to copy database: {}", e))?;
        Ok(())
    }

    pub fn import_database(&self, path: &str) -> Result<(), String> {
        fs::copy(path, &self.db_path).map_err(|e| format!("Failed to restore database: {}", e))?;
        Ok(())
    }
}
