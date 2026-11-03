import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computeStandings } from "@/modules/super12/domain";

import { createDatabase, type SuperTournamentDatabase } from "./db";
import { parseTournamentDraft, type TournamentDraft } from "./schema";
import {
  clearScore,
  createTournament,
  deleteTournament,
  getActiveTournamentId,
  listMatches,
  listTournaments,
  recordScore,
  renameTournament,
  updatePlayerNames,
} from "./tournament-repository";
import type { StoredMatch, StoredTournament } from "./types";

let db: SuperTournamentDatabase;
let dbName: string;
let counter = 0;

function draft(overrides: Partial<TournamentDraft> = {}): TournamentDraft {
  return {
    name: "Super 12 da Semana",
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
    seed: 42,
    players: Array.from({ length: 12 }, (_, index) => ({
      name: `Atleta ${index + 1}`,
    })),
    ...overrides,
  };
}

function signature(tournament: StoredTournament, matches: StoredMatch[]) {
  const names = new Map(tournament.players.map((player) => [player.id, player.name]));
  return matches
    .map(
      (match) =>
        `R${match.round}/${match.turn}: ${match.teamA
          .map((id) => names.get(id))
          .join("+")} x ${match.teamB
          .map((id) => names.get(id))
          .join("+")}`,
    )
    .join(" | ");
}

