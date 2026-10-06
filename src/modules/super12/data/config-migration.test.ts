import { describe, expect, it } from "vitest";

import {
  createDefaultConfig,
  DEFAULT_TIEBREAK_ORDER,
  LEGACY_TIEBREAK_ORDER,
} from "@/modules/super12/domain";

import { migrateTournamentConfig } from "./config-migration";
import type { StoredTournament } from "./types";

function stored(
  configOverrides: Partial<StoredTournament["config"]> = {},
): StoredTournament {
  return {
    id: "t1",
    name: "Torneio",
    status: "EM_ANDAMENTO",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    config: { ...createDefaultConfig(), ...configOverrides },
    players: [],
    metrics: {
      partnerRepeatPairs: 0,
      maxOpponentMeetings: 1,
      opponentMeetingHistogram: {},
      gamesPerPlayerMin: 0,
      gamesPerPlayerMax: 0,
      byesPerPlayerMin: 0,
      byesPerPlayerMax: 0,
      relaxed: false,
      relaxations: [],
    },
    byesByRound: {},
  };
}

describe("migrateTournamentConfig", () => {
  it("migra torneio legado para a nova ordem e critério Vitórias", () => {
    const result = migrateTournamentConfig(
      stored({
        tiebreakOrder: [...LEGACY_TIEBREAK_ORDER],
        rankingMode: "SALDO_GAMES",
      }),
    );

    expect(result.changed).toBe(true);
    expect(result.tournament.config.tiebreakOrder).toEqual(
      DEFAULT_TIEBREAK_ORDER,
    );
    expect(result.tournament.config.rankingMode).toBe("VITORIAS");
    expect(result.tournament.config.tiebreakOrder).not.toEqual(
      LEGACY_TIEBREAK_ORDER,
    );
  });

  it("não mexe em torneio já migrado (ordem nova + Vitórias)", () => {
    const original = stored({
      tiebreakOrder: [...DEFAULT_TIEBREAK_ORDER],
      rankingMode: "VITORIAS",
    });

    const result = migrateTournamentConfig(original);

    expect(result.changed).toBe(false);
    expect(result.tournament).toBe(original);
  });

  it("preserva torneio novo que escolheu outro critério principal", () => {
    const original = stored({
      tiebreakOrder: [...DEFAULT_TIEBREAK_ORDER],
      rankingMode: "SALDO_GAMES",
    });

    const result = migrateTournamentConfig(original);

    expect(result.changed).toBe(false);
    expect(result.tournament.config.rankingMode).toBe("SALDO_GAMES");
  });

  it("preserva ordem personalizada de um backup estrangeiro", () => {
    const original = stored({
      tiebreakOrder: ["SORTEIO", "SALDO_GAMES"],
      rankingMode: "PONTOS",
    });

    const result = migrateTournamentConfig(original);

    expect(result.changed).toBe(false);
    expect(result.tournament.config.tiebreakOrder).toEqual([
      "SORTEIO",
      "SALDO_GAMES",
    ]);
  });

  it("é idempotente: migrar de novo não altera nada", () => {
    const first = migrateTournamentConfig(
      stored({
        tiebreakOrder: [...LEGACY_TIEBREAK_ORDER],
        rankingMode: "GAMES_PRO",
      }),
    );
    const second = migrateTournamentConfig(first.tournament);

    expect(first.changed).toBe(true);
    expect(second.changed).toBe(false);
    expect(second.tournament.config).toEqual(first.tournament.config);
  });
});
