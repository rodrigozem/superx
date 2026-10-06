import { circleMethodPairs, perfectMatchings, pairKey, type Pair } from "./combinatorics";
import { createRng, shuffle } from "./random";
import type {
  Format,
  Match,
  Player,
  RoundPlan,
  Schedule,
  ScheduleMetrics,
  TournamentConfig,
} from "./types";

export const FORMAT_PLAYERS: Record<Format, number> = {
  SUPER8: 8,
  SUPER10: 10,
  SUPER12: 12,
};

interface RoundPairs {
  pairs: Pair[];
  restingPlayers: number[];
}

interface AssignedRound {
  games: [Pair, Pair][];
}

interface AssignedSchedule {
  rounds: AssignedRound[];
  /** Nº de pares de atletas que nunca se enfrentaram como adversários. */
  uncovered: number;
  /** Σ (nº de confrontos)^2 — menor é melhor. */
  score: number;
}

interface OptionEval {
  /** Combinação de jogos da rodada (duplas pareadas dois a dois). */
  option: [Pair, Pair][];
  /** Quantos pares de adversários do jogo ainda nunca se enfrentaram. */
  fresh: number;
  /** Aumento de Σ count² causado pela escolha. */
  delta: number;
}

/** Ordem lexicográfica: primeiro cobrir todos os confrontos, depois equilibrar. */
function isBetterSchedule(a: AssignedSchedule, b: AssignedSchedule): boolean {
  if (a.uncovered !== b.uncovered) return a.uncovered < b.uncovered;
  return a.score < b.score;
}

function evalOption(
  option: [Pair, Pair][],
  opponentCounts: Map<string, number>,
): { fresh: number; delta: number } {
  let fresh = 0;
  let delta = 0;
  for (const [teamA, teamB] of option) {
    for (const a of teamA) {
      for (const b of teamB) {
        const count = opponentCounts.get(pairKey(a, b)) ?? 0;
        if (count === 0) fresh += 1;
        delta += (count + 1) * (count + 1) - count * count;
      }
    }
  }
  return { fresh, delta };
}

function allPlayerIndices(roundPairs: RoundPairs[]): number[] {
  const indices = new Set<number>();
  for (const round of roundPairs) {
    for (const [a, b] of round.pairs) {
      indices.add(a);
      indices.add(b);
    }
  }
  return [...indices];
}

