import type {
  Match,
  Player,
  ScheduleMetrics,
  TournamentConfig,
} from "@/modules/super12/domain";

export type TournamentStatus = "EM_ANDAMENTO" | "ENCERRADO";

/** Atleta persistido junto do torneio (o módulo é local-first, sem servidor). */
export interface StoredPlayer extends Player {
  status: "ATIVO" | "DESISTENTE";
}

/** Partida persistida. Estende `Match` do domínio com o vínculo com o torneio. */
export interface StoredMatch extends Match {
  tournamentId: string;
  notes?: string;
}

export interface StoredTournament {
  id: string;
  name: string;
  status: TournamentStatus;
  createdAt: string;
  updatedAt: string;
  config: TournamentConfig;
  players: StoredPlayer[];
  metrics: ScheduleMetrics;
  /** Atletas que descansam em cada rodada: `{ [rodada]: [playerId] }`. */
  byesByRound: Record<string, string[]>;
}

export interface StoredMeta {
  key: string;
  value: unknown;
}

/** Tombstone local: torneio apagado que ainda precisa ser apagado na nuvem. */
export interface DeletedTournament {
  id: string;
  deletedAt: string;
}

export const ACTIVE_TOURNAMENT_KEY = "activeTournamentId";
