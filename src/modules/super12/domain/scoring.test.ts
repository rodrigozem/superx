import { describe, expect, it } from "vitest";

import {
  formatScoreLabel,
  validScoreChips,
  validateScore,
  type ScoreInput,
} from "./scoring";
import type { MatchFormat } from "./types";

const somaFixa6: MatchFormat = {
  kind: "SOMA_FIXA",
  total: 6,
  permitirEmpate: true,
  decisivoContaGame: true,
};

const somaFixa6SemEmpate: MatchFormat = {
  kind: "SOMA_FIXA",
  total: 6,
  permitirEmpate: false,
  decisivoContaGame: true,
};

const set6comTiebreak: MatchFormat = {
  kind: "SET_ATE_N",
  games: 6,
  tiebreak: true,
  difMinima2: true,
};

function expectOk(input: ScoreInput, format: MatchFormat = somaFixa6) {
  const result = validateScore(format, input);
  expect(result.ok).toBe(true);
  return result;
}

function expectError(input: ScoreInput, format: MatchFormat = somaFixa6) {
  const result = validateScore(format, input);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.length).toBeGreaterThan(0);
  return result;
}

describe("SOMA_FIXA (melhor de 6)", () => {
  it("aceita exatamente 6x0, 5x1, 4x2 e 3x3 (e inversos)", () => {
    for (const [a, b] of [
      [6, 0],
      [5, 1],
      [4, 2],
      [3, 3],
      [2, 4],
      [1, 5],
      [0, 6],
    ]) {
      const result = expectOk({ gamesA: a, gamesB: b });
      if (result.ok) {
        expect(result.effectiveGamesA + result.effectiveGamesB).toBe(6);
      }
    }
  });

  it("rejeita 4x3, 7x0, 3x2", () => {
    expectError({ gamesA: 4, gamesB: 3 });
    expectError({ gamesA: 7, gamesB: 0 });
    expectError({ gamesA: 3, gamesB: 2 });
  });

  it("marca 3x3 como empate quando permitido", () => {
    const result = expectOk({ gamesA: 3, gamesB: 3 });
    if (result.ok) expect(result.outcome).toBe("DRAW");
  });

  it("exige ponto decisivo quando empate não é permitido", () => {
    expectError({ gamesA: 3, gamesB: 3 }, somaFixa6SemEmpate);
    const result = expectOk(
      { gamesA: 3, gamesB: 3, decisivoPara: "A" },
      somaFixa6SemEmpate,
    );
    if (result.ok) {
      expect(result.outcome).toBe("A");
      expect(result.effectiveGamesA).toBe(4);
      expect(result.effectiveGamesB).toBe(3);
    }
  });

  it("gera os chips de resultados válidos", () => {
    const chips = validScoreChips(somaFixa6);
    expect(chips).toHaveLength(7);
    expect(chips).toContainEqual({ gamesA: 6, gamesB: 0 });
    expect(chips).toContainEqual({ gamesA: 3, gamesB: 3 });
  });
});

describe("SET_ATE_N", () => {
  it("aceita 6x4 e 7x5, rejeita 6x5 com diferença mínima 2", () => {
    expectOk({ gamesA: 6, gamesB: 4 }, set6comTiebreak);
    expectOk({ gamesA: 7, gamesB: 5 }, set6comTiebreak);
    expectError({ gamesA: 6, gamesB: 5 }, set6comTiebreak);
  });

  it("exige tie-break em 6x6", () => {
    expectError({ gamesA: 6, gamesB: 6 }, set6comTiebreak);
    const result = expectOk(
      { gamesA: 6, gamesB: 6, tiebreakA: 7, tiebreakB: 5 },
      set6comTiebreak,
    );
    if (result.ok) expect(result.outcome).toBe("A");
  });
});

describe("PRO_SET", () => {
  const proSet: MatchFormat = { kind: "PRO_SET", games: 8 };
  it("aceita 8x6 e 8x8 com tie-break", () => {
    expectOk({ gamesA: 8, gamesB: 6 }, proSet);
    expectError({ gamesA: 8, gamesB: 7 }, proSet);
    expectOk({ gamesA: 8, gamesB: 8, tiebreakA: 10, tiebreakB: 8 }, proSet);
  });
});

describe("TEMPO / LIVRE", () => {
  it("aceita qualquer placar não negativo", () => {
    expectOk({ gamesA: 7, gamesB: 3 }, { kind: "TEMPO", minutos: 15 });
    expectOk({ gamesA: 11, gamesB: 9 }, { kind: "LIVRE" });
  });

  it("formata o rótulo do placar", () => {
    expect(formatScoreLabel(somaFixa6, { gamesA: 6, gamesB: 0 })).toBe("6x0");
    expect(
      formatScoreLabel(somaFixa6SemEmpate, {
        gamesA: 3,
        gamesB: 3,
        decisivoPara: "B",
      }),
    ).toBe("3x3 (decisivo: B)");
  });
});
