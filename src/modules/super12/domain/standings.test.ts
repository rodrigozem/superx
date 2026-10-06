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

  it("CONFRONTO_DIRETO desempata3 atletas com vitórias, saldo e games iguais", () => {
    const ids = ["A", "B", "C", "p1", "p2", "p3", "p4", "x1", "x2", "x3", "x4", "x5", "x6"];
    const group: Player[] = ids.map((id) => ({ id, name: id }));
    const matches: Match[] = [
      match("m1", ["A", "p1"], ["B", "x1"], 6, 0), // A derrota B
      match("m2", ["A", "p2"], ["C", "x2"], 6, 6), // A empata com C
      match("m3", ["B", "p3"], ["x3", "x4"], 12, 0), // B compensa o saldo fora
      match("m4", ["C", "p4"], ["x5", "x6"], 6, 0), // C compensa o saldo fora
    ];
    const config = createDefaultConfig({ matchFormat: { kind: "LIVRE" } });

    const standings = computeStandings(group, matches, config);

    // A, B e C ficam empatados em tudo (1 vitória, saldo +6, 12 games pró);
    // p3 entra primeiro pelo saldo (+12) e o confronto direto resolve o trio:
    // A venceu o grupo, C (saldo 0) fica à frente de B (saldo -6).
    expect(standings[0].playerId).toBe("p3");
    expect(standings.slice(1, 4).map((entry) => entry.playerId)).toEqual([
      "A",
      "C",
      "B",
    ]);
    expect(standings[2].tiebreak?.criterion).toBe("CONFRONTO_DIRETO");
    expect(standings[2].tiebreak?.detail).toContain("vitória");
    expect(standings[3].tiebreak?.criterion).toBe("CONFRONTO_DIRETO");
  });

  it("CONFRONTO_DIRETO não separa quando um empatado nunca jogou contra o grupo", () => {
    const ids = [
      "A", "B", "C",
      "p1", "p2", "p3", "p4", "p5", "p6",
      "x1", "x2", "x3", "x4", "x5", "x6", "x7", "x8", "x9", "x10", "x11",
    ];
    const group: Player[] = ids.map((id) => ({ id, name: id }));
    const matches: Match[] = [
      match("m1", ["A", "p1"], ["B", "x1"], 6, 0), // A e B se enfrentam
      match("m2", ["A", "p2"], ["x2", "x3"], 6, 0),
      match("m3", ["B", "p3"], ["x4", "x5"], 6, 0),
      match("m4", ["B", "p4"], ["x6", "x7"], 6, 0),
      match("m5", ["C", "p5"], ["x8", "x9"], 6, 0), // C só joga fora do trio
      match("m6", ["C", "p6"], ["x10", "x11"], 6, 0),
    ];
    const config = createDefaultConfig({
      tiebreakOrder: ["CONFRONTO_DIRETO", "SORTEIO"],
    });

    const standings = computeStandings(group, matches, config);

    // C nunca enfrentou A nem B: o critério não decide nada e o sorteio
    // (próximo da ordem) resolve os três.
    expect(
      standings.every((entry) => entry.tiebreak?.criterion !== "CONFRONTO_DIRETO"),
    ).toBe(true);
    expect(
      standings.some((entry) => entry.tiebreak?.criterion === "SORTEIO"),
    ).toBe(true);
  });
});
