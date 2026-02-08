import initSqlJs, { type Database } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { config } from '../config.js';
import { SCHEMA } from './schema.js';

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();

  // Ensure data directory exists
  const dbDir = path.dirname(config.databasePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(config.databasePath)) {
    const buffer = fs.readFileSync(config.databasePath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema
  db.run(SCHEMA);

  // Save to disk
  saveDatabase();

  return db;
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(config.databasePath, buffer);
}

export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
  }
}