beforeEach(async () => {
  counter += 1;
  dbName = `super12-test-${counter}`;
  db = createDatabase(dbName);
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe("createTournament", () => {
  it("persiste o torneio, os atletas e a tabela completa", async () => {
    const result = await createTournament(draft(), db);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.players).toHaveLength(12);
    expect(result.data.byesByRound).toEqual({});

    const matches = await listMatches(result.data.id, db);
    expect(matches).toHaveLength(33);
    expect(matches.every((match) => match.status === "AGENDADO")).toBe(true);
    expect(new Set(matches.map((match) => match.round)).size).toBe(11);

    await expect(getActiveTournamentId(db)).resolves.toBe(result.data.id);
    await expect(listTournaments(db)).resolves.toHaveLength(1);
  });

  it("gera Super 6 com 6 rodadas e 6 jogos", async () => {
    const result = await createTournament(
      draft({
        format: "SUPER6",
        courts: 1,
        players: Array.from({ length: 6 }, (_, index) => ({
          name: `Atleta ${index + 1}`,
        })),
      }),
      db,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const matches = await listMatches(result.data.id, db);
    expect(matches).toHaveLength(6);
    expect(new Set(matches.map((match) => match.round)).size).toBe(6);
    expect(Object.keys(result.data.byesByRound)).toHaveLength(6);
  });

  it("gera Super 10 com 10 rodadas e 20 jogos", async () => {
    const result = await createTournament(
      draft({
        format: "SUPER10",
        scheduleMode: "EQUILIBRADO",
        players: Array.from({ length: 10 }, (_, index) => ({
          name: `Atleta ${index + 1}`,
        })),
      }),
      db,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const matches = await listMatches(result.data.id, db);
    expect(matches).toHaveLength(20);
    expect(Object.keys(result.data.byesByRound)).toHaveLength(10);
  });

  it("gera Super 12 reduzido com exatamente as rodadas escolhidas", async () => {
    const result = await createTournament(
      draft({ scheduleMode: "REDUZIDO", rounds: 4 }),
      db,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.config.rounds).toBe(4);

    const matches = await listMatches(result.data.id, db);
    expect(matches).toHaveLength(12);
    expect(new Set(matches.map((match) => match.round)).size).toBe(4);
  });

  it("persiste a imagem de capa", async () => {
    const result = await createTournament(
      draft({ image: "data:image/jpeg;base64,AAAA" }),
      db,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const stored = await db.tournaments.get(result.data.id);
    expect(stored?.image).toBe("data:image/jpeg;base64,AAAA");
  });

  it("rejeita a quantidade errada de atletas", async () => {
    const result = await createTournament(
      draft({
        players: Array.from({ length: 8 }, (_, index) => ({
          name: `Atleta ${index + 1}`,
        })),
      }),
      db,
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.fieldErrors?.players).toContain("exatamente 12");
    await expect(listTournaments(db)).resolves.toHaveLength(0);
  });

  it("rejeita nomes repetidos e modos incompatíveis com o formato", async () => {
    const duplicated = parseTournamentDraft(
      draft({
        players: [
          { name: "Ana" },
          { name: "ana" },
          ...Array.from({ length: 10 }, (_, index) => ({
            name: `Atleta ${index + 3}`,
          })),
        ],
      }),
    );
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.fieldErrors["players.1.name"]).toBeTruthy();
    }

    const wrongMode = parseTournamentDraft(
      draft({ format: "SUPER8", scheduleMode: "EQUILIBRADO" }),
    );
    expect(wrongMode.ok).toBe(false);
  });

  it("exige e valida as rodadas no modo Reduzido", () => {
    const missing = parseTournamentDraft(
      draft({ scheduleMode: "REDUZIDO", rounds: undefined }),
    );
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.fieldErrors.rounds).toBeTruthy();
    }

    const tooMany = parseTournamentDraft(
      draft({ scheduleMode: "REDUZIDO", rounds: 12 }),
    );
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) {
      expect(tooMany.fieldErrors.rounds).toContain("11");
    }

    const complete = parseTournamentDraft(draft({ scheduleMode: "COMPLETO" }));
    expect(complete.ok).toBe(true);
  });

  it("valida Super 6 reduzido com no máximo 6 rodadas", () => {
    const sixPlayers = Array.from({ length: 6 }, (_, index) => ({
      name: `Atleta ${index + 1}`,
    }));

    const ok = parseTournamentDraft(
      draft({
        format: "SUPER6",
        scheduleMode: "REDUZIDO",
        rounds: 6,
        players: sixPlayers,
      }),
    );
    expect(ok.ok).toBe(true);

    const tooMany = parseTournamentDraft(
      draft({
        format: "SUPER6",
        scheduleMode: "REDUZIDO",
        rounds: 7,
        players: sixPlayers,
      }),
    );
    expect(tooMany.ok).toBe(false);
    if (!tooMany.ok) expect(tooMany.fieldErrors.rounds).toContain("6");
  });

  it("mantém a mesma tabela para a mesma seed e muda com outra seed", async () => {
    const first = await createTournament(draft({ seed: 7 }), db);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await createTournament(draft({ seed: 7 }), db);
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const other = await createTournament(draft({ seed: 99 }), db);
    expect(other.ok).toBe(true);
    if (!other.ok) return;

    const firstMatches = await listMatches(first.data.id, db);
    const secondMatches = await listMatches(second.data.id, db);
    const otherMatches = await listMatches(other.data.id, db);

    expect(signature(first.data, firstMatches)).toBe(
      signature(second.data, secondMatches),
    );
    expect(signature(first.data, firstMatches)).not.toBe(
      signature(other.data, otherMatches),
    );
  });
});

