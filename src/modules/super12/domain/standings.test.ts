import { describe, expect, it } from "vitest";

import { computePlayerStats, computeStandings } from "./standings";
import { createDefaultConfig, type Match, type Player, type Phase } from "./types";

const players: Player[] = ["A", "B", "C", "D"].map((id) => ({ id, name: `Atleta ${id}` }));

function match(
  id: string,
  teamA: [string, string],
  teamB: [string, string],
  gamesA: number,
  gamesB: number,
  phase: Phase = "GRUPO",
): Match {
  return {
    id,
    round: 1,
    turn: 1,
    court: 1,
    teamA,
    teamB,
    status: "FINALIZADO",
    phase,
    gamesA,
    gamesB,
  };
}

const baseMatches: Match[] = [
  match("m1", ["A", "B"], ["C", "D"], 6, 0),
  match("m2", ["A", "C"], ["B", "D"], 6, 3),
  match("m3", ["A", "D"], ["B", "C"], 6, 1),
];

describe("computePlayerStats", () => {
  it("soma games pró/contra e pontos", () => {
    const config = createDefaultConfig({ rankingMode: "PONTOS" });
    const stats = computePlayerStats(players, baseMatches, config);

    const a = stats.get("A")!;
    expect(a.played).toBe(3);
    expect(a.wins).toBe(3);
    expect(a.points).toBe(9);
    expect(a.gamesFor).toBe(18);
    expect(a.gamesAgainst).toBe(4);
    expect(a.gameDiff).toBe(14);

    const b = stats.get("B")!;
    expect(b.wins).toBe(1);
    expect(b.points).toBe(3);
    expect(b.gameDiff).toBe(-2);
  });
});

describe("computeStandings", () => {
  it("ordena pelo critério principal e desempata por saldo de games", () => {
    const config = createDefaultConfig({ rankingMode: "PONTOS" });
    const standings = computeStandings(players, baseMatches, config);
    expect(standings.map((entry) => entry.playerId)).toEqual(["A", "B", "D", "C"]);
    expect(standings[0].position).toBe(1);
    expect(standings[2].tiebreak?.criterion).toBe("SALDO_GAMES");
  });

  it("funciona com VITORIAS", () => {
    const config = createDefaultConfig({ rankingMode: "VITORIAS" });
    const standings = computeStandings(players, baseMatches, config);
    expect(standings[0].playerId).toBe("A");
    expect(standings.map((entry) => entry.stats.wins)).toEqual([3, 1, 1, 1]);
  });

  it("usa confronto direto (games) quando configurado primeiro", () => {
    const config = createDefaultConfig({
      rankingMode: "VITORIAS",
      tiebreakOrder: ["CONFRONTO_DIRETO"],
    });
    const matches = [
      match("m1", ["A", "C"], ["B", "D"], 6, 0),
      match("m2", ["B", "C"], ["A", "D"], 6, 4),
    ];
    const standings = computeStandings(players, matches, config);
    expect(standings.map((entry) => entry.playerId)).toEqual(["C", "A", "B", "D"]);
    expect(standings[2].tiebreak?.criterion).toBe("CONFRONTO_DIRETO");
    expect(standings[2].tiebreak?.detail).toContain("games");
  });

  it("empate total é resolvido por sorteio determinístico", () => {
    const config = createDefaultConfig({ rankingMode: "VITORIAS" });
    const matches = [
      match("m1", ["A", "C"], ["B", "D"], 6, 0),
      match("m2", ["B", "C"], ["A", "D"], 6, 0),
    ];

    const first = computeStandings(players, matches, config);
    const second = computeStandings(players, matches, config);

    expect(first.map((entry) => entry.playerId)).toEqual(
      second.map((entry) => entry.playerId),
    );
    const lower = first[2];
    expect(lower.tiebreak?.criterion).toBe("SORTEIO");
  });

  it("considera apenas a fase informada", () => {
    const config = createDefaultConfig({ rankingMode: "VITORIAS" });
    const matches = [
      ...baseMatches,
      match("final", ["C", "D"], ["A", "B"], 6, 0, "FINAL"),
    ];
    const standings = computeStandings(players, matches, config, { phase: "GRUPO" });
    expect(standings[0].playerId).toBe("A");
    expect(standings[3].playerId).toBe("C");
  });

  it("anota a quantidade de descansos quando informada", () => {
    const config = createDefaultConfig();
    const byes = new Map<string, number>([
      ["A", 2],
      ["B", 1],
    ]);
    const standings = computeStandings(players, baseMatches, config, { byes });
    expect(standings.find((entry) => entry.playerId === "A")?.stats.byes).toBe(2);
    expect(standings.find((entry) => entry.playerId === "B")?.stats.byes).toBe(1);
  });
});