function countUncovered(
  opponentCounts: Map<string, number>,
  roundPairs: RoundPairs[],
): number {
  const indices = allPlayerIndices(roundPairs);
  const totalPairs = (indices.length * (indices.length - 1)) / 2;
  return totalPairs - opponentCounts.size;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Distribui as duplas em jogos (2 duplas por jogo) cobrindo primeiro todos os
 * pares de adversários e depois minimizando a repetição de confrontos. Usa
 * busca gulosa com reinícios determinísticos. Quando `allowSearch` está
 * ligado e a cobertura não sai na gulosa, uma busca exaustiva com poda tenta
 * garantir que todo par se enfrente pelo menos uma vez.
 */
function assignGames(
  roundPairs: RoundPairs[],
  seed: number,
  allowSearch = true,
): AssignedSchedule {
  const restarts = 256;
  const optionsPerRound = roundPairs.map((round) =>
    perfectMatchings(round.pairs),
  );
  let best: AssignedSchedule | null = null;

  for (let restart = 0; restart < restarts; restart += 1) {
    const rng = createRng(seed * 2654435761 + restart * 40503 + 1);
    const opponentCounts = new Map<string, number>();
    const rounds: AssignedRound[] = [];
    let score = 0;

    roundPairs.forEach((_round, roundIndex) => {
      const options = optionsPerRound[roundIndex];
      let bestOption: [Pair, Pair][] = options[0];
      let bestFresh = -1;
      let bestDelta = Number.POSITIVE_INFINITY;
      let bestTie = -1;

      for (const option of options) {
        const { fresh, delta } = evalOption(option, opponentCounts);
        const tie = rng();
        const betterFresh = fresh > bestFresh;
        const sameFresh = fresh === bestFresh;
        const betterDelta = delta < bestDelta - 1e-9;
        const sameDelta = Math.abs(delta - bestDelta) < 1e-9;
        if (betterFresh || (sameFresh && (betterDelta || (sameDelta && tie > bestTie)))) {
          bestFresh = fresh;
          bestDelta = delta;
          bestOption = option;
          bestTie = tie;
        }
      }

      for (const [teamA, teamB] of bestOption) {
        for (const a of teamA) {
          for (const b of teamB) {
            const key = pairKey(a, b);
            opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
          }
        }
      }

      score += bestDelta;
      rounds.push({ games: bestOption });
    });

    const candidate: AssignedSchedule = {
      rounds,
      uncovered: countUncovered(opponentCounts, roundPairs),
      score,
    };
    if (!best || isBetterSchedule(candidate, best)) {
      best = candidate;
    }
  }

  if (allowSearch && best && best.uncovered > 0) {
    const searched = searchFullCoverage(roundPairs);
    if (searched && isBetterSchedule(searched, best)) {
      best = searched;
    }
  }

  return best as AssignedSchedule;
}

/**
 * Busca exaustiva com poda: encontra uma atribuição em que todo par de
 * atletas se enfrenta pelo menos uma vez, quando ela existe. Determinística —
 * as opções de cada rodada são ordenadas por pares ainda desconhecidos e
 * depois pelo impacto no equilíbrio.
 */
function searchFullCoverage(
  roundPairs: RoundPairs[],
  nodeBudget = 50_000,
): AssignedSchedule | null {
  const roundCount = roundPairs.length;
  if (roundCount === 0) return null;

  const indices = allPlayerIndices(roundPairs);
  const totalPairs = (indices.length * (indices.length - 1)) / 2;

  const roundsInfo = roundPairs.map((round) => {
    const active = new Set<number>();
    const partner = new Map<number, number>();
    for (const [a, b] of round.pairs) {
      active.add(a);
      active.add(b);
      partner.set(a, b);
      partner.set(b, a);
    }
    return {
      options: perfectMatchings(round.pairs),
      active,
      partner,
      slots: round.pairs.length * 2,
    };
  });

  // Última rodada em que cada par pode se encontrar como adversário.
  const lastMeetable = new Map<string, number>();
  for (let round = 0; round < roundCount; round += 1) {
    const info = roundsInfo[round];
    for (const a of info.active) {
      for (const b of info.active) {
        if (a >= b || info.partner.get(a) === b) continue;
        lastMeetable.set(pairKey(a, b), round);
      }
    }
  }

  const allKeys: string[] = [];
  for (let i = 0; i < indices.length; i += 1) {
    for (let j = i + 1; j < indices.length; j += 1) {
      const key = pairKey(indices[i], indices[j]);
      allKeys.push(key);
      if (!lastMeetable.has(key)) return null;
    }
  }

  const counts = new Map<string, number>();
  const chosen: [Pair, Pair][][] = [];
  let uncovered = totalPairs;
  let nodes = 0;

  const apply = (option: [Pair, Pair][], deltaSign: 1 | -1) => {
    for (const [teamA, teamB] of option) {
      for (const a of teamA) {
        for (const b of teamB) {
          const key = pairKey(a, b);
          const before = counts.get(key) ?? 0;
          const after = before + deltaSign;
          if (before === 0) uncovered -= 1;
          if (after === 0) uncovered += 1;
          if (after === 0) {
            counts.delete(key);
          } else {
            counts.set(key, after);
          }
        }
      }
    }
  };

  const dfs = (round: number): boolean => {
    if (round === roundCount) return uncovered === 0;
    if (nodes >= nodeBudget) return false;
    nodes += 1;

    let maxNew = 0;
    for (let r = round; r < roundCount; r += 1) maxNew += roundsInfo[r].slots;
    if (uncovered > maxNew) return false;

    for (const key of allKeys) {
      if ((counts.get(key) ?? 0) === 0 && (lastMeetable.get(key) ?? -1) < round) {
        return false;
      }
    }

    const info = roundsInfo[round];
    const evals: (OptionEval & { index: number })[] = info.options.map(
      (option, index) => ({ option, index, ...evalOption(option, counts) }),
    );
    evals.sort(
      (a, b) => b.fresh - a.fresh || a.delta - b.delta || a.index - b.index,
    );

    for (const { option } of evals) {
      apply(option, 1);
      chosen.push(option);
      if (dfs(round + 1)) return true;
      chosen.pop();
      apply(option, -1);
    }

    return false;
  };

  if (!dfs(0)) return null;

  let score = 0;
  for (const count of counts.values()) score += count * count;
  return {
    rounds: chosen.map((games) => ({ games })),
    uncovered: 0,
    score,
  };
}

/** Escolhe, no modo reduzido, as rodadas que melhor equilibram os confrontos. */
function pickBestRounds(
  all: RoundPairs[],
  count: number,
  seed: number,
): RoundPairs[] {
  if (count >= all.length) return all;

  let best: RoundPairs[] | null = null;
  let bestAssigned: AssignedSchedule | null = null;

  for (let offset = 0; offset < all.length; offset += 1) {
    const candidate: RoundPairs[] = [];
    for (let i = 0; i < count; i += 1) {
      candidate.push(all[(offset + i) % all.length]);
    }
    const assigned = assignGames(candidate, seed * 31 + offset, false);
    if (!bestAssigned || isBetterSchedule(assigned, bestAssigned)) {
      bestAssigned = assigned;
      best = candidate;
    }
  }

  return best as RoundPairs[];
}

/**
 * Super 10 — modo "Parceiro de todos": usa o método do círculo (cada par é
 * parceiro uma vez) e descansa 1 dupla por rodada. O backtracking exige que
 * todo atleta descanse 1 ou 2 rodadas — com 9 rodadas e 2 descansos por rodada
 * são 18 descansos, ou seja, 8 atletas com 2 e 2 atletas com 1 — o que garante
 * 7 ou 8 jogos por atleta.
 */
function super10PartnerOfAll(seed: number): RoundPairs[] {
  const rng = createRng(seed);
  const circles = circleMethodPairs(10);
  const chosen = new Array<number>(circles.length).fill(-1);
  const restCount = new Array<number>(10).fill(0);
  const order = shuffle(
    circles.map((_, index) => index),
    rng,
  );

  const roundsFromChosen = (): RoundPairs[] =>
    circles.map((pairs, round) => {
      const restIndex = chosen[round];
      return {
        pairs: pairs.filter((_, index) => index !== restIndex),
        restingPlayers: [...pairs[restIndex]],
      };
    });

  // Nem toda escolha de descanso permite que todos os pares se enfrentem.
  // Tenta cobertura completa em até esta quantidade de atribuições válidas.
  const maxCoverageChecks = 24;
  let checks = 0;
  let aborted = false;
  let firstValid: RoundPairs[] | null = null;
  let coverageFound: RoundPairs[] | null = null;

  const dfs = (position: number): boolean => {
    if (aborted) return false;
    if (position === order.length) {
      if (!restCount.every((count) => count >= 1 && count <= 2)) return false;
      const candidate = roundsFromChosen();
      if (!firstValid) firstValid = candidate;
      if (checks >= maxCoverageChecks) {
        aborted = true;
        return false;
      }
      checks += 1;
      if (searchFullCoverage(candidate)) {
        coverageFound = candidate;
        return true;
      }
      return false;
    }

    // Cada rodada descansa exatamente uma dupla (2 atletas). Se sobram mais
    // atletas sem nenhum descanso do que vagas nas rodadas restantes, é
    // impossível terminar equilibrado.
    const remainingRounds = order.length - position;
    const waiting = restCount.filter((count) => count === 0).length;
    if (waiting > 2 * remainingRounds) return false;

    const round = order[position];
    const pairs = circles[round];
    const options = shuffle(
      pairs.map((_, index) => index),
      rng,
    ).sort((a, b) => {
      const costA = restCount[pairs[a][0]] + restCount[pairs[a][1]];
      const costB = restCount[pairs[b][0]] + restCount[pairs[b][1]];
      return costA - costB;
    });

    for (const index of options) {
      const [a, b] = pairs[index];
      if (restCount[a] >= 2 || restCount[b] >= 2) continue;
      restCount[a] += 1;
      restCount[b] += 1;
      chosen[round] = index;
      if (dfs(position + 1)) return true;
      restCount[a] -= 1;
      restCount[b] -= 1;
      chosen[round] = -1;
    }

    return false;
  };

  dfs(0);

  if (coverageFound) return coverageFound;
  if (firstValid) return firstValid;

  restCount.fill(0);
  circles.forEach((pairs, round) => {
    let bestIndex = 0;
    let bestCost = Number.POSITIVE_INFINITY;
    pairs.forEach(([a, b], index) => {
      const cost =
        (restCount[a] === 0 ? 0 : 10) +
        (restCount[b] === 0 ? 0 : 10) +
        rng() * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        bestIndex = index;
      }
    });
    chosen[round] = bestIndex;
    const [a, b] = pairs[bestIndex];
    restCount[a] += 1;
    restCount[b] += 1;
  });

  return circles.map((pairs, round) => {
    const restIndex = chosen[round];
    return {
      pairs: pairs.filter((_, index) => index !== restIndex),
      restingPlayers: [...pairs[restIndex]],
    };
  });
}

