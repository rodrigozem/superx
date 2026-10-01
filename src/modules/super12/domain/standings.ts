import { hashString } from "./random";
import { validateScore } from "./scoring";
import type {
  Match,
  Phase,
  Player,
  RankingMode,
  TiebreakCriterion,
  TournamentConfig,
} from "./types";

export interface PlayerStats {
  playerId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDiff: number;
  gamesWinPct: number;
  winPct: number;
  byes: number;
}

export interface TiebreakExplanation {
  criterion: TiebreakCriterion;
  detail: string;
}

export interface StandingEntry {
  playerId: string;
  name: string;
  position: number;
  stats: PlayerStats;
  tiebreak?: TiebreakExplanation;
}

export interface StandingsOptions {
  phase?: Phase;
  byes?: Map<string, number>;
  excludeWithdrawn?: boolean;
}

interface Scoreless {
  gamesA: number;
  gamesB: number;
  outcome: "A" | "B" | "DRAW";
}

function emptyStats(playerId: string): PlayerStats {
  return {
    playerId,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    points: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    gameDiff: 0,
    gamesWinPct: 0,
    winPct: 0,
    byes: 0,
  };
}

function outcomeOf(match: Match, config: TournamentConfig): Scoreless | null {
  if (match.gamesA === undefined || match.gamesB === undefined) return null;

  const validation = validateScore(config.matchFormat, {
    gamesA: match.gamesA,
    gamesB: match.gamesB,
    decisivoPara: match.decisivoPara,
    tiebreakA: match.tiebreakA,
    tiebreakB: match.tiebreakB,
  });

  if (validation.ok) {
    return {
      gamesA: validation.effectiveGamesA,
      gamesB: validation.effectiveGamesB,
      outcome: validation.outcome,
    };
  }

  const outcome: "A" | "B" | "DRAW" =
    match.gamesA === match.gamesB
      ? "DRAW"
      : match.gamesA > match.gamesB
        ? "A"
        : "B";
  return { gamesA: match.gamesA, gamesB: match.gamesB, outcome };
}

function isCountable(match: Match) {
  return (
    (match.status === "FINALIZADO" || match.status === "WO") &&
    match.gamesA !== undefined &&
    match.gamesB !== undefined
  );
}

function finalize(stats: PlayerStats) {
  const totalGames = stats.gamesFor + stats.gamesAgainst;
  stats.gameDiff = stats.gamesFor - stats.gamesAgainst;
  stats.gamesWinPct = totalGames > 0 ? stats.gamesFor / totalGames : 0;
  stats.winPct = stats.played > 0 ? stats.wins / stats.played : 0;
  return stats;
}

export function computePlayerStats(
  players: Player[],
  matches: Match[],
  config: TournamentConfig,
  options: StandingsOptions = {},
): Map<string, PlayerStats> {
  const phase = options.phase ?? "GRUPO";
  const stats = new Map<string, PlayerStats>();
  for (const player of players) {
    stats.set(player.id, emptyStats(player.id));
  }

  for (const match of matches) {
    if (match.phase !== phase || !isCountable(match)) continue;

    const score = outcomeOf(match, config);
    if (!score) continue;

    const update = (
      id: string,
      own: number,
      against: number,
      result: "WIN" | "LOSS" | "DRAW",
    ) => {
      const entry = stats.get(id);
      if (!entry) return;
      entry.played += 1;
      entry.gamesFor += own;
      entry.gamesAgainst += against;
      if (result === "WIN") {
        entry.wins += 1;
        entry.points += config.points.win;
      } else if (result === "LOSS") {
        entry.losses += 1;
        entry.points += config.points.loss;
      } else {
        entry.draws += 1;
        entry.points += config.points.draw;
      }
    };

    const resultA: "WIN" | "LOSS" | "DRAW" =
      score.outcome === "A" ? "WIN" : score.outcome === "B" ? "LOSS" : "DRAW";
    const resultB: "WIN" | "LOSS" | "DRAW" =
      score.outcome === "B" ? "WIN" : score.outcome === "A" ? "LOSS" : "DRAW";

    for (const id of match.teamA) {
      update(id, score.gamesA, score.gamesB, resultA);
    }
    for (const id of match.teamB) {
      update(id, score.gamesB, score.gamesA, resultB);
    }
  }

  if (options.byes) {
    for (const [id, count] of options.byes) {
      const entry = stats.get(id);
      if (entry) entry.byes = count;
    }
  }

  for (const entry of stats.values()) finalize(entry);
  return stats;
}

function primaryValue(mode: RankingMode, stats: PlayerStats): number {
  switch (mode) {
    case "VITORIAS":
      return stats.wins;
    case "PONTOS":
      return stats.points;
    case "SALDO_GAMES":
      return stats.gameDiff;
    case "GAMES_PRO":
      return stats.gamesFor;
  }
}

function criterionValue(
  criterion: TiebreakCriterion,
  stats: PlayerStats,
): number | null {
  switch (criterion) {
    case "SALDO_GAMES":
      return stats.gameDiff;
    case "GAMES_PRO":
      return stats.gamesFor;
    case "APROVEITAMENTO_GAMES":
      return stats.gamesWinPct;
    default:
      return null;
  }
}

