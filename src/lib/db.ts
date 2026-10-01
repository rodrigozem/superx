import "server-only";

import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as { __sistemaDb?: DatabaseSync };

function seedAdmin(db: DatabaseSync) {
  const { count } = db
    .prepare("SELECT COUNT(*) AS count FROM users")
    .get() as { count: number };

  if (count > 0) return;

  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!passwordHash) return;

  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, name, email, role, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', ?, ?, ?)`,
  ).run(
    crypto.randomUUID(),
    process.env.ADMIN_NAME ?? "Administrador",
    (process.env.ADMIN_EMAIL ?? "admin@empresa.com").toLowerCase(),
    passwordHash,
    now,
    now,
  );
}

function createDatabase() {
  const directory = path.join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });

  const db = new DatabaseSync(path.join(directory, "app.db"));

  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  seedAdmin(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__sistemaDb) {
    globalForDb.__sistemaDb = createDatabase();
  }
  return globalForDb.__sistemaDb;
}
