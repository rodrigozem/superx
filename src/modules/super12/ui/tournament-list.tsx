"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import { deleteTournament, getDb } from "@/modules/super12/data";

import { describeMatchFormat, FORMAT_LABEL } from "./labels";

export function TournamentList() {
  const db = getDb();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const tournaments = useLiveQuery(() => db.tournaments.toArray(), [db]);
  const matches = useLiveQuery(() => db.matches.toArray(), [db]);

  if (!tournaments || !matches) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-navy-600">
        Carregando torneios…
      </p>
    );
  }

  if (tournaments.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-navy-600">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Nenhum torneio encontrado.
        </p>
        <Link
          href="/dashboard/torneios/novo"
          className="mt-4 inline-block rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-700 dark:bg-crimson-600 dark:text-white"
        >
          Criar torneio
        </Link>
      </div>
    );
  }

  const progress = new Map<string, { done: number; total: number }>();
  for (const match of matches) {
    const current = progress.get(match.tournamentId) ?? { done: 0, total: 0 };
    current.total += 1;
    if (match.status === "FINALIZADO") current.done += 1;
    progress.set(match.tournamentId, current);
  }

  const ordered = [...tournaments].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="space-y-3">
      {ordered.map((tournament) => {
        const stats = progress.get(tournament.id) ?? { done: 0, total: 0 };
        const confirming = confirmingId === tournament.id;

        return (
          <div
            key={tournament.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900"
          >
            <div>
              <p className="font-semibold text-navy-900 dark:text-zinc-50">
                {tournament.name}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {FORMAT_LABEL[tournament.config.format]} ·{" "}
                {describeMatchFormat(tournament.config.matchFormat)} · seed{" "}
                {tournament.config.seed} · criado em{" "}
                {new Date(tournament.createdAt).toLocaleDateString("pt-BR")}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {stats.done}/{stats.total} jogos finalizados
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/torneios/${tournament.id}`}
                className="rounded-lg bg-crimson-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-crimson-700 dark:bg-crimson-600 dark:text-white"
              >
                Abrir
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirming) {
                    setConfirmingId(null);
                    void deleteTournament(tournament.id, db);
                    return;
                  }
                  setConfirmingId(tournament.id);
                }}
                className={
                  confirming
                    ? "rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-500"
                    : "rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
                }
              >
                {confirming ? "Confirmar exclusão" : "Excluir"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
