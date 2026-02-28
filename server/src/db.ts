import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../data/survey.db');
const dbDir = path.dirname(dbPath);

let db: SqlJsDatabase | null = null;

async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables if they don't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      choices TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_token TEXT NOT NULL,
      pseudo TEXT NOT NULL,
      votes TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (survey_token) REFERENCES surveys(token),
      UNIQUE(survey_token, pseudo)
    );
  `);

  // Save database to file
  saveDb();

  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDb(): SqlJsDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

export { initDb, getDb, saveDb };

// Wrapper class to provide a similar interface to better-sqlite3
class DbWrapper {
  prepare(sql: string) {
    return {
      run: (...params: any[]) => {
        getDb().run(sql, params);
        saveDb();
        return { changes: 1 };
      },
      get: (...params: any[]) => {
        const result = getDb().exec(sql, params);
        if (result.length === 0) return undefined;
        const columns = result[0].columns;
        const values = result[0].values[0];
        if (!values) return undefined;
        const row: Record<string, any> = {};
        columns.forEach((col, i) => {
          row[col] = values[i];
        });
        return row;
      },
      all: (...params: any[]) => {
        const result = getDb().exec(sql, params);
        if (result.length === 0) return [];
        const columns = result[0].columns;
        return result[0].values.map((values) => {
          const row: Record<string, any> = {};
          columns.forEach((col, i) => {
            row[col] = values[i];
          });
          return row;
        });
      },
    };
  }
}

export default new DbWrapper();
