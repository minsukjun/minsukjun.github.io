CREATE TABLE IF NOT EXISTS entries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  message    TEXT    NOT NULL,
  secret     INTEGER NOT NULL DEFAULT 0,
  approved   INTEGER NOT NULL DEFAULT 0,
  reply      TEXT,
  ip_hash    TEXT,
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_entries_public ON entries (approved, created_at);
CREATE INDEX IF NOT EXISTS idx_entries_ip ON entries (ip_hash, created_at);
