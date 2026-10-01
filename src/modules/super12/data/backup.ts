import { z } from "zod";

import { validateScore } from "@/modules/super12/domain";

import { type SuperTournamentDatabase, getDb } from "./db";
import { matchFormatSchema } from "./schema";
import type { RepositoryResult } from "./tournament-repository";
import {
  ACTIVE_TOURNAMENT_KEY,
  type StoredMatch,
  type StoredPlayer,
  type StoredTournament,
} from "./types";

/**
 * Backup em JSON: os torneios vivem só no IndexedDB do aparelho, então o
 * export/import é a forma de levar o torneio para outro dispositivo ou
 * recuperar após limpar os dados do navegador.
 */

export const BACKUP_KIND = "super12-tournament-backup";
export const BACKUP_VERSION = 1;

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

const tournamentSchema = z.object({
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

const matchSchema = z.object({
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

const backupSchema = z.object({
  kind: z.literal(BACKUP_KIND),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().min(1),
  tournaments: z.array(tournamentSchema),
  matches: z.array(matchSchema),
});

export interface TournamentBackupFile {
  kind: typeof BACKUP_KIND;
  version: number;
  exportedAt: string;
  tournaments: StoredTournament[];
  matches: StoredMatch[];
}

export interface ImportSummary {
  tournaments: number;
  matches: number;
  skippedMatches: number;
  warnings: string[];
}

export async function exportTournamentBackup(
  db: SuperTournamentDatabase = getDb(),
): Promise<TournamentBackupFile> {
  const [tournaments, matches] = await Promise.all([
    db.tournaments.toArray(),
    db.matches.toArray(),
  ]);

  return {
    kind: BACKUP_KIND,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    tournaments,
    matches,
  };
}

/**
 * Importa um backup como torneios novos: os IDs são remapeados para nunca
 * sobrescrever (ou misturar) torneios já existentes neste navegador. Placar
 * que não passa em `validateScore` é descartado em vez de quebrar a tela.
 */
export async function importTournamentBackup(
  input: unknown,
  db: SuperTournamentDatabase = getDb(),
): Promise<RepositoryResult<ImportSummary>> {
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Arquivo de backup inválido (formato ou versão não suportado).",
    };
  }

  const { tournaments, matches } = parsed.data;
  if (tournaments.length === 0) {
    return { ok: false, error: "O arquivo de backup não contém torneios." };
  }

  const timestamp = new Date().toISOString();
  const warnings: string[] = [];
  const nextTournaments: StoredTournament[] = [];
  const nextMatches: StoredMatch[] = [];
  let skippedMatches = 0;

  for (const tournament of tournaments) {
    const tournamentId = crypto.randomUUID();
    const prefix = tournamentId.slice(0, 8);
    const idMap = new Map<string, string>();
    const players: StoredPlayer[] = tournament.players.map((player, index) => {
      const id = `p${prefix}-${index + 1}`;
      idMap.set(player.id, id);
      return {
        id,
        name: player.name,
        nickname: player.nickname,
        seed: player.seed ?? index + 1,
        status: player.status ?? "ATIVO",
      };
    });

    const byesByRound: Record<string, string[]> = {};
    for (const [round, ids] of Object.entries(tournament.byesByRound)) {
      const mapped = ids
        .map((id) => idMap.get(id))
        .filter((id): id is string => Boolean(id));
      if (mapped.length > 0) byesByRound[round] = mapped;
    }

    nextTournaments.push({
      id: tournamentId,
      name: tournament.name,
      status: tournament.status,
      createdAt: tournament.createdAt,
      updatedAt: timestamp,
      config: tournament.config,
      players,
      metrics: tournament.metrics,
      byesByRound,
    });

    const own = matches.filter((match) => match.tournamentId === tournament.id);
    const usedIds = new Set<string>();
    for (const match of own) {
      const teamA = match.teamA.map((id) => idMap.get(id) ?? "");
      const teamB = match.teamB.map((id) => idMap.get(id) ?? "");
      if (teamA.includes("") || teamB.includes("")) {
        skippedMatches += 1;
        continue;
      }

      const hasScore = match.gamesA !== undefined && match.gamesB !== undefined;
      if (match.status === "FINALIZADO" && hasScore) {
        const validation = validateScore(tournament.config.matchFormat, {
          gamesA: match.gamesA ?? 0,
          gamesB: match.gamesB ?? 0,
          decisivoPara: match.decisivoPara,
          tiebreakA: match.tiebreakA,
          tiebreakB: match.tiebreakB,
        });
        if (!validation.ok) {
          skippedMatches += 1;
          warnings.push(
            `Placar ignorado em "${tournament.name}" (rodada ${match.round}, jogo ${match.turn}): ${validation.error}`,
          );
          continue;
        }
      } else if (match.status === "FINALIZADO") {
        skippedMatches += 1;
        continue;
      }

      // Mesmo formato do domínio: o índice do jogo na rodada é
      // reconstruído a partir do turno e da quadra.
      const gameIndex = (match.turn - 1) * tournament.config.courts + (match.court - 1);
      const matchId = `${tournamentId}:${tournament.config.seed}-R${match.round}-G${gameIndex}`;
      if (usedIds.has(matchId)) {
        skippedMatches += 1;
        continue;
      }
      usedIds.add(matchId);

      nextMatches.push({
        id: matchId,
        tournamentId,
        round: match.round,
        turn: match.turn,
        court: match.court,
        teamA: teamA as [string, string],
        teamB: teamB as [string, string],
        status: match.status === "FINALIZADO" ? "FINALIZADO" : match.status,
        phase: match.phase,
        gamesA: match.gamesA,
        gamesB: match.gamesB,
        decisivoPara: match.decisivoPara,
        tiebreakA: match.tiebreakA,
        tiebreakB: match.tiebreakB,
        updatedAt: match.updatedAt ?? timestamp,
        updatedBy: match.updatedBy,
        notes: match.notes,
      });
    }
  }

  await db.transaction("rw", db.tournaments, db.matches, db.meta, async () => {
    await db.tournaments.bulkPut(nextTournaments);
    if (nextMatches.length > 0) await db.matches.bulkPut(nextMatches);
    const active = await db.meta.get(ACTIVE_TOURNAMENT_KEY);
    if (!active) await db.meta.put({ key: ACTIVE_TOURNAMENT_KEY, value: nextTournaments[0].id });
  });

  return {
    ok: true,
    data: {
      tournaments: nextTournaments.length,
      matches: nextMatches.length,
      skippedMatches,
      warnings,
    },
  };
}
