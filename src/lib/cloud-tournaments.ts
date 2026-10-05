import "server-only";

import type { SyncPayload, SyncSnapshot } from "@/modules/super12/data/sync-contract";

import { getDb } from "./db";
import { notifyTournamentsChanged } from "./sync-bus";

/**
 * Nuvem dos torneios (SQLite do servidor, compartilhada por todos os
 * usuários). Os dados chegam validados pelo Server Action; aqui valem duas
 * regras por registro: última escrita vence (comparação de `updatedAt`) e
 * exclusão sempre vence — o tombstone impede que outro aparelho ressuscite
 * um torneio apagado.
 *
 * Só avisa os navegadores (SSE) quando a transação alterou alguma linha de
 * verdade — o upsert compara os dados para que reenvios idempotentes não
 * disparam atualização em cascata entre os aparelhos.
 */
export function syncCloudTournaments(
  payload: SyncPayload,
  originId?: string,
): SyncSnapshot {
  const db = getDb();

  let changed = false;
  const track = (result: { changes: number | bigint }) => {
    if (Number(result.changes) > 0) changed = true;
  };

  db.exec("BEGIN");
  try {
    const deletedAt = new Date().toISOString();
    const insertTombstone = db.prepare(
      "INSERT OR IGNORE INTO cloud_tournament_deletes (id, deleted_at) VALUES (?, ?)",
    );
    const deleteTournamentRow = db.prepare(
      "DELETE FROM cloud_tournaments WHERE id = ?",
    );
    const deleteMatchRows = db.prepare(
      "DELETE FROM cloud_matches WHERE tournament_id = ?",
    );

    for (const id of payload.deletedTournamentIds) {
      track(insertTombstone.run(id, deletedAt));
      track(deleteTournamentRow.run(id));
      track(deleteMatchRows.run(id));
    }

    const findTombstone = db.prepare(
      "SELECT 1 FROM cloud_tournament_deletes WHERE id = ?",
    );
    const isDeleted = (tournamentId: string) =>
      findTombstone.get(tournamentId) !== undefined;

    const insertTournament = db.prepare(`
      INSERT INTO cloud_tournaments (id, data, updated_at) VALUES (?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= cloud_tournaments.updated_at
        AND cloud_tournaments.data IS NOT excluded.data
    `);
    for (const tournament of payload.tournaments) {
      if (isDeleted(tournament.id)) continue;
      track(
        insertTournament.run(tournament.id, JSON.stringify(tournament), tournament.updatedAt),
      );
    }

    const insertMatch = db.prepare(`
      INSERT INTO cloud_matches (id, tournament_id, data, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        data = excluded.data,
        updated_at = excluded.updated_at
      WHERE excluded.updated_at >= cloud_matches.updated_at
        AND cloud_matches.data IS NOT excluded.data
    `);
    for (const match of payload.matches) {
      if (isDeleted(match.tournamentId)) continue;
      track(
        insertMatch.run(
          match.id,
          match.tournamentId,
          JSON.stringify(match),
          match.updatedAt ?? "1970-01-01T00:00:00.000Z",
        ),
      );
    }

    const snapshot: SyncSnapshot = {
      tournaments: (
        db.prepare("SELECT data FROM cloud_tournaments").all() as {
          data: string;
        }[]
      ).map((row) => JSON.parse(row.data)),
      matches: (
        db.prepare("SELECT data FROM cloud_matches").all() as {
          data: string;
        }[]
      ).map((row) => JSON.parse(row.data)),
    };

    db.exec("COMMIT");
    if (changed) notifyTournamentsChanged(originId);
    return snapshot;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