/**
 * Super 10 — modo "Equilibrado": 10 rodadas, descanso em ciclo (cada atleta
 * descansa exatamente 2 rodadas) e parceiros sempre distintos. Backtracking
 * determinístico com orçamento de nós.
 */
function solveSuper10Equilibrado(
  seed: number,
  nodeBudget = 3_000_000,
): RoundPairs[] | null {
  const n = 10;
  const restPerRound: Pair[] = [];
  for (let r = 0; r < n; r += 1) {
    restPerRound.push([r, (r + 1) % n]);
  }

  const rng = createRng(seed ^ 0x5f3759df);
  const used = new Set<string>();
  const chosen: Pair[][] = [];
  let nodes = 0;

  function dfs(round: number): boolean {
    if (round === n) return true;
    if (nodes > nodeBudget) return false;
    nodes += 1;

    const resting = new Set(restPerRound[round]);
    const available: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (!resting.has(i)) available.push(i);
    }

    const matchings = shuffle(perfectMatchings(available), rng);

    for (const matching of matchings) {
      let feasible = true;
      for (const [a, b] of matching) {
        if (used.has(pairKey(a, b))) {
          feasible = false;
          break;
        }
      }
      if (!feasible) continue;

      for (const [a, b] of matching) used.add(pairKey(a, b));
      chosen.push(matching);

      if (dfs(round + 1)) return true;

      chosen.pop();
      for (const [a, b] of matching) used.delete(pairKey(a, b));
    }

    return false;
  }

  if (!dfs(0)) return null;

  return chosen.map((pairs, round) => ({
    pairs,
    restingPlayers: [...restPerRound[round]],
  }));
}

