/**
 * Supabase client initialization and database helper functions
 * Falls back to SQLite for local development if Supabase not configured
 */

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to import better-sqlite3, but don't fail if not available
let Database;
try {
  const module = await import('better-sqlite3');
  Database = module.default;
} catch (err) {
  console.warn('⚠️  better-sqlite3 not available. SQLite support disabled. Use Supabase for production.');
  Database = null;
}

// Determine which database to use
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_KEY;

let supabase = null;
let sqlite = null;

if (useSupabase) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
  console.log('✅ Using Supabase database');
} else {
  if (!Database) {
    throw new Error('❌ No database configured! Either set SUPABASE_URL and SUPABASE_KEY environment variables, or install better-sqlite3 for SQLite support (run: npm run install:sqlite)');
  }
  const dbPath = process.env.SQLITE_PATH || join(__dirname, '..', 'local.db');
  sqlite = new Database(dbPath);
  console.log(`✅ Using SQLite database at ${dbPath}`);
}

/**
 * Execute a query on Supabase
 * @param {string} table - Table name
 * @param {object} options - Query options
 */
async function supabaseQuery(table, options = {}) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  let query = supabase.from(table).select(options.select || '*');
  
  if (options.eq) {
    Object.entries(options.eq).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }
  
  if (options.neq) {
    Object.entries(options.neq).forEach(([key, value]) => {
      query = query.neq(key, value);
    });
  }
  
  if (options.in) {
    Object.entries(options.in).forEach(([key, values]) => {
      query = query.in(key, values);
    });
  }
  
  if (options.order) {
    query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  
  if (options.limit) {
    query = query.limit(options.limit);
  }
  
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }
  
  const { data, error } = await query;
  
  if (error) throw error;
  return data;
}

/**
 * Insert data into Supabase
 */
async function supabaseInsert(table, data) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
}

/**
 * Update data in Supabase
 */
async function supabaseUpdate(table, match, updates) {
  if (!supabase) throw new Error('Supabase not initialized');
  
  let query = supabase.from(table).update(updates);
  
  Object.entries(match).forEach(([key, value]) => {
    query = query.eq(key, value);
  });
  
  const { data, error } = await query.select().single();
  
  if (error) throw error;
  return data;
}

/**
 * Execute raw SQL on SQLite
 */
function sqliteQuery(sql, params = []) {
  if (!sqlite) throw new Error('SQLite not initialized');
  
  try {
    const stmt = sqlite.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(params);
    } else {
      const result = stmt.run(params);
      return result;
    }
  } catch (error) {
    console.error('SQLite query error:', error);
    throw error;
  }
}

/**
 * Get a single row by primary key
 */
function sqliteGet(table, key, value) {
  if (!sqlite) throw new Error('SQLite not initialized');
  
  const stmt = sqlite.prepare(`SELECT * FROM ${table} WHERE ${key} = ?`);
  return stmt.get(value);
}

/**
 * Insert a row into SQLite
 */
function sqliteInsert(table, data) {
  if (!sqlite) throw new Error('SQLite not initialized');
  
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map(() => '?').join(', ');
  
  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const stmt = sqlite.prepare(sql);
  const result = stmt.run(values);
  
  return { ...data, id: result.lastInsertRowid };
}

/**
 * Update a row in SQLite
 */
function sqliteUpdate(table, match, updates) {
  if (!sqlite) throw new Error('SQLite not initialized');
  
  const setClause = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const whereClause = Object.keys(match).map(k => `${k} = ?`).join(' AND ');
  
  const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
  const params = [...Object.values(updates), ...Object.values(match)];
  
  const stmt = sqlite.prepare(sql);
  stmt.run(params);
  
  // Return updated row
  const selectWhere = Object.keys(match).map(k => `${k} = ?`).join(' AND ');
  const selectStmt = sqlite.prepare(`SELECT * FROM ${table} WHERE ${selectWhere}`);
  return selectStmt.get(Object.values(match));
}

export {
  supabase,
  sqlite,
  useSupabase,
  supabaseQuery,
  supabaseInsert,
  supabaseUpdate,
  sqliteQuery,
  sqliteGet,
  sqliteInsert,
  sqliteUpdate
};
