import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('fucount.db');
    await _initSchema(_db);
  }
  return _db;
}

// Call this in tests to force a fresh db instance
export function _resetDbInstance(): void {
  _db = null;
}

async function _initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS sessions (
      id             TEXT PRIMARY KEY,
      location_name  TEXT NOT NULL,
      intersection_type TEXT NOT NULL,
      time_period    TEXT NOT NULL,
      lat            REAL,
      lng            REAL,
      custom_legs    TEXT,
      started_at     TEXT NOT NULL,
      ended_at       TEXT,
      total_count    INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS counts (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id     TEXT NOT NULL REFERENCES sessions(id),
      from_direction TEXT NOT NULL,
      movement       TEXT NOT NULL,
      to_direction   TEXT NOT NULL,
      vehicle_type   TEXT NOT NULL,
      timestamp      TEXT NOT NULL
    );
  `);
}
