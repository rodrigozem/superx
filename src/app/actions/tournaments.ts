"use server";

import { syncCloudTournaments } from "@/lib/cloud-tournaments";
import { getSession } from "@/lib/dal";
import {
  parseSyncPayload,
  type SyncActionResponse,
} from "@/modules/super12/data/sync-contract";

/**
 * Envia as alterações locais (torneios, partidas e exclusões) e devolve o
 * snapshot completo da nuvem no mesmo roundtrip. O cliente aplica o snapshot
 * com política de última escrita vence.
 */
export async function syncTournamentsAction(
  payload: unknown,
): Promise<SyncActionResponse> {
  const session = await getSession();
  if (!session) {
    return {
      ok: false,
      error: "Sessão expirada. Entre novamente para sincronizar.",
    };
  }

  const parsed = parseSyncPayload(payload);
  if (!parsed) {
    return { ok: false, error: "Dados de sincronização inválidos." };
  }

  try {
    const snapshot = syncCloudTournaments(parsed);
    return { ok: true, snapshot };
  } catch {
    return { ok: false, error: "Não foi possível salvar na nuvem agora." };
  }
}
