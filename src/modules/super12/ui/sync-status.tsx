"use client";

import { useOffline } from "next/offline";
import { useEffect, useState } from "react";

import {
  startSyncEngine,
  subscribeSyncState,
  type SyncState,
} from "@/modules/super12/data/sync";

/**
 * Indicador de sincronização com a nuvem. Também é o ponto onde o motor de
 * sync é iniciado — fica montado no layout do dashboard para rodar em todas
 * as telas autenticadas.
 */
export function SyncStatus() {
  const isOffline = useOffline();
  const [state, setState] = useState<SyncState>({ status: "idle" });

  useEffect(() => {
    startSyncEngine();
    return subscribeSyncState(setState);
  }, []);

  const offline = isOffline || state.status === "offline";

  const view = offline
    ? {
        dot: "bg-zinc-400",
        label: "Offline — sync ao reconectar",
        title:
          "Sem conexão: as alterações ficam salvas neste dispositivo e sobem para a nuvem quando a internet voltar.",
      }
    : state.status === "syncing"
      ? {
          dot: "bg-amber-500 animate-pulse",
          label: "Sincronizando…",
          title: "Enviando e recebendo os torneios da nuvem.",
        }
      : state.status === "synced"
        ? {
            dot: "bg-emerald-500",
            label: "Sincronizado",
            title: `Última sincronização: ${new Date(state.at).toLocaleTimeString("pt-BR")}`,
          }
        : state.status === "error"
          ? {
              dot: "bg-red-500",
              label: "Sync pendente",
              title: state.message,
            }
          : {
              dot: "bg-zinc-400",
              label: "Aguardando sync",
              title: "Os torneios serão sincronizados com a nuvem.",
            };

  return (
    <span
      role="status"
      title={view.title}
      className="inline-flex items-center gap-1.5 text-xs text-navy-200"
    >
      <span className={`h-2 w-2 rounded-full ${view.dot}`} aria-hidden />
      {view.label}
    </span>
  );
}