interface HeadToHead {
  winsA: number;
  winsB: number;
  gamesA: number;
  gamesB: number;
  matches: number;
}

function headToHead(
  idA: string,
  idB: string,
  matches: Match[],
  config: TournamentConfig,
  phase: Phase,
): HeadToHead {
  const result: HeadToHead = { winsA: 0, winsB: 0, gamesA: 0, gamesB: 0, matches: 0 };

  for (const match of matches) {
    if (match.phase !== phase || !isCountable(match)) continue;
    const aIsTeamA = match.teamA.includes(idA) && match.teamB.includes(idB);
    const aIsTeamB = match.teamB.includes(idA) && match.teamA.includes(idB);
    if (!aIsTeamA && !aIsTeamB) continue;

    const score = outcomeOf(match, config);
    if (!score) continue;

    const aGames = aIsTeamA ? score.gamesA : score.gamesB;
    const bGames = aIsTeamA ? score.gamesB : score.gamesA;
    result.matches += 1;
    result.gamesA += aGames;
    result.gamesB += bGames;
    if (aGames > bGames) result.winsA += 1;
    else if (bGames > aGames) result.winsB += 1;
  }

  return result;
}

function miniStats(
  group: string[],
  matches: Match[],
  config: TournamentConfig,
  phase: Phase,
): Map<string, { wins: number; gameDiff: number; gamesFor: number; played: number }> {
  const members = new Set(group);
  const table = new Map<
    string,
    { wins: number; gameDiff: number; gamesFor: number; played: number }
  >();
  for (const id of group) {
    table.set(id, { wins: 0, gameDiff: 0, gamesFor: 0, played: 0 });
  }

  for (const match of matches) {
    if (match.phase !== phase || !isCountable(match)) continue;
    if (!match.teamA.every((id) => members.has(id))) continue;
    if (!match.teamB.every((id) => members.has(id))) continue;

    const score = outcomeOf(match, config);
    if (!score) continue;

    for (const id of match.teamA) {
      const entry = table.get(id)!;
      entry.played += 1;
      entry.gamesFor += score.gamesA;
      entry.gameDiff += score.gamesA - score.gamesB;
      if (score.outcome === "A") entry.wins += 1;
    }
    for (const id of match.teamB) {
      const entry = table.get(id)!;
      entry.played += 1;
      entry.gamesFor += score.gamesB;
      entry.gameDiff += score.gamesB - score.gamesA;
      if (score.outcome === "B") entry.wins += 1;
    }
  }

  return table;
}

function sortKey(config: TournamentConfig, playerId: string): number {
  return hashString(`${config.seed}:${playerId}`);
}

