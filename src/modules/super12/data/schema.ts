import { z } from "zod";

import { FORMAT_PLAYERS } from "@/modules/super12/domain";

export const matchFormatSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("SOMA_FIXA"),
    total: z.number().int().min(1).max(30),
    permitirEmpate: z.boolean(),
    decisivoContaGame: z.boolean(),
  }),
  z.object({
    kind: z.literal("SET_ATE_N"),
    games: z.number().int().min(1).max(15),
    tiebreak: z.boolean(),
    difMinima2: z.boolean(),
  }),
  z.object({ kind: z.literal("PRO_SET"), games: z.literal(8) }),
  z.object({
    kind: z.literal("TEMPO"),
    minutos: z.number().int().min(1).max(180),
  }),
  z.object({ kind: z.literal("LIVRE") }),
]);

export const createTournamentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Informe o nome do torneio.")
      .max(80, "Use no máximo 80 caracteres."),
    format: z.enum(["SUPER8", "SUPER10", "SUPER12"]),
    scheduleMode: z.enum([
      "COMPLETO",
      "REDUZIDO",
      "EQUILIBRADO",
      "PARCEIRO_DE_TODOS",
    ]),
    courts: z.number().int().min(1, "Use de 1 a 6 quadras.").max(6),
    courtsNames: z.array(z.string().trim().max(20)).max(6).optional(),
    /** Quantas rodadas gerar no modo REDUZIDO (ignorado nos demais modos). */
    rounds: z
      .number()
      .int("Informe um número inteiro de rodadas.")
      .min(1, "Use no mínimo 1 rodada.")
      .max(20, "Use no máximo 20 rodadas.")
      .optional(),
    matchFormat: matchFormatSchema,
    rankingMode: z.enum(["VITORIAS", "PONTOS", "SALDO_GAMES", "GAMES_PRO"]),
    seed: z
      .number()
      .int()
      .min(1, "A seed deve ser positiva.")
      .max(2_147_483_647),
    players: z
      .array(
        z.object({
          name: z
            .string()
            .trim()
            .min(1, "Informe o nome do atleta.")
            .max(40, "Use no máximo 40 caracteres."),
        }),
      )
      .min(4, "Informe pelo menos 4 atletas.")
      .max(12, "O formato máximo é 12 atletas."),
  })
  .superRefine((draft, ctx) => {
    const expected = FORMAT_PLAYERS[draft.format];

    if (draft.players.length !== expected) {
      ctx.addIssue({
        code: "custom",
        path: ["players"],
        message: `O formato ${draft.format} exige exatamente ${expected} atletas (informado: ${draft.players.length}).`,
      });
    }

    const seen = new Set<string>();
    draft.players.forEach((player, index) => {
      const key = player.name.trim().toLocaleLowerCase("pt-BR");
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["players", index, "name"],
          message: "Já existe um atleta com esse nome.",
        });
      }
      seen.add(key);
    });

    const super10 = draft.format === "SUPER10";
    const super10Modes = ["EQUILIBRADO", "PARCEIRO_DE_TODOS"];

    if (super10 && !super10Modes.includes(draft.scheduleMode)) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleMode"],
        message: "No Super 10 use Equilibrado ou Parceiro de todos.",
      });
    }

    if (!super10 && super10Modes.includes(draft.scheduleMode)) {
      ctx.addIssue({
        code: "custom",
        path: ["scheduleMode"],
        message: "Super 8 e Super 12 usam Completo ou Reduzido.",
      });
    }

    if (draft.scheduleMode === "REDUZIDO" && draft.format !== "SUPER10") {
      const maxRounds = draft.format === "SUPER8" ? 7 : 11;
      if (draft.rounds === undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds"],
          message: "Informe quantas rodadas a tabela reduzida terá.",
        });
      } else if (draft.rounds > maxRounds) {
        ctx.addIssue({
          code: "custom",
          path: ["rounds"],
          message: `A tabela completa tem ${maxRounds} rodadas; use no máximo ${maxRounds}.`,
        });
      }
    }
  });

export type TournamentDraft = z.input<typeof createTournamentSchema>;
export type ParsedTournamentDraft = z.output<typeof createTournamentSchema>;

export type DraftParseResult =
  | { ok: true; data: ParsedTournamentDraft }
  | { ok: false; fieldErrors: Record<string, string> };

export function parseTournamentDraft(input: unknown): DraftParseResult {
  const parsed = createTournamentSchema.safeParse(input);

  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path.map(String).join(".") || "form";
    fieldErrors[key] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
