"use client";

import { useOffline } from "next/offline";

/**
 * Aviso global de conectividade. Os dados dos torneios ficam no IndexedDB, então
 * o app continua utilizável offline — apenas o conteúdo vindo do servidor
 * (login, usuários) depende da rede.
 */
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-400 px-6 py-2 text-center text-sm font-medium text-amber-950"
    >
      Sem conexão — os torneios salvos continuam disponíveis. Vamos tentar
      reconectar automaticamente.
    </div>
  );
}
