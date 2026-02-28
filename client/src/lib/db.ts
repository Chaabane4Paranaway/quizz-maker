import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

/**
 * DATABASE CONFIGURATION
 * 
 * Local Development: Uses SQLite (sql.js) and saves to /tmp or ../data/survey.db
 * Production (Vercel): Uses PostgreSQL if POSTGRES_URL is provided in .env
 */

const isPostgres = !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

// PostgreSQL Pool (only initialized if needed)
let pgPool: Pool | null = null;

if (isPostgres && postgresUrl) {
  pgPool = new Pool({
    connectionString: postgresUrl,
    ssl: {
      rejectUnauthorized: false // Required for many hosted PG services like Neon/Vercel
    }
  });
}

// SQLite setup
const isVercel = process.env.VERCEL === '1';
const dbPath = isVercel 
  ? path.join('/tmp', 'survey.db')
  : process.env.DB_PATH || path.join(process.cwd(), '../data/survey.db');

const dbDir = path.dirname(dbPath);
let sqliteInstance: SqlJsDatabase | null = null;

async function initSqlite() {
  if (sqliteInstance) return sqliteInstance;
  const SQL = await initSqlJs();
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  
  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    sqliteInstance = new SQL.Database(filebuffer);
  } else {
    sqliteInstance = new SQL.Database();
  }

  // SQLite Schema
  sqliteInstance.run(`
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
  saveSqlite(sqliteInstance);
  return sqliteInstance;
}

function saveSqlite(db: SqlJsDatabase) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

async function initPostgres() {
  if (!pgPool) throw new Error('PostgreSQL not configured');
  
  // Create tables if they don't exist (Postgres syntax)
  const client = await pgPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        choices TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS responses (
        id SERIAL PRIMARY KEY,
        survey_token TEXT NOT NULL,
        pseudo TEXT NOT NULL,
        votes TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_response UNIQUE(survey_token, pseudo)
      );
    `);
  } finally {
    client.release();
  }
}

// Global initialization flag
let isInitialized = false;

async function ensureInit() {
  if (isInitialized) return;
  if (isPostgres) {
    await initPostgres();
  } else {
    await initSqlite();
  }
  isInitialized = true;
}

class DbWrapper {
  prepare(sql: string) {
    // Standardize param syntax: Postgres uses $1, $2, while current code uses ?
    // We'll auto-convert ? to $1, $2 for Postgres
    const pgSql = sql.replace(/\?/g, (_, offset, str) => {
      const count = str.slice(0, offset).split('?').length;
      return `$${count}`;
    });

    return {
      run: async (...params: any[]) => {
        await ensureInit();
        if (isPostgres && pgPool) {
          await pgPool.query(pgSql, params);
          return { changes: 1 };
        } else {
          const db = await initSqlite();
          db.run(sql, params);
          saveSqlite(db);
          return { changes: 1 };
        }
      },
      get: async (...params: any[]) => {
        await ensureInit();
        if (isPostgres && pgPool) {
          const res = await pgPool.query(pgSql, params);
          return res.rows[0];
        } else {
          const db = await initSqlite();
          const result = db.exec(sql, params);
          if (result.length === 0) return undefined;
          const columns = result[0].columns;
          const values = result[0].values[0];
          if (!values) return undefined;
          const row: Record<string, any> = {};
          columns.forEach((col, i) => { row[col] = values[i]; });
          return row;
        }
      },
      all: async (...params: any[]) => {
        await ensureInit();
        if (isPostgres && pgPool) {
          const res = await pgPool.query(pgSql, params);
          return res.rows;
        } else {
          const db = await initSqlite();
          const result = db.exec(sql, params);
          if (result.length === 0) return [];
          const columns = result[0].columns;
          return result[0].values.map((values) => {
            const row: Record<string, any> = {};
            columns.forEach((col, i) => { row[col] = values[i]; });
            return row;
          });
        }
      },
    };
  }
}

export const dbWrapper = new DbWrapper();
export default dbWrapper;
