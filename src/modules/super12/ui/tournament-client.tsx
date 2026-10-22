"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import { computeStandings } from "@/modules/super12/domain";

import {
  getDb,
  renameTournament,
  setActiveTournament,
} from "@/modules/super12/data";

import {
  describeMatchFormat,
  FORMAT_LABEL,
  SCHEDULE_MODE_LABEL,
} from "./labels";
import { TvIcon } from "./icons";
import { RoundsView } from "./rounds-view";
import { StandingsTable } from "./standings-table";
import { StandingsTvPanel } from "./standings-tv";

type TournamentClientProps = {
  id: string;
  isAdmin: boolean;
};

type Tab = "RODADAS" | "CLASSIFICACAO";

export function TournamentClient({ id, isAdmin }: TournamentClientProps) {
  const db = getDb();
  const [tab, setTab] = useState<Tab>("RODADAS");
  const [tvOpen, setTvOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  // Referência estável: um onClose novo a cada re-render faria o painel da TV
  // rodar o cleanup do efeito e derrubar a tela cheia a cada resultado salvo.
  const closeTv = useCallback(() => setTvOpen(false), []);

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
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-navy-600">
        Carregando torneio…
      </p>
    );
  }

  if (matches.length === 0 && tournament.players.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-navy-600">
        Torneio não encontrado.
      </p>
    );
  }

  const finished = matches.filter((match) => match.status === "FINALIZADO").length;
  const showByes = Object.keys(tournament.byesByRound).length > 0;

  function startRename() {
    if (!tournament) return;
    setNameDraft(tournament.name);
    setRenameError(null);
    setRenaming(true);
  }

  function cancelRename() {
    setRenaming(false);
    setRenameError(null);
  }

  async function handleRenameSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await renameTournament(id, nameDraft, db);
    if (result.ok) {
      setRenaming(false);
      setRenameError(null);
    } else {
      setRenameError(result.error);
    }
  }

  const openTvMode = () => {
    setTvOpen(true);
    const request = document.documentElement.requestFullscreen?.();
    if (request) void request.catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-navy-800 dark:bg-navy-900">
        {tournament.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={tournament.image}
            alt={`Imagem do torneio ${tournament.name}`}
            width={489}
            height={275}
            className="mb-4 h-auto w-full max-w-[489px] rounded-lg object-cover"
          />
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {renaming ? (
              <form
                onSubmit={handleRenameSubmit}
                className="flex flex-wrap items-center gap-2"
              >
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={80}
                  autoFocus
                  aria-label="Nome do torneio"
                  className="w-full max-w-sm rounded-lg border border-zinc-200 bg-field px-3 py-2 text-sm text-navy-900 outline-none focus:border-crimson-500 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-crimson-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-crimson-700"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={cancelRename}
                  className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
                  {tournament.name}
                </h2>
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={startRename}
                    className="rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
                  >
                    Editar nome
                  </button>
                ) : null}
              </div>
            )}
            {renameError ? (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{renameError}</p>
            ) : null}
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              {FORMAT_LABEL[tournament.config.format]} ·{" "}
              {SCHEDULE_MODE_LABEL[tournament.config.scheduleMode]} ·{" "}
              {describeMatchFormat(tournament.config.matchFormat)} · seed{" "}
              {tournament.config.seed}
            </p>
          </div>
          <p className="text-sm font-medium text-navy-800 dark:text-navy-200">
            {finished}/{matches.length} jogos finalizados
          </p>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 sm:grid-cols-4 dark:text-zinc-400">
          <div>
            <dt>Jogos por atleta</dt>
            <dd className="mt-0.5 text-sm font-medium text-navy-800 dark:text-zinc-100">
              {tournament.metrics.gamesPerPlayerMin}–{tournament.metrics.gamesPerPlayerMax}
            </dd>
          </div>
          <div>
            <dt>Máx. repetição de confronto</dt>
            <dd className="mt-0.5 text-sm font-medium text-navy-800 dark:text-zinc-100">
              {tournament.metrics.maxOpponentMeetings}x
            </dd>
          </div>
          <div>
            <dt>Pares que repetiram parceria</dt>
            <dd className="mt-0.5 text-sm font-medium text-navy-800 dark:text-zinc-100">
              {tournament.metrics.partnerRepeatPairs}
            </dd>
          </div>
          <div>
            <dt>Quadras</dt>
            <dd className="mt-0.5 text-sm font-medium text-navy-800 dark:text-zinc-100">
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
                ? "rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-navy-800"
                : "rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
            }
          >
            {label}
          </button>
        ))}

        <button
          type="button"
          onClick={openTvMode}
          title="Modo TV — classificação em tela cheia"
          aria-label="Abrir classificação em modo TV"
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
        >
          <TvIcon className="h-4 w-4" />
          TV
        </button>
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

      {tvOpen ? (
        <StandingsTvPanel
          tournamentName={tournament.name}
          standings={standings}
          config={tournament.config}
          showByes={showByes}
          finished={finished}
          total={matches.length}
          onClose={closeTv}
        />
      ) : null}
    </div>
  );
}
