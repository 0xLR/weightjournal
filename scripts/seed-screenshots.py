"""Create a separate synthetic journal for screenshots; never open the real database.

Usage: python scripts/seed-screenshots.py
Then set WEIGHT_JOURNAL_DATA_DIR to the printed directory before launching the app.
"""
import datetime as dt
import math
from pathlib import Path
import sqlite3

folder = Path(__file__).resolve().parents[1] / '.local' / 'screenshot-data'
folder.mkdir(parents=True, exist_ok=True)
database = folder / 'weight.db'
if database.exists():
    raise SystemExit(f'Refusing to overwrite an existing sample journal: {database}')

with sqlite3.connect(database) as conn:
    conn.executescript('''
        CREATE TABLE weight_entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT, date TEXT NOT NULL UNIQUE,
            weight REAL NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ''')
    end = dt.date.today()
    for day in range(85):
        date = (end - dt.timedelta(days=84-day)).isoformat()
        kg = round(87.5 - day * 0.055 + math.sin(day * 1.7) * 0.32, 2)
        conn.execute(
            'INSERT INTO weight_entries (date,weight,created_at,updated_at) VALUES (?,?,?,?)',
            (date, kg, date + 'T12:00:00Z', date + 'T12:00:00Z'),
        )
    conn.executemany('INSERT INTO settings VALUES (?,?)', [
        ('unit', 'lb'), ('theme', 'dark'), ('goal_weight', '80'), ('chart_range', '3m'),
    ])
print(folder)
