"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import { computeStandings } from "@/modules/super12/domain";

import {
  getDb,
  renameTournament,
  setActiveTournament,
  setTournamentImage,
} from "@/modules/super12/data";

import {
  describeMatchFormat,
  FORMAT_LABEL,
  SCHEDULE_MODE_LABEL,
} from "./labels";
import { TvIcon, DownloadIcon, TrophyIcon } from "./icons";
import { fileToTournamentImage } from "./image-utils";
import { PlayersModal } from "./players-modal";
import { exportRoundsPdf, exportStandingsPdf } from "./pdf-export";
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
  const [playersOpen, setPlayersOpen] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState<"rounds" | "standings" | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
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
  const allFinished = matches.length > 0 && finished === matches.length;
  const showByes = Object.keys(tournament.byesByRound).length > 0;
  const progressPct =
    matches.length > 0 ? Math.round((finished / matches.length) * 100) : 0;
  const statCards = [
    {
      label: "Jogos por atleta",
      value: `${tournament.metrics.gamesPerPlayerMin}–${tournament.metrics.gamesPerPlayerMax}`,
    },
    {
      label: "Máx. confrontos",
      value: `${tournament.metrics.maxOpponentMeetings}x`,
    },
    {
      label: "Parcerias repetidas",
      value: String(tournament.metrics.partnerRepeatPairs),
    },
    { label: "Quadras", value: String(tournament.config.courts) },
  ];

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

  async function handleImagePick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImageError(null);
    setImageBusy(true);
    try {
      const image = await fileToTournamentImage(file);
      const result = await setTournamentImage(id, image, db);
      if (!result.ok) setImageError(result.error);
    } catch {
      setImageError("Não foi possível processar a imagem.");
    } finally {
      setImageBusy(false);
    }
  }

  async function handleImageRemove() {
    setImageError(null);
    setImageBusy(true);
    const result = await setTournamentImage(id, undefined, db);
    if (!result.ok) setImageError(result.error);
    setImageBusy(false);
  }

  async function handleRoundsPdf() {
    if (!tournament) return;
    setPdfError(null);
    setPdfBusy("rounds");
    try {
      await exportRoundsPdf({ tournament, matches: orderedMatches });
    } catch {
      setPdfError("Não foi possível gerar o PDF das rodadas.");
    } finally {
      setPdfBusy(null);
    }
  }

  async function handleStandingsPdf() {
    if (!tournament || !matches) return;
    setPdfError(null);
    setPdfBusy("standings");
    try {
      await exportStandingsPdf({
        tournament,
        standings,
        finished,
        total: matches.length,
      });
    } catch {
      setPdfError("Não foi possível gerar o PDF da classificação.");
    } finally {
      setPdfBusy(null);
    }
  }

  const openTvMode = () => {
    setTvOpen(true);
    const request = document.documentElement.requestFullscreen?.();
    if (request) void request.catch(() => {});
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900">
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-start sm:p-6">
          {tournament.image || isAdmin ? (
            <div className="w-full shrink-0 space-y-2 sm:w-[300px]">
              {tournament.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tournament.image}
                  alt={`Imagem do torneio ${tournament.name}`}
                  width={489}
                  height={275}
                  className="h-auto w-full rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10"
                />
              ) : null}

              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700">
                    {tournament.image ? "Alterar imagem" : "Adicionar imagem"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={imageBusy}
                      onChange={handleImagePick}
                    />
                  </label>
                  {tournament.image ? (
                    <button
                      type="button"
                      onClick={handleImageRemove}
                      disabled={imageBusy}
                      className="text-xs font-medium text-red-600 underline disabled:opacity-40 dark:text-red-400"
                    >
                      Remover
                    </button>
                  ) : null}
                  {imageBusy ? (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      Processando…
                    </span>
                  ) : null}
                </div>
              ) : null}

              {imageError ? (
                <p className="text-sm text-red-600 dark:text-red-400">{imageError}</p>
              ) : null}
            </div>
          ) : null}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
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
                    <h2 className="text-2xl font-semibold tracking-tight text-navy-900 dark:text-zinc-50">
                      {tournament.name}
                    </h2>
                    {isAdmin ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={startRename}
                          className="rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
                        >
                          Editar nome
                        </button>
                        <button
                          type="button"
                          onClick={() => setPlayersOpen(true)}
                          className="rounded-lg border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700"
                        >
                          Editar participantes
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
                {renameError ? (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {renameError}
                  </p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <span>{FORMAT_LABEL[tournament.config.format]}</span>
                  <span aria-hidden className="text-zinc-300 dark:text-navy-600">
                    •
                  </span>
                  <span>{SCHEDULE_MODE_LABEL[tournament.config.scheduleMode]}</span>
                  <span aria-hidden className="text-zinc-300 dark:text-navy-600">
                    •
                  </span>
                  <span>{describeMatchFormat(tournament.config.matchFormat)}</span>
                  <span aria-hidden className="text-zinc-300 dark:text-navy-600">
                    •
                  </span>
                  <span>seed {tournament.config.seed}</span>
                </p>
              </div>

              <div className="rounded-xl bg-zinc-50 px-3 py-2 text-right dark:bg-navy-950">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Progresso
                </p>
                <p className="text-sm font-semibold tabular-nums text-navy-900 dark:text-zinc-50">
                  {finished}
                  <span className="text-zinc-400 dark:text-zinc-500">
                    /{matches.length}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-navy-800">
              <div
                className="h-full rounded-full bg-crimson-500 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-navy-950"
                >
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    {stat.label}
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold tabular-nums text-navy-900 dark:text-zinc-50">
                    {stat.value}
                  </dd>
                </div>
              ))}
            </dl>

            {tournament.metrics.relaxations.length > 0 ? (
              <ul className="mt-4 space-y-1 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                {tournament.metrics.relaxations.map((relaxation) => (
                  <li key={relaxation}>{relaxation}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleRoundsPdf()}
            disabled={pdfBusy !== null}
            title="Gerar PDF com a tabela de todas as rodadas"
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 disabled:opacity-50 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
          >
            <DownloadIcon className="h-4 w-4" />
            {pdfBusy === "rounds" ? "Gerando…" : "PDF rodadas"}
          </button>

          <button
            type="button"
            onClick={() => void handleStandingsPdf()}
            disabled={pdfBusy !== null || !allFinished}
            title={
              allFinished
                ? "Gerar PDF da classificação final"
                : "Disponível quando todos os jogos forem finalizados"
            }
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 disabled:opacity-50 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
          >
            <TrophyIcon className="h-4 w-4" />
            {pdfBusy === "standings" ? "Gerando…" : "PDF ranking"}
          </button>

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
      </div>

      {pdfError ? (
        <p className="-mt-2 text-sm text-red-600 dark:text-red-400">{pdfError}</p>
      ) : null}

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

      {playersOpen ? (
        <PlayersModal
          tournament={tournament}
          onClose={() => setPlayersOpen(false)}
        />
      ) : null}
    </div>
  );
}
