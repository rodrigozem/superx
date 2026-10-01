import type {
  Format,
  MatchFormat,
  MatchStatus,
  RankingMode,
  ScheduleMode,
  TiebreakCriterion,
} from "@/modules/super12/domain";

export const FORMAT_LABEL: Record<Format, string> = {
  SUPER8: "Super 8",
  SUPER10: "Super 10",
  SUPER12: "Super 12",
};

export const SCHEDULE_MODE_LABEL: Record<ScheduleMode, string> = {
  COMPLETO: "Completo",
  REDUZIDO: "Reduzido",
  EQUILIBRADO: "Equilibrado",
  PARCEIRO_DE_TODOS: "Parceiro de todos",
};

export const RANKING_MODE_LABEL: Record<RankingMode, string> = {
  VITORIAS: "Vitórias",
  PONTOS: "Pontos",
  SALDO_GAMES: "Saldo de games",
  GAMES_PRO: "Games pró",
};

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  AGENDADO: "Agendado",
  EM_ANDAMENTO: "Em andamento",
  FINALIZADO: "Finalizado",
  WO: "WO",
  CANCELADO: "Cancelado",
};

export const TIEBREAK_LABEL: Record<TiebreakCriterion, string> = {
  SALDO_GAMES: "Saldo de games",
  GAMES_PRO: "Games pró",
  CONFRONTO_DIRETO: "Confronto direto",
  APROVEITAMENTO_GAMES: "Aproveitamento de games",
  MINI_CLASSIFICACAO: "Mini-classificação",
  SORTEIO: "Sorteio",
};

export function describeMatchFormat(format: MatchFormat): string {
  switch (format.kind) {
    case "SOMA_FIXA":
      return format.permitirEmpate
        ? `Soma fixa de ${format.total} games`
        : `Soma fixa de ${format.total} games com ponto decisivo`;
    case "SET_ATE_N":
      return `Set até ${format.games} games${format.tiebreak ? " com tie-break" : ""}`;
    case "PRO_SET":
      return "Pro Set até 8 games";
    case "TEMPO":
      return `Tempo de ${format.minutos} minutos`;
    case "LIVRE":
      return "Jogo livre";
  }
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function formatSigned(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
