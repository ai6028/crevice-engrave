// lib/db.ts
const sqlite3 = require('sqlite3');
import path from 'path';

const dbPath = path.join(process.cwd(), 'crevice.db');
const db = new sqlite3.Database(dbPath);

// 建立表结构
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      visibility TEXT DEFAULT 'public',
      status TEXT DEFAULT 'visible',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      admin_reply TEXT,
      replied_at TEXT
    );
  `);
});

export default db;