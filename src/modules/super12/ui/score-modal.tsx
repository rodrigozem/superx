"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

import type { MatchFormat, ScoreInput } from "@/modules/super12/domain";
import type { StoredMatch } from "@/modules/super12/data";

import { CloseIcon } from "./icons";
import { ScoreEditor } from "./score-editor";

type SubmitResult = { ok: boolean; error?: string };

type ScoreModalProps = {
  match: StoredMatch;
  format: MatchFormat;
  teamAName: string;
  teamBName: string;
  onSubmit: (input: ScoreInput) => Promise<SubmitResult>;
  onClear: () => Promise<void>;
  onClose: () => void;
};

/**
 * Modal de lançamento de placar. Renderizado via portal para escapar do
 * `backdrop-blur` do header e ocupar a tela inteira.
 */
export function ScoreModal({
  match,
  format,
  teamAName,
  teamBName,
  onSubmit,
  onClear,
  onClose,
}: ScoreModalProps) {
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

  const editing = match.gamesA !== undefined;

  return createPortal(
    <div
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Editar placar" : "Informar placar"}
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-navy-700 dark:bg-navy-900 sm:p-5"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Rodada {match.round} · Turno {match.turn}
            </p>
            <h2 className="mt-0.5 text-sm font-semibold text-navy-900 dark:text-zinc-50">
              {editing ? "Editar placar" : "Informar placar"}
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

        <ScoreEditor
          match={match}
          format={format}
          teamAName={teamAName}
          teamBName={teamBName}
          onSubmit={onSubmit}
          onClear={onClear}
          onCancel={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}
