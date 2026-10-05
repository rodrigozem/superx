import "server-only";

/**
 * Barramento em memória (processo único) para o tempo real dos torneios:
 * quando o sync grava algo novo no SQLite, todos os navegadores conectados
 * via SSE são avisados e baixam o snapshot na hora.
 */

type Listener = (originId?: string) => void;

const globalForBus = globalThis as unknown as {
  __tournamentSyncListeners?: Set<Listener>;
};

function listeners(): Set<Listener> {
  globalForBus.__tournamentSyncListeners ??= new Set<Listener>();
  return globalForBus.__tournamentSyncListeners;
}

export function subscribeTournamentsChanged(listener: Listener): () => void {
  listeners().add(listener);
  return () => {
    listeners().delete(listener);
  };
}

/** `originId` identifica o cliente que fez a alteração (para ele ignorar o eco). */
export function notifyTournamentsChanged(originId?: string): void {
  for (const listener of [...listeners()]) listener(originId);
}
