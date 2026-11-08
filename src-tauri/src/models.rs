use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WeightEntry {
    pub id: i64,
    pub date: String,      // YYYY-MM-DD
    pub weight_kg: f64,    // Canonical unit: Kilograms
    pub created_at: String, // ISO UTC
    pub updated_at: String, // ISO UTC
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CsvPreviewRow {
    pub line_number: usize,
    pub date: String,
    pub weight: f64,
    pub is_valid: bool,
    pub error_message: Option<String>,
    pub is_duplicate: bool,
    pub existing_weight: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CsvPreview {
    pub total_rows: usize,
    pub valid_rows: usize,
    pub invalid_rows: usize,
    pub duplicate_rows: usize,
    pub rows: Vec<CsvPreviewRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImportSummary {
    pub imported_count: usize,
    pub skipped_count: usize,
    pub replaced_count: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_weight_entry_serialization() {
        let entry = WeightEntry {
            id: 1,
            date: "2026-08-03".to_string(),
            weight_kg: 85.5,
            created_at: "2026-08-03T12:00:00Z".to_string(),
            updated_at: "2026-08-03T12:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&entry).unwrap();
        assert!(json.contains("\"id\":1"));
        assert!(json.contains("\"date\":\"2026-08-03\""));
        assert!(json.contains("\"weight_kg\":85.5"));

        let deserialized: WeightEntry = serde_json::from_str(&json).unwrap();
        assert_eq!(entry, deserialized);
    }

    #[test]
    fn test_csv_preview_serialization() {
        let preview = CsvPreview {
            total_rows: 2,
            valid_rows: 1,
            invalid_rows: 1,
            duplicate_rows: 0,
            rows: vec![
                CsvPreviewRow {
                    line_number: 2,
                    date: "2026-08-03".to_string(),
                    weight: 214.2,
                    is_valid: true,
                    error_message: None,
                    is_duplicate: false,
                    existing_weight: None,
                },
                CsvPreviewRow {
                    line_number: 3,
                    date: "invalid".to_string(),
                    weight: 0.0,
                    is_valid: false,
                    error_message: Some("Invalid date format".to_string()),
                    is_duplicate: false,
                    existing_weight: None,
                },
            ],
        };

        let json = serde_json::to_string(&preview).unwrap();
        let deserialized: CsvPreview = serde_json::from_str(&json).unwrap();
        assert_eq!(preview, deserialized);
    }

    #[test]
    fn test_import_summary_serialization() {
        let summary = ImportSummary {
            imported_count: 10,
            skipped_count: 2,
            replaced_count: 3,
        };

        let json = serde_json::to_string(&summary).unwrap();
        let deserialized: ImportSummary = serde_json::from_str(&json).unwrap();
        assert_eq!(summary, deserialized);
    }
}
