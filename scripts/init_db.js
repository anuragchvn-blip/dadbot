/**
 * SQLite database initialization script for local development
 * Run with: node scripts/init_db.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = process.env.SQLITE_PATH || join(__dirname, '..', 'local.db');

console.log(`Initializing SQLite database at: ${dbPath}`);

const db = new Database(dbPath);

// Read and execute migration SQL
const migrationPath = join(__dirname, '..', 'migrations', 'migrate.sql');
const sql = readFileSync(migrationPath, 'utf-8');

// Split by semicolon and execute each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0);

db.exec('BEGIN TRANSACTION;');

try {
  for (const statement of statements) {
    db.exec(statement);
  }
  
  db.exec('COMMIT;');
  console.log('✅ Database initialized successfully!');
  console.log(`Tables created: users, likes, matches, passes, chat_sessions, td_sessions, td_messages, reports, verification_tokens`);
} catch (error) {
  db.exec('ROLLBACK;');
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}

db.close();
