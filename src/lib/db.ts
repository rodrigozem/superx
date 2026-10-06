import "server-only";

import { DatabaseSync } from "node:sqlite";

import { migrateTournamentConfig } from "@/modules/super12/data/config-migration";
import type { StoredTournament } from "@/modules/super12/data/types";

import { ensureDatabaseDirectory, resolveDatabasePath } from "./db-path";

const globalForDb = globalThis as unknown as { __sistemaDb?: DatabaseSync };

/**
 * Atualiza torneios antigos da nuvem para a configuração atual (desempates com
 * confronto direto/mini no fim e critério principal Vitórias). Condicional e
 * idempotente: só mexe em quem tem a ordem de desempate legada salva, então
 * rodar a cada inicialização é seguro. O `updated_at` novo faz os aparelhos
 * puxarem a versão migrada no próximo sync.
 */
function migrateCloudTournamentConfigs(db: DatabaseSync) {
  const rows = db
    .prepare("SELECT id, data FROM cloud_tournaments")
    .all() as { id: string; data: string }[];

  const now = new Date().toISOString();
  const updates: { id: string; data: string }[] = [];
  for (const row of rows) {
    try {
      const result = migrateTournamentConfig(
        JSON.parse(row.data) as StoredTournament,
      );
      if (result.changed) {
        updates.push({
          id: row.id,
          data: JSON.stringify({ ...result.tournament, updatedAt: now }),
        });
      }
    } catch {
      // Linha ilegível não derruba a inicialização — o próprio snapshot
      // já falharia nela durante o sync.
    }
  }
  if (updates.length === 0) return;

  const statement = db.prepare(
    "UPDATE cloud_tournaments SET data = ?, updated_at = ? WHERE id = ?",
  );
  db.exec("BEGIN");
  try {
    for (const update of updates) {
      statement.run(update.data, now, update.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

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
  const db = new DatabaseSync(ensureDatabaseDirectory(resolveDatabasePath()));

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
    CREATE TABLE IF NOT EXISTS cloud_tournaments (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cloud_matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cloud_tournament_deletes (
      id TEXT PRIMARY KEY,
      deleted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cloud_matches_tournament
      ON cloud_matches (tournament_id);
  `);

  migrateCloudTournamentConfigs(db);
  seedAdmin(db);
  return db;
}

export function getDb(): DatabaseSync {
  if (!globalForDb.__sistemaDb) {
    globalForDb.__sistemaDb = createDatabase();
  }
  return globalForDb.__sistemaDb;
}
