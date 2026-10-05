import { z } from "zod";

import { matchFormatSchema } from "./schema";
import type { StoredMatch, StoredTournament } from "./types";

/**
 * Contrato de sincronização com a nuvem: os mesmos registros do IndexedDB,
 * validados no servidor antes de irem para o SQLite. Usado tanto pelo
 * Server Action quanto pelo motor de sync do navegador.
 */

const configSchema = z.object({
  format: z.enum(["SUPER8", "SUPER10", "SUPER12"]),
  scheduleMode: z.enum([
    "COMPLETO",
    "REDUZIDO",
    "EQUILIBRADO",
    "PARCEIRO_DE_TODOS",
  ]),
  rounds: z.number().int().positive().optional(),
  courts: z.number().int().min(1).max(6),
  courtNames: z.array(z.string().max(20)).max(6).optional(),
  matchFormat: matchFormatSchema,
  rankingMode: z.enum(["VITORIAS", "PONTOS", "SALDO_GAMES", "GAMES_PRO"]),
  points: z.object({
    win: z.number(),
    draw: z.number(),
    loss: z.number(),
  }),
  tiebreakOrder: z.array(
    z.enum([
      "SALDO_GAMES",
      "GAMES_PRO",
      "CONFRONTO_DIRETO",
      "APROVEITAMENTO_GAMES",
      "MINI_CLASSIFICACAO",
      "SORTEIO",
    ]),
  ),
  finalsMode: z.enum(["NENHUMA", "FINAL_TOP4", "SEMI_TOP8"]),
  finalsMatchFormat: matchFormatSchema.optional(),
  seed: z.number().int().min(1).max(2_147_483_647),
  isTest: z.boolean(),
});

const metricsSchema = z.object({
  partnerRepeatPairs: z.number().int().min(0),
  maxOpponentMeetings: z.number().int().min(0),
  opponentMeetingHistogram: z.record(z.string(), z.number().int().min(0)),
  gamesPerPlayerMin: z.number().int().min(0),
  gamesPerPlayerMax: z.number().int().min(0),
  byesPerPlayerMin: z.number().int().min(0),
  byesPerPlayerMax: z.number().int().min(0),
  relaxed: z.boolean(),
  relaxations: z.array(z.string()),
});

const playerSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(40),
  nickname: z.string().optional(),
  seed: z.number().int().optional(),
  status: z.enum(["ATIVO", "DESISTENTE"]).optional(),
});

export const tournamentSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  status: z.enum(["EM_ANDAMENTO", "ENCERRADO"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  config: configSchema,
  players: z.array(playerSchema).min(4).max(12),
  metrics: metricsSchema,
  byesByRound: z.record(z.string(), z.array(z.string())),
});

export const matchSchema = z.object({
  id: z.string().min(1),
  tournamentId: z.string().min(1),
  round: z.number().int().min(1),
  turn: z.number().int().min(1),
  court: z.number().int().min(1).max(6),
  teamA: z.tuple([z.string(), z.string()]),
  teamB: z.tuple([z.string(), z.string()]),
  status: z.enum(["AGENDADO", "EM_ANDAMENTO", "FINALIZADO", "WO", "CANCELADO"]),
  phase: z.enum(["GRUPO", "SEMI", "FINAL", "DESEMPATE"]),
  gamesA: z.number().int().min(0).optional(),
  gamesB: z.number().int().min(0).optional(),
  decisivoPara: z.enum(["A", "B"]).optional(),
  tiebreakA: z.number().int().min(0).optional(),
  tiebreakB: z.number().int().min(0).optional(),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
  notes: z.string().optional(),
});

const syncPayloadSchema = z.object({
  tournaments: z.array(tournamentSchema),
  matches: z.array(matchSchema),
  deletedTournamentIds: z.array(z.string().min(1)),
});

const syncSnapshotSchema = z.object({
  tournaments: z.array(tournamentSchema),
  matches: z.array(matchSchema),
});

export interface SyncPayload {
  tournaments: StoredTournament[];
  matches: StoredMatch[];
  deletedTournamentIds: string[];
}

export interface SyncSnapshot {
  tournaments: StoredTournament[];
  matches: StoredMatch[];
}

export type SyncActionResponse =
  | { ok: true; snapshot: SyncSnapshot }
  | { ok: false; error: string };

export function parseSyncPayload(input: unknown): SyncPayload | null {
  const parsed = syncPayloadSchema.safeParse(input);
  return parsed.success ? (parsed.data as SyncPayload) : null;
}

export function parseSyncSnapshot(input: unknown): SyncSnapshot | null {
  const parsed = syncSnapshotSchema.safeParse(input);
  return parsed.success ? (parsed.data as SyncSnapshot) : null;
}