describe("recordScore", () => {
  it("valida o placar, finaliza a partida e alimenta a classificação", async () => {
    const created = await createTournament(
      draft({
        format: "SUPER8",
        courts: 2,
        seed: 3,
        players: Array.from({ length: 8 }, (_, index) => ({
          name: `Atleta ${index + 1}`,
        })),
      }),
      db,
    );
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const matches = await listMatches(created.data.id, db);
    expect(matches).toHaveLength(14);

    for (const match of matches) {
      const result = await recordScore(match.id, { gamesA: 6, gamesB: 0 }, "admin", db);
      expect(result.ok).toBe(true);
    }

    const updated = await listMatches(created.data.id, db);
    expect(updated.every((match) => match.status === "FINALIZADO")).toBe(true);
    expect(updated.every((match) => match.updatedBy === "admin")).toBe(true);

    const standings = computeStandings(created.data.players, updated, created.data.config);
    const totalWins = standings.reduce((sum, entry) => sum + entry.stats.wins, 0);
    // São 14 jogos em duplas: cada partida dá vitória aos 2 atletas do time A.
    expect(totalWins).toBe(28);
    expect(standings).toHaveLength(8);
  });

  it("recusa placar inválido e mantém a partida agendada", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const [first] = await listMatches(created.data.id, db);
    const result = await recordScore(first.id, { gamesA: 4, gamesB: 3 }, undefined, db);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toContain("soma dos games");

    const [unchanged] = await listMatches(created.data.id, db);
    expect(unchanged.status).toBe("AGENDADO");
    expect(unchanged.gamesA).toBeUndefined();
  });

  it("limpa o placar e devolve a partida para agendado", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const [first] = await listMatches(created.data.id, db);
    await recordScore(first.id, { gamesA: 3, gamesB: 3 }, undefined, db);
    await clearScore(first.id, db);

    const [cleared] = await listMatches(created.data.id, db);
    expect(cleared.status).toBe("AGENDADO");
    expect(cleared.gamesA).toBeUndefined();
    expect(cleared.gamesB).toBeUndefined();
  });
});

describe("renameTournament", () => {
  it("altera o nome, faz trim e persiste", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const renamed = await renameTournament(created.data.id, "  Liga de Verão  ", db);
    expect(renamed.ok).toBe(true);
    if (!renamed.ok) return;
    expect(renamed.data.name).toBe("Liga de Verão");

    const stored = await db.tournaments.get(created.data.id);
    expect(stored?.name).toBe("Liga de Verão");
  });

  it("rejeita nome vazio ou acima de 80 caracteres", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await expect(
      renameTournament(created.data.id, "   ", db),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      renameTournament(created.data.id, "x".repeat(81), db),
    ).resolves.toMatchObject({ ok: false });
  });

  it("retorna erro quando o torneio não existe", async () => {
    await expect(
      renameTournament("nao-existe", "Novo nome", db),
    ).resolves.toMatchObject({ ok: false });
  });
});

describe("updatePlayerNames", () => {
  it("altera, faz trim e persiste os nomes dos atletas", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const [first, second] = created.data.players;
    const result = await updatePlayerNames(
      created.data.id,
      { [first.id]: "  Ana  ", [second.id]: "Bia" },
      db,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.players[0].name).toBe("Ana");
    expect(result.data.players[1].name).toBe("Bia");
    expect(result.data.players[2].name).toBe("Atleta 3");

    const stored = await db.tournaments.get(created.data.id);
    expect(stored?.players[0].name).toBe("Ana");
    expect(stored?.players[1].name).toBe("Bia");
  });

  it("rejeita nome vazio ou repetido e não persiste", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const [first, second] = created.data.players;

    await expect(
      updatePlayerNames(created.data.id, { [first.id]: "   " }, db),
    ).resolves.toMatchObject({ ok: false });

    await expect(
      updatePlayerNames(
        created.data.id,
        { [first.id]: "Bia", [second.id]: "bia" },
        db,
      ),
    ).resolves.toMatchObject({ ok: false });

    const stored = await db.tournaments.get(created.data.id);
    expect(stored?.players[0].name).toBe("Atleta 1");
    expect(stored?.players[1].name).toBe("Atleta 2");
  });

  it("retorna erro quando o torneio não existe", async () => {
    await expect(
      updatePlayerNames("nao-existe", {}, db),
    ).resolves.toMatchObject({ ok: false });
  });
});

describe("deleteTournament", () => {
  it("remove partidas, torneio e a referência de torneio ativo", async () => {
    const created = await createTournament(draft(), db);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    await deleteTournament(created.data.id, db);

    await expect(listTournaments(db)).resolves.toHaveLength(0);
    await expect(listMatches(created.data.id, db)).resolves.toHaveLength(0);
    await expect(getActiveTournamentId(db)).resolves.toBeUndefined();
  });
});
