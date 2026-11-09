"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";

import {
  deleteTournament,
  getDb,
  setTournamentStatus,
} from "@/modules/super12/data";

import { CheckIcon } from "./icons";
import { describeMatchFormat, FORMAT_LABEL } from "./labels";

export function TournamentList() {
  const db = getDb();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [finishingId, setFinishingId] = useState<string | null>(null);
  const [showFinished, setShowFinished] = useState(false);

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
  const finishedCount = ordered.filter(
    (tournament) => tournament.status === "ENCERRADO",
  ).length;
  const visible = ordered.filter(
    (tournament) => showFinished || tournament.status !== "ENCERRADO",
  );

  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={showFinished}
          onChange={(event) => setShowFinished(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300 text-crimson-600 accent-crimson-600 focus:ring-crimson-500 dark:border-navy-600"
        />
        Mostrar torneios finalizados
        {finishedCount > 0 ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            ({finishedCount})
          </span>
        ) : null}
      </label>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center dark:border-navy-600">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Nenhum torneio em andamento.
          </p>
          {!showFinished && finishedCount > 0 ? (
            <button
              type="button"
              onClick={() => setShowFinished(true)}
              className="mt-3 text-sm font-medium text-crimson-600 underline dark:text-crimson-400"
            >
              Mostrar torneios finalizados
            </button>
          ) : null}
        </div>
      ) : null}

      {visible.map((tournament) => {
        const stats = progress.get(tournament.id) ?? { done: 0, total: 0 };
        const confirming = confirmingId === tournament.id;
        const finishing = finishingId === tournament.id;
        const isFinished = tournament.status === "ENCERRADO";

        return (
          <div
            key={tournament.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900"
          >
            <div className="flex min-w-0 items-center gap-4">
              {tournament.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.image}
                  alt=""
                  width={489}
                  height={275}
                  className="h-14 w-24 shrink-0 rounded-lg object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-navy-900 dark:text-zinc-50">
                    {tournament.name}
                  </p>
                  {isFinished ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      <CheckIcon className="h-3 w-3" />
                      Finalizado
                    </span>
                  ) : null}
                </div>
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
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/dashboard/torneios/${tournament.id}`}
                className="rounded-lg bg-crimson-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-crimson-700 dark:bg-crimson-600 dark:text-white"
              >
                Abrir
              </Link>

              {!isFinished ? (
                <button
                  type="button"
                  onClick={() => {
                    if (finishing) {
                      setFinishingId(null);
                      void setTournamentStatus(tournament.id, "ENCERRADO", db);
                      return;
                    }
                    setFinishingId(tournament.id);
                  }}
                  className={
                    finishing
                      ? "rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-navy-800 dark:bg-navy-700 dark:hover:bg-navy-600"
                      : "rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
                  }
                >
                  {finishing ? "Confirmar finalização" : "Finalizar"}
                </button>
              ) : null}

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
