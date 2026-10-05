import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDatabase, type SuperTournamentDatabase } from "./db";
import type { TournamentDraft } from "./schema";
import {
  applySnapshot,
  buildSyncPayload,
  captureInitialIds,
} from "./sync-apply";
import {
  createTournament,
  deleteTournament,
  listMatches,
  recordScore,
} from "./tournament-repository";
import type { StoredTournament } from "./types";

let db: SuperTournamentDatabase;
let dbName: string;
let counter = 0;

function draft(overrides: Partial<TournamentDraft> = {}): TournamentDraft {
  return {
    name: "Copa Nuvem",
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
    seed: 11,
    players: Array.from({ length: 12 }, (_, index) => ({
      name: `Atleta ${index + 1}`,
    })),
    ...overrides,
  };
}

async function seedTournament() {
  const created = await createTournament(draft(), db);
  if (!created.ok) throw new Error(created.error);
  const matches = await listMatches(created.data.id, db);
  return { tournament: created.data, matches };
}

beforeEach(async () => {
  counter += 1;
  dbName = `super12-sync-test-${counter}`;
  db = createDatabase(dbName);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("buildSyncPayload", () => {
  it("reúne torneios, partidas e preenche updatedAt das partidas", async () => {
    const { tournament, matches } = await seedTournament();
    const match = matches[0];
    await recordScore(match.id, { gamesA: 6, gamesB: 0 }, "admin", db);

    const payload = await buildSyncPayload(db);

    expect(payload.tournaments.map((entry) => entry.id)).toEqual([tournament.id]);
    expect(payload.matches).toHaveLength(matches.length);
    expect(payload.matches.every((entry) => Boolean(entry.updatedAt))).toBe(true);
    expect(payload.deletedTournamentIds).toEqual([]);
  });

  it("inclui exclusões pendentes como tombstones", async () => {
    const { tournament } = await seedTournament();
    await deleteTournament(tournament.id, db);

    const payload = await buildSyncPayload(db);

    expect(payload.tournaments).toEqual([]);
    expect(payload.matches).toEqual([]);
    expect(payload.deletedTournamentIds).toEqual([tournament.id]);
  });
});

describe("applySnapshot", () => {
  it("importa torneios e partidas que só existem na nuvem", async () => {
    const { tournament, matches } = await seedTournament();
    const payload = await buildSyncPayload(db);

    await db.tournaments.delete(tournament.id);
    await db.matches.where("tournamentId").equals(tournament.id).delete();

    const initial = await captureInitialIds(db);
    await applySnapshot(
      db,
      { tournaments: payload.tournaments, matches: payload.matches },
      initial,
      [],
    );

    const restored = await db.tournaments.get(tournament.id);
    expect(restored?.name).toBe(tournament.name);
    expect(await listMatches(tournament.id, db)).toHaveLength(matches.length);
  });

  it("mantém a versão local quando ela é mais nova que a da nuvem", async () => {
    const { tournament, matches } = await seedTournament();
    const payload = await buildSyncPayload(db);

    const staleRemote: StoredTournament = {
      ...tournament,
      name: "Versão antiga da nuvem",
      updatedAt: "2000-01-01T00:00:00.000Z",
    };

    const initial = await captureInitialIds(db);
    await applySnapshot(
      db,
      { tournaments: [staleRemote], matches: payload.matches },
      initial,
      [],
    );

    const local = await db.tournaments.get(tournament.id);
    expect(local?.name).toBe(tournament.name);
    expect(local?.updatedAt).toBe(tournament.updatedAt);
    expect(await listMatches(tournament.id, db)).toHaveLength(matches.length);
  });

  it("aplica a versão da nuvem quando ela é mais nova", async () => {
    const { tournament } = await seedTournament();
    const payload = await buildSyncPayload(db);

    const newerRemote: StoredTournament = {
      ...tournament,
      name: "Editado em outro aparelho",
      updatedAt: "2999-01-01T00:00:00.000Z",
    };

    const initial = await captureInitialIds(db);
    await applySnapshot(
      db,
      { tournaments: [newerRemote], matches: payload.matches },
      initial,
      [],
    );

    const local = await db.tournaments.get(tournament.id);
    expect(local?.name).toBe("Editado em outro aparelho");
  });

  it("remove localmente o que a nuvem não devolveu", async () => {
    const { tournament, matches } = await seedTournament();

    const initial = await captureInitialIds(db);
    await applySnapshot(db, { tournaments: [], matches: [] }, initial, []);

    expect(await db.tournaments.get(tournament.id)).toBeUndefined();
    expect(await listMatches(tournament.id, db)).toHaveLength(0);
    expect(initial.matches.size).toBe(matches.length);
  });

  it("não ressuscita torneio com exclusão local pendente e limpa o tombstone", async () => {
    const { tournament } = await seedTournament();
    const payload = await buildSyncPayload(db);
    await deleteTournament(tournament.id, db);

    const initial = await captureInitialIds(db);
    await applySnapshot(
      db,
      { tournaments: payload.tournaments, matches: payload.matches },
      initial,
      [tournament.id],
    );

    expect(await db.tournaments.get(tournament.id)).toBeUndefined();
    expect(await db.matches.where("tournamentId").equals(tournament.id).count()).toBe(0);
    expect(await db.deletedTournaments.toArray()).toEqual([]);
  });
});
