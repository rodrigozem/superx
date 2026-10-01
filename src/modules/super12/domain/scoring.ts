import type { MatchFormat, TeamSide } from "./types";

export interface ScoreInput {
  gamesA: number;
  gamesB: number;
  decisivoPara?: TeamSide;
  tiebreakA?: number;
  tiebreakB?: number;
}

export type Outcome = TeamSide | "DRAW";

export type ScoreValidation =
  | {
      ok: true;
      outcome: Outcome;
      effectiveGamesA: number;
      effectiveGamesB: number;
    }
  | { ok: false; error: string };

const ERR_INTEIROS = "O placar deve ser composto por números inteiros de games.";

function isNonNegativeInteger(value: number) {
  return Number.isInteger(value) && value >= 0;
}

function validateTiebreak(input: ScoreInput): boolean {
  return (
    input.tiebreakA !== undefined &&
    input.tiebreakB !== undefined &&
    isNonNegativeInteger(input.tiebreakA) &&
    isNonNegativeInteger(input.tiebreakB) &&
    input.tiebreakA !== input.tiebreakB &&
    Math.max(input.tiebreakA, input.tiebreakB) >= 7 &&
    Math.abs(input.tiebreakA - input.tiebreakB) >= 2
  );
}

export function validateScore(
  format: MatchFormat,
  input: ScoreInput,
): ScoreValidation {
  const { gamesA, gamesB } = input;

  if (!isNonNegativeInteger(gamesA) || !isNonNegativeInteger(gamesB)) {
    return { ok: false, error: ERR_INTEIROS };
  }

  switch (format.kind) {
    case "SOMA_FIXA": {
      if (gamesA + gamesB !== format.total) {
        return {
          ok: false,
          error: `A soma dos games deve ser exatamente ${format.total} (ex.: 6x0, 5x1, 4x2, 3x3).`,
        };
      }

      if (gamesA === gamesB) {
        if (format.permitirEmpate) {
          return { ok: true, outcome: "DRAW", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
        }
        if (input.decisivoPara === undefined) {
          return {
            ok: false,
            error: "Empate não permitido: informe quem venceu o ponto decisivo.",
          };
        }
        const bonus = format.decisivoContaGame ? 1 : 0;
        return input.decisivoPara === "A"
          ? { ok: true, outcome: "A", effectiveGamesA: gamesA + bonus, effectiveGamesB: gamesB }
          : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB + bonus };
      }

      return gamesA > gamesB
        ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
        : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
    }

    case "SET_ATE_N": {
      const winner = Math.max(gamesA, gamesB);
      const margin = Math.abs(gamesA - gamesB);

      if (gamesA === gamesB) {
        if (!format.tiebreak || gamesA !== format.games) {
          return {
            ok: false,
            error: `Set até ${format.games} games não permite empate.`,
          };
        }
        if (!validateTiebreak(input)) {
          return {
            ok: false,
            error: "Informe o tie-break (mínimo 7 pontos, diferença de 2).",
          };
        }
        return (input.tiebreakA as number) > (input.tiebreakB as number)
          ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
          : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
      }

      const minMargin = format.difMinima2 ? 2 : 1;
      if (winner < format.games) {
        return {
          ok: false,
          error: `O vencedor precisa atingir ${format.games} games.`,
        };
      }
      if (!format.difMinima2 && winner !== format.games) {
        return {
          ok: false,
          error: `O set termina em ${format.games} games.`,
        };
      }
      if (margin < minMargin) {
        return {
          ok: false,
          error: format.difMinima2
            ? `É necessário vencer por diferença de ${minMargin} games.`
            : "Placar inválido.",
        };
      }

      return gamesA > gamesB
        ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
        : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
    }

    case "PRO_SET": {
      const winner = Math.max(gamesA, gamesB);
      const margin = Math.abs(gamesA - gamesB);

      if (gamesA === gamesB) {
        if (gamesA !== 8 || !validateTiebreak(input)) {
          return {
            ok: false,
            error: "O Pro Set vai até 8 games; em 8x8, informe o tie-break.",
          };
        }
        return (input.tiebreakA as number) > (input.tiebreakB as number)
          ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
          : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
      }

      if (winner < 8) {
        return { ok: false, error: "O vencedor precisa atingir 8 games." };
      }
      if (margin < 2) {
        return { ok: false, error: "É necessário vencer por diferença de 2 games." };
      }

      return gamesA > gamesB
        ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
        : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
    }

    case "TEMPO":
    case "LIVRE": {
      if (gamesA === gamesB) {
        return { ok: true, outcome: "DRAW", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
      }
      return gamesA > gamesB
        ? { ok: true, outcome: "A", effectiveGamesA: gamesA, effectiveGamesB: gamesB }
        : { ok: true, outcome: "B", effectiveGamesA: gamesA, effectiveGamesB: gamesB };
    }

    default: {
      const exhaustive: never = format;
      return { ok: false, error: `Formato de jogo inválido: ${JSON.stringify(exhaustive)}` };
    }
  }
}

/** Resultados válidos para exibir como chips de toque (Soma fixa). */
export function validScoreChips(
  format: MatchFormat,
): { gamesA: number; gamesB: number }[] {
  if (format.kind !== "SOMA_FIXA") return [];

  const chips: { gamesA: number; gamesB: number }[] = [];
  for (let a = format.total; a >= 0; a -= 1) {
    chips.push({ gamesA: a, gamesB: format.total - a });
  }
  return chips;
}

export function formatScoreLabel(
  format: MatchFormat,
  input: ScoreInput,
): string {
  const base = `${input.gamesA}x${input.gamesB}`;
  if (
    format.kind === "SOMA_FIXA" &&
    !format.permitirEmpate &&
    input.gamesA === input.gamesB &&
    input.decisivoPara
  ) {
    return `${base} (decisivo: ${input.decisivoPara})`;
  }
  return base;
}
