import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', 'usm.db');

let db = null;
let SQL = null;

export async function initDb() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing DB or create new
  if (existsSync(DB_PATH)) {
    const fileBuffer = readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Run schema — strip comments, split on semicolons, execute each
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  // Remove all SQL comments (lines starting with --)
  const cleaned = schema
    .split('\n')
    .map(line => line.replace(/--.*$/, '').trim())
    .join('\n');

  const statements = cleaned
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const stmt of statements) {
    try {
      db.run(stmt + ';');
    } catch (err) {
      console.error('Schema statement error:', err.message, '\nStatement:', stmt.substring(0, 80));
    }
  }

  // Save to disk
  saveDb();
  console.log('✓ Database initialized');
  return db;
}

export function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

// Query helpers
export function getAll(sql, params = []) {
  try {
    const stmt = getDb().prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error('DB getAll error:', err.message, '\nSQL:', sql, '\nParams:', params);
    throw err;
  }
}

export function getOne(sql, params = []) {
  const results = getAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

export function run(sql, params = []) {
  try {
    getDb().run(sql, params);
    saveDb(); // Persist after each write
    return { changes: getDb().getRowsModified() };
  } catch (err) {
    console.error('DB run error:', err.message, '\nSQL:', sql, '\nParams:', params);
    throw err;
  }
}

export function close() {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}