export function computeStandings(
  players: Player[],
  matches: Match[],
  config: TournamentConfig,
  options: StandingsOptions = {},
): StandingEntry[] {
  const phase = options.phase ?? "GRUPO";
  const stats = computePlayerStats(players, matches, config, options);
  const byId = new Map(players.map((player) => [player.id, player]));

  const eligible = players.filter((player) => {
    if (!options.excludeWithdrawn) return true;
    return player.status !== "DESISTENTE";
  });

  // 1) Agrupa pelo critério principal.
  const sortedByPrimary = [...eligible].sort(
    (a, b) =>
      primaryValue(config.rankingMode, stats.get(b.id)!) -
      primaryValue(config.rankingMode, stats.get(a.id)!),
  );

  interface Group {
    ids: string[];
    decidedBy: TiebreakCriterion | null;
  }

  let groups: Group[] = [];
  for (const player of sortedByPrimary) {
    const value = primaryValue(config.rankingMode, stats.get(player.id)!);
    const current = groups[groups.length - 1];
    if (current) {
      const reference = primaryValue(
        config.rankingMode,
        stats.get(current.ids[0])!,
      );
      if (reference === value) {
        current.ids.push(player.id);
        continue;
      }
    }
    groups.push({ ids: [player.id], decidedBy: null });
  }

  // 2) Aplica os critérios de desempate, na ordem configurada, registrando
  //    qual critério separou cada atleta (para explicar na tela).
  const splitByValue = (ids: string[], valueOf: (id: string) => number | null) =>
    sortAndGroup(ids, (a, b) => {
      const va = valueOf(a);
      const vb = valueOf(b);
      if (va === null || vb === null) return 0;
      return vb - va;
    });

  for (const criterion of config.tiebreakOrder) {
    groups = groups.flatMap((group) => {
      if (group.ids.length <= 1) return [group];

      let subgroups: string[][] | null = null;

      if (criterion === "CONFRONTO_DIRETO") {
        if (group.ids.length === 2) {
          const [a, b] = group.ids;
          const h2h = headToHead(a, b, matches, config, phase);
          if (h2h.matches > 0) {
            if (h2h.winsA !== h2h.winsB) {
              subgroups = h2h.winsA > h2h.winsB ? [[a], [b]] : [[b], [a]];
            } else if (h2h.gamesA !== h2h.gamesB) {
              subgroups = h2h.gamesA > h2h.gamesB ? [[a], [b]] : [[b], [a]];
            }
          }
        }
      } else if (criterion === "MINI_CLASSIFICACAO") {
        const mini = miniStats(group.ids, matches, config, phase);
        if (group.ids.every((id) => (mini.get(id)?.played ?? 0) > 0)) {
          subgroups = sortAndGroup(group.ids, (a, b) => {
            const sa = mini.get(a)!;
            const sb = mini.get(b)!;
            if (sb.wins !== sa.wins) return sb.wins - sa.wins;
            if (sb.gameDiff !== sa.gameDiff) return sb.gameDiff - sa.gameDiff;
            return sb.gamesFor - sa.gamesFor;
          });
        }
      } else if (criterion === "SORTEIO") {
        subgroups = sortAndGroup(
          group.ids,
          (a, b) => sortKey(config, a) - sortKey(config, b),
        );
      } else {
        subgroups = splitByValue(group.ids, (id) =>
          criterionValue(criterion, stats.get(id)!),
        );
      }

      if (!subgroups || subgroups.length <= 1) return [group];

      return subgroups.map((ids, index) => ({
        ids,
        decidedBy: index === 0 ? group.decidedBy : criterion,
      }));
    });

    if (groups.every((group) => group.ids.length === 1)) break;
  }

  // 3) Monta a classificação final e as explicações de desempate.
  const flat: {
    id: string;
    groupId: number;
    decidedBy: TiebreakCriterion | null;
  }[] = [];
  groups.forEach((group, groupId) => {
    for (const id of group.ids) {
      flat.push({ id, groupId, decidedBy: group.decidedBy });
    }
  });

  return flat.map((item, index) => {
    const entry: StandingEntry = {
      playerId: item.id,
      name: byId.get(item.id)?.name ?? item.id,
      position: index + 1,
      stats: stats.get(item.id)!,
    };

    if (index > 0) {
      const above = flat[index - 1];
      if (
        above.groupId !== item.groupId &&
        item.decidedBy &&
        primaryValue(config.rankingMode, stats.get(above.id)!) ===
          primaryValue(config.rankingMode, stats.get(item.id)!)
      ) {
        entry.tiebreak = {
          criterion: item.decidedBy,
          detail: criterionDetail(
            item.decidedBy,
            above.id,
            item.id,
            stats,
            matches,
            config,
            phase,
          ),
        };
      }
    }

    return entry;
  });
}

function sortAndGroup(
  group: string[],
  compare: (a: string, b: string) => number,
): string[][] {
  const sorted = [...group].sort((a, b) => {
    const value = compare(a, b);
    return value !== 0 ? value : a.localeCompare(b);
  });

  const result: string[][] = [];
  for (const id of sorted) {
    const current = result[result.length - 1];
    if (current && compare(current[0], id) === 0) {
      current.push(id);
    } else {
      result.push([id]);
    }
  }
  return result;
}

function criterionDetail(
  criterion: TiebreakCriterion,
  aboveId: string,
  belowId: string,
  stats: Map<string, PlayerStats>,
  matches: Match[],
  config: TournamentConfig,
  phase: Phase,
): string {
  const above = stats.get(aboveId)!;
  const below = stats.get(belowId)!;

  if (criterion === "CONFRONTO_DIRETO") {
    const h2h = headToHead(aboveId, belowId, matches, config, phase);
    if (h2h.winsA !== h2h.winsB) {
      return `Confronto direto: ${h2h.winsA} vitória(s) x ${h2h.winsB}`;
    }
    return `Confronto direto: ${h2h.gamesA} x ${h2h.gamesB} em games`;
  }

  if (criterion === "MINI_CLASSIFICACAO") {
    const tieContext = [...stats.values()]
      .filter(
        (entry) =>
          primaryValue(config.rankingMode, entry) ===
          primaryValue(config.rankingMode, above),
      )
      .map((entry) => entry.playerId);
    const mini = miniStats(tieContext, matches, config, phase);
    const miniAbove = mini.get(aboveId);
    const miniBelow = mini.get(belowId);
    if (miniAbove && miniBelow) {
      if (miniAbove.wins !== miniBelow.wins) {
        return `Mini-classificação: ${miniAbove.wins} vitória(s) x ${miniBelow.wins}`;
      }
      return `Mini-classificação: saldo ${miniAbove.gameDiff} x ${miniBelow.gameDiff}`;
    }
    return "Mini-classificação entre os empatados";
  }

  if (criterion === "SORTEIO") {
    return `Sorteio determinístico (seed ${config.seed})`;
  }

  const va = criterionValue(criterion, above)!;
  const vb = criterionValue(criterion, below)!;
  const label =
    criterion === "SALDO_GAMES"
      ? "Saldo de games"
      : criterion === "GAMES_PRO"
        ? "Games pró"
        : "Aproveitamento de games";
  const format = criterion === "APROVEITAMENTO_GAMES" ? formatPct : String;
  return `${label} ${format(va)} x ${format(vb)}`;
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}
