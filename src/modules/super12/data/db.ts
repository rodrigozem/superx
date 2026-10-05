import Dexie, { type EntityTable } from "dexie";

import type {
  DeletedTournament,
  StoredMatch,
  StoredMeta,
  StoredTournament,
} from "./types";

export class SuperTournamentDatabase extends Dexie {
  tournaments!: EntityTable<StoredTournament, "id">;
  matches!: EntityTable<StoredMatch, "id">;
  meta!: EntityTable<StoredMeta, "key">;
  /** Torneios apagados localmente, aguardando exclusão na nuvem. */
  deletedTournaments!: EntityTable<DeletedTournament, "id">;

  constructor(name = "super12") {
    super(name);

    this.version(1).stores({
      tournaments: "id, createdAt, status",
      matches:
        "id, tournamentId, [tournamentId+round], [tournamentId+turn], [tournamentId+status]",
      meta: "key",
    });
    this.version(2).stores({
      deletedTournaments: "id, deletedAt",
    });
  }
}

let instance: SuperTournamentDatabase | null = null;

/**
 * Instância compartilhada. Criar o Dexie é seguro no servidor (a abertura do
 * IndexedDB só acontece no browser), o que preserva o HTML gerado no build.
 */
export function getDb(): SuperTournamentDatabase {
  instance ??= new SuperTournamentDatabase();
  return instance;
}

export function createDatabase(name: string): SuperTournamentDatabase {
  return new SuperTournamentDatabase(name);
}
