import {
  DEFAULT_TIEBREAK_ORDER,
  LEGACY_TIEBREAK_ORDER,
} from "@/modules/super12/domain";

import type { StoredTournament } from "./types";

function isLegacyOrder(order: unknown): boolean {
  return (
    Array.isArray(order) &&
    order.length === LEGACY_TIEBREAK_ORDER.length &&
    order.every((criterion, index) => criterion === LEGACY_TIEBREAK_ORDER[index])
  );
}

/**
 * Migra a configuração salva de torneios antigos para o padrão atual:
 *
 * - desempates: o confronto direto (e a mini-classificação) passam a valer só
 *   como última instância, antes do sorteio;
 * - critério principal: Vitórias (o padrão de quem cria torneio hoje).
 *
 * Só age quando a ordem salva é exatamente a legada — torneios criados depois
 * já nascem com a ordem nova e quem escolheu outro critério principal foi
 * deliberado (a ordem nunca foi editável, então a ordem legada identifica os
 * torneios antigos). Idempotente: rodar de novo não muda nada.
 */
export function migrateTournamentConfig(
  tournament: StoredTournament,
): { tournament: StoredTournament; changed: boolean } {
  if (!isLegacyOrder(tournament.config?.tiebreakOrder)) {
    return { tournament, changed: false };
  }

  return {
    changed: true,
    tournament: {
      ...tournament,
      config: {
        ...tournament.config,
        tiebreakOrder: [...DEFAULT_TIEBREAK_ORDER],
        rankingMode: "VITORIAS",
      },
    },
  };
}
