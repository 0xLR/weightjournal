# Screenshot assets

The PNGs in this directory are native Windows application captures using 85 synthetic daily entries. No personal journal is used.

To refresh them from the repository root:

```powershell
python scripts/seed-screenshots.py
npm run tauri build -- --no-bundle
$env:WEIGHT_JOURNAL_DATA_DIR = Join-Path $PWD '.local/screenshot-data'
& '.\src-tauri\target\release\weight-journal.exe'
Remove-Item Env:WEIGHT_JOURNAL_DATA_DIR
```

Python 3 is needed only for the sample-data helper. It refuses to overwrite an existing sample database. Reuse the existing sample journal or move it aside before generating another one.

Capture only the app window. Use the default 460 × 640 logical-pixel window size, choose Dark Mode for `chart-dark.png`, `history.png`, and `widget-settings.png`, and Light Mode for `chart-light.png`. Switch views and themes through the app. For widget settings, scroll to show Appearance and Desktop Widget Behavior. Screenshots may be larger in physical pixels because of Windows display scaling.

The data directory override applies only to the launched process and keeps this workflow separate from the default journal.
