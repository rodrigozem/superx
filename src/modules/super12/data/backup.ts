import { z } from "zod";

import { validateScore } from "@/modules/super12/domain";

import { type SuperTournamentDatabase, getDb } from "./db";
import { notifyLocalChange } from "./change-events";
import { matchSchema, tournamentSchema } from "./sync-contract";
import type { RepositoryResult } from "./tournament-repository";
import {
  ACTIVE_TOURNAMENT_KEY,
  type StoredMatch,
  type StoredPlayer,
  type StoredTournament,
} from "./types";

/**
 * Backup em JSON: cópia offline dos torneios do IndexedDB para levar a um
 * outro aparelho ou recuperar após limpar os dados do navegador. Depois do
 * import, o motor de sync leva os torneios novos para a nuvem.
 */

export const BACKUP_KIND = "super12-tournament-backup";
export const BACKUP_VERSION = 1;

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

  notifyLocalChange();

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