/** Fallback determinístico quando o solver não converge: mantém jogos iguais. */
function fallbackSuper10Equilibrado(seed: number): RoundPairs[] {
  const n = 10;
  const rng = createRng(seed ^ 0x9e3779b9);
  const used = new Map<string, number>();
  const rounds: RoundPairs[] = [];

  for (let r = 0; r < n; r += 1) {
    const resting = [r, (r + 1) % n];
    const restingSet = new Set(resting);
    const available: number[] = [];
    for (let i = 0; i < n; i += 1) {
      if (!restingSet.has(i)) available.push(i);
    }

    const options = shuffle(perfectMatchings(available), rng);
    let bestOption = options[0];
    let bestCost = Number.POSITIVE_INFINITY;
    for (const option of options) {
      let cost = 0;
      for (const [a, b] of option) cost += used.get(pairKey(a, b)) ?? 0;
      if (cost < bestCost) {
        bestCost = cost;
        bestOption = option;
      }
    }

    for (const [a, b] of bestOption) {
      const key = pairKey(a, b);
      used.set(key, (used.get(key) ?? 0) + 1);
    }

    rounds.push({ pairs: bestOption, restingPlayers: resting });
  }

  return rounds;
}

function computeMetrics(
  players: Player[],
  rounds: RoundPlan[],
  matches: Match[],
): ScheduleMetrics {
  const gamesPerPlayer = new Map<string, number>();
  const byesPerPlayer = new Map<string, number>();
  const partnerCounts = new Map<string, number>();
  const opponentCounts = new Map<string, number>();

  for (const player of players) {
    gamesPerPlayer.set(player.id, 0);
    byesPerPlayer.set(player.id, 0);
  }

  const stringPairKey = (a: string, b: string) => (a < b ? `${a}:${b}` : `${b}:${a}`);

  for (const match of matches) {
    for (const id of [...match.teamA, ...match.teamB]) {
      gamesPerPlayer.set(id, (gamesPerPlayer.get(id) ?? 0) + 1);
    }

    const partnerA = stringPairKey(match.teamA[0], match.teamA[1]);
    const partnerB = stringPairKey(match.teamB[0], match.teamB[1]);
    partnerCounts.set(partnerA, (partnerCounts.get(partnerA) ?? 0) + 1);
    partnerCounts.set(partnerB, (partnerCounts.get(partnerB) ?? 0) + 1);

    for (const a of match.teamA) {
      for (const b of match.teamB) {
        const key = stringPairKey(a, b);
        opponentCounts.set(key, (opponentCounts.get(key) ?? 0) + 1);
      }
    }
  }

  for (const round of rounds) {
    for (const id of round.byes) {
      byesPerPlayer.set(id, (byesPerPlayer.get(id) ?? 0) + 1);
    }
  }

  const gamesValues = [...gamesPerPlayer.values()];
  const byesValues = [...byesPerPlayer.values()];
  const opponentHistogram: Record<number, number> = {};
  let maxOpponentMeetings = 0;
  for (const count of opponentCounts.values()) {
    opponentHistogram[count] = (opponentHistogram[count] ?? 0) + 1;
    if (count > maxOpponentMeetings) maxOpponentMeetings = count;
  }

  const totalPairs = (players.length * (players.length - 1)) / 2;
  const uncoveredPairs = totalPairs - opponentCounts.size;
  if (uncoveredPairs > 0) {
    opponentHistogram[0] = uncoveredPairs;
  }

  let partnerRepeatPairs = 0;
  for (const count of partnerCounts.values()) {
    if (count > 1) partnerRepeatPairs += 1;
  }

  return {
    partnerRepeatPairs,
    maxOpponentMeetings,
    opponentMeetingHistogram: opponentHistogram,
    gamesPerPlayerMin: Math.min(...gamesValues),
    gamesPerPlayerMax: Math.max(...gamesValues),
    byesPerPlayerMin: Math.min(...byesValues),
    byesPerPlayerMax: Math.max(...byesValues),
    relaxed: false,
    relaxations: [],
  };
}

