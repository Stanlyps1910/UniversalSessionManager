import { createClient } from '@libsql/client';

let db = null;

export function getDb() {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        'TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables are required. ' +
        'Set them in your Netlify site settings or .env file.'
      );
    }

    db = createClient({
      url,
      authToken,
    });
  }
  return db;
}

export async function initDb() {
  const client = getDb();

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      active_provider TEXT NOT NULL,
      active_model TEXT NOT NULL,
      total_tokens INTEGER DEFAULT 0
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      token_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS model_switches (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      from_provider TEXT,
      from_model TEXT,
      to_provider TEXT NOT NULL,
      to_model TEXT NOT NULL,
      tokens_at_switch INTEGER,
      switched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS provider_keys (
      provider TEXT PRIMARY KEY,
      api_key TEXT NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(session_id, created_at)
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_switches_session ON model_switches(session_id)
  `);
}

export async function getAll(sql, params = []) {
  const client = getDb();
  const result = await client.execute({ sql, args: params });
  return result.rows;
}

export async function getOne(sql, params = []) {
  const results = await getAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

export async function run(sql, params = []) {
  const client = getDb();
  const result = await client.execute({ sql, args: params });
  return { changes: result.rowsAffected };
}
