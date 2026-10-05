import { syncTournamentsAction } from "@/app/actions/tournaments";

import { subscribeLocalChange } from "./change-events";
import { getDb } from "./db";
import { applySnapshot, buildSyncPayload, captureInitialIds } from "./sync-apply";
import { parseSyncSnapshot } from "./sync-contract";

/**
 * Motor de sincronização com a nuvem. Roda só no navegador: envia as
 * alterações locais e aplica o snapshot do servidor sempre que (1) a página
 * carrega, (2) a conexão volta, (3) os dados locais mudam (com debounce) e
 * (4) de minuto em minuto. Falhas não perdem dado: o IndexedDB continua
 * sendo a fonte local e a próxima tentativa reenvia tudo.
 */

export type SyncState =
  | { status: "idle" }
  | { status: "offline" }
  | { status: "syncing" }
  | { status: "synced"; at: number }
  | { status: "error"; message: string };

const CHANGE_DEBOUNCE_MS = 1_500;
const RETRY_MS = 20_000;
const POLL_MS = 60_000;

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

  subscribeLocalChange(scheduleSync);
  setInterval(() => {
    void syncNow();
  }, POLL_MS);

  void syncNow();
}

function scheduleSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncNow();
  }, CHANGE_DEBOUNCE_MS);
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
