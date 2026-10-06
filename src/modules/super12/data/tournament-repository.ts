import {
  createDefaultConfig,
  generateSchedule,
  validateScore,
  type MatchStatus,
  type ScoreInput,
} from "@/modules/super12/domain";

import { type SuperTournamentDatabase, getDb } from "./db";
import { notifyLocalChange } from "./change-events";
import { parseTournamentDraft, type TournamentDraft } from "./schema";
import {
  ACTIVE_TOURNAMENT_KEY,
  type StoredMatch,
  type StoredPlayer,
  type StoredTournament,
} from "./types";

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function now() {
  return new Date().toISOString();
}

export async function createTournament(
  draft: TournamentDraft,
  db: SuperTournamentDatabase = getDb(),
): Promise<RepositoryResult<StoredTournament>> {
  const parsed = parseTournamentDraft(draft);
  if (!parsed.ok) {
    return {
      ok: false,
      error: "Confira os dados do torneio.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const { data } = parsed;
  const tournamentId = crypto.randomUUID();
  const players: StoredPlayer[] = data.players.map((player, index) => ({
    id: `p${tournamentId.slice(0, 8)}-${index + 1}`,
    name: player.name,
    seed: index + 1,
    status: "ATIVO",
  }));

  const config = createDefaultConfig({
    format: data.format,
    scheduleMode: data.scheduleMode,
    rounds: data.rounds,
    courts: data.courts,
    courtNames: data.courtsNames,
    matchFormat: data.matchFormat,
    rankingMode: data.rankingMode,
    seed: data.seed,
  });

  let schedule;
  try {
    schedule = generateSchedule(config, players, data.seed);
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "Não foi possível gerar a tabela.",
    };
  }

  const timestamp = now();
  const byesByRound: Record<string, string[]> = {};
  for (const round of schedule.rounds) {
    if (round.byes.length > 0) byesByRound[String(round.round)] = round.byes;
  }

  const tournament: StoredTournament = {
    id: tournamentId,
    name: data.name,
    status: "EM_ANDAMENTO",
    createdAt: timestamp,
    updatedAt: timestamp,
    config,
    players,
    metrics: schedule.metrics,
    byesByRound,
  };

  const matches: StoredMatch[] = schedule.matches.map((match) => ({
    ...match,
    id: `${tournamentId}:${match.id}`,
    tournamentId,
    status: "AGENDADO",
  }));

  await db.transaction(
    "rw",
    db.tournaments,
    db.matches,
    db.meta,
    async () => {
      await db.tournaments.put(tournament);
      await db.matches.bulkPut(matches);
      await db.meta.put({ key: ACTIVE_TOURNAMENT_KEY, value: tournamentId });
    },
  );

  notifyLocalChange();

  return { ok: true, data: tournament };
}

export async function listTournaments(
  db: SuperTournamentDatabase = getDb(),
): Promise<StoredTournament[]> {
  return db.tournaments.orderBy("createdAt").reverse().toArray();
}

export async function getTournament(
  id: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<StoredTournament | undefined> {
  return db.tournaments.get(id);
}

export async function listMatches(
  tournamentId: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<StoredMatch[]> {
  const matches = await db.matches
    .where("[tournamentId+round]")
    .between([tournamentId, -Infinity], [tournamentId, Infinity])
    .toArray();
  return matches.sort((a, b) => a.round - b.round || a.turn - b.turn);
}

export async function deleteTournament(
  id: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<void> {
  await db.transaction(
    "rw",
    db.tournaments,
    db.matches,
    db.meta,
    db.deletedTournaments,
    async () => {
      await db.matches.where("tournamentId").equals(id).delete();
      await db.tournaments.delete(id);
      await db.deletedTournaments.put({ id, deletedAt: now() });
      const active = await db.meta.get(ACTIVE_TOURNAMENT_KEY);
      if (active?.value === id) await db.meta.delete(ACTIVE_TOURNAMENT_KEY);
    },
  );

  notifyLocalChange();
}

export async function getActiveTournamentId(
  db: SuperTournamentDatabase = getDb(),
): Promise<string | undefined> {
  const record = await db.meta.get(ACTIVE_TOURNAMENT_KEY);
  return typeof record?.value === "string" ? record.value : undefined;
}

export async function setActiveTournament(
  id: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<void> {
  await db.meta.put({ key: ACTIVE_TOURNAMENT_KEY, value: id });
}

export async function recordScore(
  matchId: string,
  input: ScoreInput,
  updatedBy?: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<RepositoryResult<StoredMatch>> {
  const match = await db.matches.get(matchId);
  if (!match) return { ok: false, error: "Partida não encontrada." };

  const tournament = await db.tournaments.get(match.tournamentId);
  if (!tournament) return { ok: false, error: "Torneio não encontrado." };

  const validation = validateScore(tournament.config.matchFormat, input);
  if (!validation.ok) return { ok: false, error: validation.error };

  const updated: StoredMatch = {
    ...match,
    gamesA: input.gamesA,
    gamesB: input.gamesB,
    decisivoPara: input.decisivoPara,
    tiebreakA: input.tiebreakA,
    tiebreakB: input.tiebreakB,
    status: "FINALIZADO",
    updatedAt: now(),
    updatedBy,
  };

  await db.transaction("rw", db.matches, db.tournaments, async () => {
    await db.matches.put(updated);
    await db.tournaments.update(match.tournamentId, { updatedAt: updated.updatedAt });
  });

  notifyLocalChange();

  return { ok: true, data: updated };
}

export async function clearScore(
  matchId: string,
  db: SuperTournamentDatabase = getDb(),
): Promise<void> {
  await db.matches.update(matchId, {
    gamesA: undefined,
    gamesB: undefined,
    decisivoPara: undefined,
    tiebreakA: undefined,
    tiebreakB: undefined,
    status: "AGENDADO",
    updatedAt: now(),
  });

  notifyLocalChange();
}

export async function setMatchStatus(
  matchId: string,
  status: MatchStatus,
  db: SuperTournamentDatabase = getDb(),
): Promise<RepositoryResult<StoredMatch>> {
  const match = await db.matches.get(matchId);
  if (!match) return { ok: false, error: "Partida não encontrada." };

  const updated: StoredMatch = { ...match, status, updatedAt: now() };
  await db.matches.put(updated);
  notifyLocalChange();
  return { ok: true, data: updated };
}
