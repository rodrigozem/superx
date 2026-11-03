"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";

import {
  getDb,
  updatePlayerNames,
  type StoredTournament,
} from "@/modules/super12/data";

import { CloseIcon } from "./icons";

type PlayersModalProps = {
  tournament: StoredTournament;
  onClose: () => void;
};

export function PlayersModal({ tournament, onClose }: PlayersModalProps) {
  const db = getDb();
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries(tournament.players.map((player) => [player.id, player.name])),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const result = await updatePlayerNames(tournament.id, draft, db);
    setBusy(false);

    if (result.ok) {
      onClose();
    } else {
      setError(result.error);
    }
  }

  return createPortal(
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Editar participantes"
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-navy-700 dark:bg-navy-900 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {tournament.players.length} atletas
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-navy-900 dark:text-zinc-50">
              Editar participantes
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-navy-900 dark:text-zinc-400 dark:hover:bg-navy-800 dark:hover:text-zinc-100"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <ul className="space-y-2">
            {tournament.players.map((player, index) => (
              <li key={player.id} className="flex items-center gap-2">
                <span className="w-6 shrink-0 text-right text-xs font-medium tabular-nums text-zinc-400 dark:text-zinc-500">
                  {index + 1}
                </span>
                <input
                  value={draft[player.id] ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [player.id]: event.target.value,
                    }))
                  }
                  maxLength={40}
                  aria-label={`Nome do atleta ${index + 1}`}
                  className="w-full rounded-lg border border-zinc-200 bg-field px-3 py-2 text-sm text-navy-900 outline-none focus:border-crimson-500 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50"
                />
              </li>
            ))}
          </ul>

          {error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-crimson-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-crimson-700 disabled:opacity-50"
            >
              {busy ? "Salvando…" : "Salvar nomes"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
