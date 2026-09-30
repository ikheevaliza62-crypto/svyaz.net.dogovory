const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'contracts.db'));

// Создаём таблицы при первом запуске
db.exec(`
  CREATE TABLE IF NOT EXISTS templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    client_type TEXT NOT NULL,
    file_name   TEXT NOT NULL,
    file_path   TEXT NOT NULL,
    size        INTEGER,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contracts (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_number       TEXT,
    original_contract_date TEXT,
    original_valid_until  TEXT,
    client_type           TEXT,
    client_name           TEXT,
    inn                   TEXT,
    director              TEXT,
    template_name         TEXT,
    file_path             TEXT,
    file_name             TEXT,
    status                TEXT DEFAULT 'active',
    terminated_at         TEXT,
    created_at            TEXT DEFAULT (datetime('now'))
  );
`);

module.exports = db;