"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useState } from "react";

import { computeStandings } from "@/modules/super12/domain";

import { getDb, setActiveTournament } from "@/modules/super12/data";

import {
  describeMatchFormat,
  FORMAT_LABEL,
  SCHEDULE_MODE_LABEL,
} from "./labels";
import { RoundsView } from "./rounds-view";
import { StandingsTable } from "./standings-table";

type TournamentClientProps = {
  id: string;
};

type Tab = "RODADAS" | "CLASSIFICACAO";

export function TournamentClient({ id }: TournamentClientProps) {
  const db = getDb();
  const [tab, setTab] = useState<Tab>("RODADAS");

  const tournament = useLiveQuery(() => db.tournaments.get(id), [db, id]);
  const matches = useLiveQuery(
    () => db.matches.where("tournamentId").equals(id).toArray(),
    [db, id],
  );

  useEffect(() => {
    void setActiveTournament(id, db);
  }, [db, id]);

  const byes = useMemo(() => {
    const map = new Map<string, number>();
    if (!tournament) return map;
    for (const list of Object.values(tournament.byesByRound)) {
      for (const playerId of list) {
        map.set(playerId, (map.get(playerId) ?? 0) + 1);
      }
    }
    return map;
  }, [tournament]);

  const orderedMatches = useMemo(
    () =>
      [...(matches ?? [])].sort(
        (a, b) => a.round - b.round || a.turn - b.turn || a.court - b.court,
      ),
    [matches],
  );

  const standings = useMemo(() => {
    if (!tournament) return [];
    return computeStandings(
      tournament.players,
      orderedMatches,
      tournament.config,
      { byes },
    );
  }, [tournament, orderedMatches, byes]);

  if (!tournament || !matches) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Carregando torneio…
      </p>
    );
  }

  if (matches.length === 0 && tournament.players.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
        Torneio não encontrado.
      </p>
    );
  }

  const finished = matches.filter((match) => match.status === "FINALIZADO").length;
  const showByes = Object.keys(tournament.byesByRound).length > 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {tournament.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {FORMAT_LABEL[tournament.config.format]} ·{" "}
              {SCHEDULE_MODE_LABEL[tournament.config.scheduleMode]} ·{" "}
              {describeMatchFormat(tournament.config.matchFormat)} · seed{" "}
              {tournament.config.seed}
            </p>
          </div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
            {finished}/{matches.length} jogos finalizados
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 sm:grid-cols-4 dark:text-zinc-400">
          <div>
            <dt>Jogos por atleta</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {tournament.metrics.gamesPerPlayerMin}–{tournament.metrics.gamesPerPlayerMax}
            </dd>
          </div>
          <div>
            <dt>Máx. repetição de confronto</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {tournament.metrics.maxOpponentMeetings}x
            </dd>
          </div>
          <div>
            <dt>Pares que repetiram parceria</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {tournament.metrics.partnerRepeatPairs}
            </dd>
          </div>
          <div>
            <dt>Quadras</dt>
            <dd className="mt-0.5 text-sm font-medium text-zinc-800 dark:text-zinc-100">
              {tournament.config.courts}
            </dd>
          </div>
        </dl>

        {tournament.metrics.relaxations.length > 0 ? (
          <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {tournament.metrics.relaxations.map((relaxation) => (
              <li key={relaxation}>{relaxation}</li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="flex gap-2">
        {(
          [
            ["RODADAS", "Rodadas"],
            ["CLASSIFICACAO", "Classificação"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={
              tab === value
                ? "rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "RODADAS" ? (
        <RoundsView tournament={tournament} matches={orderedMatches} />
      ) : (
        <StandingsTable
          standings={standings}
          config={tournament.config}
          showByes={showByes}
        />
      )}

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Os dados ficam salvos neste navegador e são sincronizados com a nuvem
        quando há internet.{" "}
        <Link href="/dashboard/torneios" className="underline">
          Ver torneios
        </Link>
      </p>
    </div>
  );
}
