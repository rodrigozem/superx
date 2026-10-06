/**
 * Domínio do módulo "Super 12" (Super 8 / 10 / 12).
 * TypeScript puro — sem dependência de React/Next. 100% testável.
 */

export type Format = "SUPER8" | "SUPER10" | "SUPER12";

export type ScheduleMode =
  | "COMPLETO"
  | "REDUZIDO"
  | "EQUILIBRADO"
  | "PARCEIRO_DE_TODOS";

export type MatchFormat =
  | {
      kind: "SOMA_FIXA";
      total: number;
      permitirEmpate: boolean;
      decisivoContaGame: boolean;
    }
  | {
      kind: "SET_ATE_N";
      games: number;
      tiebreak: boolean;
      difMinima2: boolean;
    }
  | { kind: "PRO_SET"; games: 8 }
  | { kind: "TEMPO"; minutos: number }
  | { kind: "LIVRE" };

export type RankingMode = "VITORIAS" | "PONTOS" | "SALDO_GAMES" | "GAMES_PRO";

export type FinalsMode = "NENHUMA" | "FINAL_TOP4" | "SEMI_TOP8";

export type TiebreakCriterion =
  | "SALDO_GAMES"
  | "GAMES_PRO"
  | "CONFRONTO_DIRETO"
  | "APROVEITAMENTO_GAMES"
  | "MINI_CLASSIFICACAO"
  | "SORTEIO";

export type MatchStatus =
  | "AGENDADO"
  | "EM_ANDAMENTO"
  | "FINALIZADO"
  | "WO"
  | "CANCELADO";

export type Phase = "GRUPO" | "SEMI" | "FINAL" | "DESEMPATE";

export type TeamSide = "A" | "B";

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  seed?: number;
  status?: "ATIVO" | "DESISTENTE";
}

export interface TournamentConfig {
  format: Format;
  scheduleMode: ScheduleMode;
  /** Número de rodadas no modo REDUZIDO (ou sobrescrita explícita). */
  rounds?: number;
  /** 1 a 6 quadras. */
  courts: number;
  courtNames?: string[];
  matchFormat: MatchFormat;
  rankingMode: RankingMode;
  points: { win: number; draw: number; loss: number };
  tiebreakOrder: TiebreakCriterion[];
  finalsMode: FinalsMode;
  finalsMatchFormat?: MatchFormat;
  seed: number;
  isTest: boolean;
}

export interface Match {
  id: string;
  round: number;
  turn: number;
  court: number;
  teamA: [string, string];
  teamB: [string, string];
  status: MatchStatus;
  phase: Phase;
  gamesA?: number;
  gamesB?: number;
  decisivoPara?: TeamSide;
  tiebreakA?: number;
  tiebreakB?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface RoundPlan {
  round: number;
  matches: Match[];
  /** Atletas que não jogam nesta rodada (Super 10). */
  byes: string[];
}

export interface ScheduleMetrics {
  /** Pairs de atletas que foram parceiros mais de uma vez. */
  partnerRepeatPairs: number;
  /** Maior número de vezes que um mesmo par de atletas se enfrentou. */
  maxOpponentMeetings: number;
  opponentMeetingHistogram: Record<number, number>;
  gamesPerPlayerMin: number;
  gamesPerPlayerMax: number;
  byesPerPlayerMin: number;
  byesPerPlayerMax: number;
  /** true se o solver precisou relaxar alguma restrição. */
  relaxed: boolean;
  relaxations: string[];
}

export interface Schedule {
  config: TournamentConfig;
  players: Player[];
  rounds: RoundPlan[];
  matches: Match[];
  metrics: ScheduleMetrics;
}

export const DEFAULT_TIEBREAK_ORDER: TiebreakCriterion[] = [
  "SALDO_GAMES",
  "GAMES_PRO",
  "APROVEITAMENTO_GAMES",
  "CONFRONTO_DIRETO",
  "MINI_CLASSIFICACAO",
  "SORTEIO",
];

/**
 * Ordem usada até2026 nos torneios criados: o confronto direto vinha logo
 * após o saldo. Os torneios com esta ordem salva são atualizados para a
 * ordem atual pela migração de configuração (ver `config-migration.ts`).
 */
export const LEGACY_TIEBREAK_ORDER: TiebreakCriterion[] = [
  "SALDO_GAMES",
  "GAMES_PRO",
  "CONFRONTO_DIRETO",
  "APROVEITAMENTO_GAMES",
  "MINI_CLASSIFICACAO",
  "SORTEIO",
];

export const DEFAULT_MATCH_FORMAT: MatchFormat = {
  kind: "SOMA_FIXA",
  total: 6,
  permitirEmpate: true,
  decisivoContaGame: true,
};

export function createDefaultConfig(
  overrides: Partial<TournamentConfig> = {},
): TournamentConfig {
  return {
    format: "SUPER12",
    scheduleMode: "COMPLETO",
    courts: 3,
    matchFormat: DEFAULT_MATCH_FORMAT,
    rankingMode: "VITORIAS",
    points: { win: 3, draw: 1, loss: 0 },
    tiebreakOrder: [...DEFAULT_TIEBREAK_ORDER],
    finalsMode: "FINAL_TOP4",
    seed: 1,
    isTest: false,
    ...overrides,
  };
}
