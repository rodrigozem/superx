import { type SuperTournamentDatabase } from "./db";
import type { SyncPayload, SyncSnapshot } from "./sync-contract";

/**
 * Parte testável da sincronização: montagem do payload local e aplicação do
 * snapshot da nuvem no IndexedDB, com política de última escrita vence
 * (comparação de `updatedAt`) e remoção do que a nuvem não tem mais.
 */

export interface InitialIds {
  tournaments: Set<string>;
  matches: Set<string>;
}

const EPOCH = "1970-01-01T00:00:00.000Z";

export async function captureInitialIds(
  db: SuperTournamentDatabase,
): Promise<InitialIds> {
  const [tournaments, matches] = await Promise.all([
    db.tournaments.toArray(),
    db.matches.toArray(),
  ]);
  return {
    tournaments: new Set(tournaments.map((tournament) => tournament.id)),
    matches: new Set(matches.map((match) => match.id)),
  };
}

export async function buildSyncPayload(
  db: SuperTournamentDatabase,
): Promise<SyncPayload> {
  const [tournaments, matches, deleted] = await Promise.all([
    db.tournaments.toArray(),
    db.matches.toArray(),
    db.deletedTournaments.toArray(),
  ]);

  const createdAt = new Map(tournaments.map((tournament) => [tournament.id, tournament.createdAt]));

  return {
    tournaments,
    matches: matches.map((match) => ({
      ...match,
      updatedAt:
        match.updatedAt ?? createdAt.get(match.tournamentId) ?? EPOCH,
    })),
    deletedTournamentIds: deleted.map((entry) => entry.id),
  };
}

export async function applySnapshot(
  db: SuperTournamentDatabase,
  snapshot: SyncSnapshot,
  initial: InitialIds,
  sentTombstones: string[],
): Promise<void> {
  const pendingDeletes = new Set(sentTombstones);

  await db.transaction(
    "rw",
    db.tournaments,
    db.matches,
    db.deletedTournaments,
    async () => {
      // Registros da nuvem entram só quando são mais novos que os locais;
      // torneio com exclusão local pendente não volta.
      for (const remote of snapshot.tournaments) {
        if (pendingDeletes.has(remote.id)) continue;
        const local = await db.tournaments.get(remote.id);
        if (local && local.updatedAt >= remote.updatedAt) continue;
        await db.tournaments.put(remote);
      }

      for (const remote of snapshot.matches) {
        if (pendingDeletes.has(remote.tournamentId)) continue;
        const local = await db.matches.get(remote.id);
        if (local && (local.updatedAt ?? "") >= (remote.updatedAt ?? "")) continue;
        await db.matches.put(remote);
      }

      // O que existia antes do sync e não veio no snapshot foi apagado na
      // nuvem (por este ou por outro aparelho): remove localmente.
      const remoteTournamentIds = new Set(
        snapshot.tournaments.map((tournament) => tournament.id),
      );
      const staleTournaments = [...initial.tournaments].filter(
        (id) => !remoteTournamentIds.has(id),
      );
      if (staleTournaments.length > 0) {
        await db.tournaments.bulkDelete(staleTournaments);
      }

      const remoteMatchIds = new Set(snapshot.matches.map((match) => match.id));
      const staleMatches = [...initial.matches].filter(
        (id) => !remoteMatchIds.has(id),
      );
      if (staleMatches.length > 0) {
        await db.matches.bulkDelete(staleMatches);
      }

      if (sentTombstones.length > 0) {
        await db.deletedTournaments.bulkDelete(sentTombstones);
      }
    },
  );
}