const livreConfig = () =>
  createDefaultConfig({ matchFormat: { kind: "LIVRE" } });

describe("computeStandings — desempates específicos", () => {
  it("GAMES_PRO decide quando saldo é igual (nº de jogos diferente)", () => {
    const ids = ["A", "B", "C", "D", "E", "F"];
    const group: Player[] = ids.map((id) => ({ id, name: id }));
    const matches: Match[] = [
      match("m1", ["A", "C"], ["D", "E"], 6, 2),
      match("m2", ["A", "D"], ["E", "F"], 3, 5),
      match("m3", ["A", "E"], ["C", "D"], 4, 6),
      match("b1", ["B", "F"], ["C", "D"], 6, 3),
      match("b2", ["B", "C"], ["E", "F"], 3, 6),
    ];
    const config = livreConfig();
    const standings = computeStandings(group, matches, config);

    const aIndex = standings.findIndex((entry) => entry.playerId === "A");
    const bIndex = standings.findIndex((entry) => entry.playerId === "B");
    expect(aIndex).toBeLessThan(bIndex);
    expect(standings[bIndex].tiebreak?.criterion).toBe("GAMES_PRO");
  });

  it("APROVEITAMENTO_GAMES decide quando configurado", () => {
    const group: Player[] = players;
    const matches: Match[] = [
      match("m1", ["A", "C"], ["B", "D"], 6, 2),
      match("m2", ["B", "C"], ["A", "D"], 6, 5),
    ];
    const config = createDefaultConfig({
      matchFormat: { kind: "LIVRE" },
      rankingMode: "VITORIAS",
      tiebreakOrder: ["APROVEITAMENTO_GAMES"],
    });

    const standings = computeStandings(group, matches, config);
    expect(standings[1].playerId).toBe("A");
    expect(standings[2].playerId).toBe("B");
    expect(standings[2].tiebreak?.criterion).toBe("APROVEITAMENTO_GAMES");
  });

  it("MINI_CLASSIFICACAO ordena quem está empatado usando só os jogos entre eles", () => {
    const ids = ["A", "B", "C", "D", "E", "F", "G", "H"];
    const group: Player[] = ids.map((id) => ({ id, name: id }));
    const matches: Match[] = [
      // jogos entre os quatro empatados (contam para a mini-classificação)
      match("y1", ["A", "B"], ["C", "D"], 6, 0),
      match("y2", ["A", "C"], ["B", "D"], 6, 0),
      match("y3", ["A", "D"], ["B", "C"], 6, 0),
      // jogos externos (não contam para a mini-classificação)
      match("ax1", ["A", "E"], ["F", "G"], 0, 6),
      match("ax2", ["A", "E"], ["F", "G"], 0, 6),
      match("ax3", ["A", "E"], ["F", "G"], 0, 6),
      ...["B", "C", "D"].flatMap((id, index) => [
        match(`ex${index}a`, [id, "E"], ["F", "G"], 6, 0),
        match(`ex${index}b`, [id, "E"], ["F", "G"], 6, 0),
        match(`ex${index}c`, [id, "E"], ["F", "G"], 0, 6),
      ]),
    ];
    const config = createDefaultConfig({
      matchFormat: { kind: "LIVRE" },
      rankingMode: "VITORIAS",
      tiebreakOrder: ["MINI_CLASSIFICACAO", "SORTEIO"],
    });

    const standings = computeStandings(group, matches, config, {
      excludeWithdrawn: false,
    });
    // E, F e G têm 6 vitórias e ocupam as posições 1–3.
    expect(standings[3].playerId).toBe("A");
    expect(standings[4].tiebreak?.criterion).toBe("MINI_CLASSIFICACAO");
    expect(
      ["A", "B", "C", "D"].every((id) =>
        standings.slice(3, 7).some((entry) => entry.playerId === id),
      ),
    ).toBe(true);
  });
});