function buildSchedule(
  config: TournamentConfig,
  players: Player[],
  roundPairs: RoundPairs[],
  seed: number,
  relaxations: string[],
): Schedule {
  // O sorteio da seed define em qual posição cada atleta entra na tabela:
  // parceiros, adversários e descansos mudam quando o número muda.
  const ids = shuffle(
    players.map((player) => player.id),
    createRng(seed ^ 0x2545f491),
  );
  const assigned = assignGames(
    roundPairs,
    seed,
    config.scheduleMode !== "REDUZIDO",
  );
  const matches: Match[] = [];
  const rounds: RoundPlan[] = [];

  roundPairs.forEach((roundPair, roundIndex) => {
    const round = roundIndex + 1;
    const games = assigned.rounds[roundIndex].games;
    const roundMatches: Match[] = games.map((game, gameIndex) => {
      const [teamA, teamB] = game;
      return {
        id: `${seed}-R${round}-G${gameIndex}`,
        round,
        turn: Math.floor(gameIndex / config.courts) + 1,
        court: (gameIndex % config.courts) + 1,
        teamA: [ids[teamA[0]], ids[teamA[1]]],
        teamB: [ids[teamB[0]], ids[teamB[1]]],
        status: "AGENDADO" as const,
        phase: "GRUPO" as const,
      };
    });

    matches.push(...roundMatches);
    rounds.push({
      round,
      matches: roundMatches,
      byes: roundPair.restingPlayers.map((index) => ids[index]),
    });
  });

  const metrics = computeMetrics(players, rounds, matches);
  if (
    config.scheduleMode !== "REDUZIDO" &&
    (metrics.opponentMeetingHistogram[0] ?? 0) > 0
  ) {
    relaxations.push(
      "Nem todos os pares de atletas puderam se enfrentar como adversários. Gere a tabela novamente ou troque a seed.",
    );
  }
  metrics.relaxed = relaxations.length > 0;
  metrics.relaxations = relaxations;

  return { config, players, rounds, matches, metrics };
}

/**
 * Função pura e determinística: mesma entrada ⇒ mesma saída.
 */
export function generateSchedule(
  config: TournamentConfig,
  players: Player[],
  seedOverride?: number,
): Schedule {
  const expected = FORMAT_PLAYERS[config.format];
  if (players.length !== expected) {
    throw new Error(
      `Formato ${config.format} requer ${expected} atletas (recebido ${players.length}).`,
    );
  }
  if (config.courts < 1 || config.courts > 6) {
    throw new Error("O número de quadras deve estar entre 1 e 6.");
  }

  const seed = seedOverride ?? config.seed;
  const relaxations: string[] = [];
  let roundPairs: RoundPairs[];

  if (config.format === "SUPER10") {
    if (config.scheduleMode === "EQUILIBRADO") {
      const solved = solveSuper10Equilibrado(seed);
      if (solved) {
        roundPairs = solved;
      } else {
        roundPairs = fallbackSuper10Equilibrado(seed);
        relaxations.push(
          "Super 10 Equilibrado: não foi possível manter todos os parceiros distintos; a igualdade de jogos foi preservada.",
        );
      }
    } else {
      roundPairs = super10PartnerOfAll(seed);
    }
  } else {
    const all: RoundPairs[] = circleMethodPairs(expected).map((pairs) => ({
      pairs,
      restingPlayers: [],
    }));
    const isReduced = config.scheduleMode === "REDUZIDO";
    const count = isReduced
      ? clamp(Math.round(config.rounds ?? all.length), 1, all.length)
      : all.length;
    roundPairs = isReduced ? pickBestRounds(all, count, seed) : all;
  }

  return buildSchedule(config, players, roundPairs, seed, relaxations);
}
