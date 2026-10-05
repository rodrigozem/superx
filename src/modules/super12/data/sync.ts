import { syncTournamentsAction } from "@/app/actions/tournaments";

import { subscribeLocalChange } from "./change-events";
import { getDb } from "./db";
import { applySnapshot, buildSyncPayload, captureInitialIds } from "./sync-apply";
import { parseSyncSnapshot } from "./sync-contract";

/**
 * Motor de sincronização com a nuvem. Roda só no navegador: envia as
 * alterações locais e aplica o snapshot do servidor sempre que (1) a página
 * carrega, (2) a conexão volta, (3) os dados locais mudam (com debounce),
 * (4) o servidor avisa via SSE que algo mudou, (5) a aba volta ao foco e
 * (6) de minuto em minuto. Falhas não perdem dado: o IndexedDB continua
 * sendo a fonte local e a próxima tentativa reenvia tudo.
 */

export type SyncState =
  | { status: "idle" }
  | { status: "offline" }
  | { status: "syncing" }
  | { status: "synced"; at: number }
  | { status: "error"; message: string };

const CHANGE_DEBOUNCE_MS = 1_500;
const SSE_DEBOUNCE_MS = 300;
const RETRY_MS = 20_000;
const POLL_MS = 60_000;
const FOCUS_MIN_INTERVAL_MS = 10_000;

let state: SyncState = { status: "idle" };
const listeners = new Set<(state: SyncState) => void>();

function setState(next: SyncState) {
  state = next;
  for (const listener of [...listeners]) listener(next);
}

export function getSyncState(): SyncState {
  return state;
}

export function subscribeSyncState(
  listener: (state: SyncState) => void,
): () => void {
  listener(state);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

let started = false;
let running = false;
let rerun = false;
let lastAttemptAt = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

export function startSyncEngine(): void {
  if (typeof window === "undefined" || started) return;
  started = true;

  window.addEventListener("online", () => {
    void syncNow();
  });
  window.addEventListener("offline", () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    setState({ status: "offline" });
  });

  // Voltou para a aba/janela: aproveita para dar um pull rápido.
  window.addEventListener("focus", syncIfStale);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") syncIfStale();
  });

  subscribeLocalChange(() => scheduleSync(CHANGE_DEBOUNCE_MS));
  setInterval(() => {
    void syncNow();
  }, POLL_MS);

  connectEventSource();

  void syncNow();
}

/** SSE do servidor: "changed" significa que outro aparelho sincronizou algo. */
function connectEventSource(): void {
  if (typeof EventSource === "undefined") return;

  const source = new EventSource("/api/tournaments/stream");
  source.addEventListener("changed", () => {
    scheduleSync(SSE_DEBOUNCE_MS);
  });
  // Erros (ex.: sessão expirada) derrubam a conexão; o próprio navegador
  // tenta reconectar quando for erro de rede, e o polling cobre o resto.
}

function syncIfStale() {
  if (Date.now() - lastAttemptAt < FOCUS_MIN_INTERVAL_MS) return;
  void syncNow();
}

function scheduleSync(delayMs: number) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, delayMs);
}

function scheduleRetry() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = setTimeout(() => {
    retryTimer = null;
    void syncNow();
  }, RETRY_MS);
}

export async function syncNow(): Promise<void> {
  if (typeof window === "undefined") return;

  if (!navigator.onLine) {
    setState({ status: "offline" });
    return;
  }

  if (running) {
    rerun = true;
    return;
  }

  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }

  lastAttemptAt = Date.now();
  running = true;
  setState({ status: "syncing" });

  try {
    const db = getDb();
    const initial = await captureInitialIds(db);
    const payload = await buildSyncPayload(db);

    const result = await syncTournamentsAction(payload);
    if (!result.ok) throw new Error(result.error);

    const snapshot = parseSyncSnapshot(result.snapshot);
    if (!snapshot) throw new Error("Resposta de sincronização inválida.");

    await applySnapshot(db, snapshot, initial, payload.deletedTournamentIds);
    setState({ status: "synced", at: Date.now() });
  } catch (error) {
    setState({
      status: "error",
      message:
        error instanceof Error ? error.message : "Falha ao sincronizar.",
    });
    scheduleRetry();
  } finally {
    running = false;
    if (rerun) {
      rerun = false;
      void syncNow();
    }
  }
}
