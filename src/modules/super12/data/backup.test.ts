import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computeStandings } from "@/modules/super12/domain";

import {
  BACKUP_KIND,
  BACKUP_VERSION,
  exportTournamentBackup,
  importTournamentBackup,
} from "./backup";
import { createDatabase, type SuperTournamentDatabase } from "./db";
import { createTournament, listMatches, recordScore } from "./tournament-repository";
import type { TournamentDraft } from "./schema";

let db: SuperTournamentDatabase;
let dbName: string;
let counter = 0;

function draft(overrides: Partial<TournamentDraft> = {}): TournamentDraft {
  return {
    name: "Copa do Bairro",
    format: "SUPER12",
    scheduleMode: "COMPLETO",
    courts: 3,
    matchFormat: {
      kind: "SOMA_FIXA",
      total: 6,
      permitirEmpate: true,
      decisivoContaGame: true,
    },
    rankingMode: "VITORIAS",
    seed: 7,
    players: Array.from({ length: 12 }, (_, index) => ({ name: `Atleta ${index + 1}` })),
    ...overrides,
  };
}

async function seedTournament() {
  const created = await createTournament(draft(), db);
  if (!created.ok) throw new Error(created.error);
  return created.data;
}

beforeEach(async () => {
  counter += 1;
  dbName = `super12-backup-test-${counter}`;
  db = createDatabase(dbName);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("exportTournamentBackup", () => {
  it("exporta torneios e partidas com o envelope versionado", async () => {
    const tournament = await seedTournament();

    const backup = await exportTournamentBackup(db);

    expect(backup.kind).toBe(BACKUP_KIND);
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(backup.tournaments).toHaveLength(1);
    expect(backup.tournaments[0].id).toBe(tournament.id);
    expect(backup.matches.length).toBeGreaterThan(0);
    expect(
      backup.matches.every((match) => match.tournamentId === tournament.id),
    ).toBe(true);
  });

  it("exporta um arquivo vazio quando não há torneios", async () => {
    const backup = await exportTournamentBackup(db);
    expect(backup.tournaments).toEqual([]);
    expect(backup.matches).toEqual([]);
  });
});

describe("importTournamentBackup", () => {
  it("recria o torneio em um novo id, preservando tabela e classificação", async () => {
    const original = await seedTournament();
    const originalMatches = await listMatches(original.id, db);
    const backup = await exportTournamentBackup(db);

    const result = await importTournamentBackup(backup, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tournaments = await db.tournaments.toArray();
    expect(tournaments).toHaveLength(2);

    const imported = tournaments.find((item) => item.id !== original.id);
    expect(imported).toBeDefined();
    if (!imported) return;

    expect(imported.id).not.toBe(original.id);
    expect(imported.name).toBe(original.name);
    expect(imported.players.map((player) => player.name)).toEqual(
      original.players.map((player) => player.name),
    );

    const importedMatches = await listMatches(imported.id, db);
    expect(importedMatches).toHaveLength(originalMatches.length);

    // As duplas devem apontar para os atletas do torneio importado.
    const playerIds = new Set(imported.players.map((player) => player.id));
    for (const match of importedMatches) {
      expect([...match.teamA, ...match.teamB].every((id) => playerIds.has(id))).toBe(true);
    }

    const standings = computeStandings(
      imported.players,
      importedMatches,
      imported.config,
      {},
    );
    expect(standings).toHaveLength(12);
  });

  it("mantém os placares já lançados", async () => {
    const original = await seedTournament();
    const matches = await listMatches(original.id, db);
    const target = matches[0];
    const scored = await recordScore(
      target.id,
      { gamesA: 4, gamesB: 2 },
      "organizador",
      db,
    );
    expect(scored.ok).toBe(true);

    const backup = await exportTournamentBackup(db);
    const result = await importTournamentBackup(backup, db);
    expect(result.ok).toBe(true);

    const importedTournament = (await db.tournaments.toArray()).find(
      (item) => item.id !== original.id,
    );
    if (!importedTournament) throw new Error("torneio não importado");

    const importedMatches = await listMatches(importedTournament.id, db);
    const importedScored = importedMatches.find(
      (match) => match.gamesA === 4 && match.gamesB === 2,
    );

    expect(importedScored).toBeDefined();
    expect(importedScored?.status).toBe("FINALIZADO");
    expect(importedScored?.updatedBy).toBe("organizador");
  });

  it("recusa arquivos de outra versão ou formato", async () => {
    const invalidVersion = await importTournamentBackup(
      { kind: BACKUP_KIND, version: 99, exportedAt: "2026-01-01", tournaments: [], matches: [] },
      db,
    );
    expect(invalidVersion.ok).toBe(false);

    const wrongKind = await importTournamentBackup({ torneios: [] }, db);
    expect(wrongKind.ok).toBe(false);
  });

  it("descarta placares inválidos em vez de persistir dados corrompidos", async () => {
    const original = await seedTournament();
    const backup = await exportTournamentBackup(db);
    const firstMatch = backup.matches[0];

    const corrupted = {
      ...backup,
      matches: backup.matches.map((match) =>
        match.id === firstMatch.id
          ? { ...match, status: "FINALIZADO", gamesA: 5, gamesB: 9 }
          : match,
      ),
    };

    const result = await importTournamentBackup(corrupted, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skippedMatches).toBe(1);
    expect(result.data.warnings).toHaveLength(1);

    const importedTournament = (await db.tournaments.toArray()).find(
      (item) => item.id !== original.id,
    );
    if (!importedTournament) throw new Error("torneio não importado");

    const importedMatches = await listMatches(importedTournament.id, db);
    expect(importedMatches.some((match) => match.gamesA === 5 && match.gamesB === 9)).toBe(false);
  });

  it("ignora partidas cujo atleta não existe no torneio", async () => {
    const original = await seedTournament();
    const backup = await exportTournamentBackup(db);

    const corrupted = {
      ...backup,
      matches: backup.matches.map((match, index) =>
        index === 0 ? { ...match, teamA: ["atleta-fantasma", "outro"] } : match,
      ),
    };

    const result = await importTournamentBackup(corrupted, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.skippedMatches).toBe(1);

    const importedTournament = (await db.tournaments.toArray()).find(
      (item) => item.id !== original.id,
    );
    if (!importedTournament) throw new Error("torneio não importado");

    const importedMatches = await listMatches(importedTournament.id, db);
    expect(importedMatches).toHaveLength(backup.matches.length - 1);
  });
});
