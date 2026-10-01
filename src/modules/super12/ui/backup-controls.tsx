"use client";

import { useRef, useState } from "react";

import {
  exportTournamentBackup,
  getDb,
  importTournamentBackup,
} from "@/modules/super12/data";

type BackupState =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

const buttonClass =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";

export function BackupControls() {
  const db = getDb();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<BackupState>({ kind: "idle" });

  async function handleExport() {
    setState({ kind: "working" });
    try {
      const backup = await exportTournamentBackup(db);
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `torneios-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);
      setState({
        kind: "done",
        message: `${backup.tournaments.length} torneio(s) e ${backup.matches.length} jogo(s) exportados.`,
      });
    } catch {
      setState({ kind: "error", message: "Não foi possível gerar o backup." });
    }
  }

  async function handleFile(file: File) {
    setState({ kind: "working" });
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = await importTournamentBackup(parsed, db);

      if (!result.ok) {
        setState({ kind: "error", message: result.error });
        return;
      }

      const { tournaments, matches, skippedMatches, warnings } = result.data;
      const parts = [`${tournaments} torneio(s) e ${matches} jogo(s) importados.`];
      if (skippedMatches > 0) parts.push(`${skippedMatches} jogo(s) ignorado(s).`);
      if (warnings.length > 0) parts.push(warnings[0]);
      setState({ kind: "done", message: parts.join(" ") });
    } catch {
      setState({ kind: "error", message: "Não foi possível ler o arquivo." });
    }
  }

  const busy = state.kind === "working";

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" className={buttonClass} disabled={busy} onClick={() => void handleExport()}>
          Exportar backup
        </button>
        <button
          type="button"
          className={buttonClass}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          Importar backup
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void handleFile(file);
          }}
        />
      </div>

      {state.kind === "done" || state.kind === "error" ? (
        <p
          role="status"
          className={
            state.kind === "error"
              ? "text-xs text-red-600 dark:text-red-400"
              : "text-xs text-zinc-500 dark:text-zinc-400"
          }
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
