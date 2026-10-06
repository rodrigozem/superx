"use client";

import { useEffect, useRef, useState } from "react";

import type {
  PlayerStats,
  RankingMode,
  StandingEntry,
  TournamentConfig,
} from "@/modules/super12/domain";

import { FORMAT_LABEL, RANKING_MODE_LABEL, formatSigned } from "./labels";
import { CloseIcon, MaximizeIcon, MinimizeIcon } from "./icons";

/**
 * Modo TV: painel em tela cheia (fundo escuro de placar) com pódio dos 3
 * primeiros e a classificação em tipografia grande, feito para ser exibido
 * num monitor/TV ligada ao torneio. Atualiza sozinho — os dados vêm do
 * IndexedDB reativo (e da sincronização com a nuvem).
 */

type StandingsTvPanelProps = {
  tournamentName: string;
  standings: StandingEntry[];
  config: TournamentConfig;
  showByes: boolean;
  finished: number;
  total: number;
  onClose: () => void;
};

const MEDALS = [
  {
    accent: "bg-amber-400",
    card: "bg-gradient-to-b from-amber-400/15 to-transparent",
    badge: "bg-amber-400 text-zinc-950",
    points: "text-amber-300",
  },
  {
    accent: "bg-zinc-200",
    card: "bg-gradient-to-b from-zinc-300/10 to-transparent",
    badge: "bg-zinc-200 text-zinc-950",
    points: "text-zinc-200",
  },
  {
    accent: "bg-orange-500",
    card: "bg-gradient-to-b from-orange-400/10 to-transparent",
    badge: "bg-orange-500 text-white",
    points: "text-orange-300",
  },
];

/** Alturas dos degraus do pódio (2º à esquerda, 1º ao centro, 3º à direita). */
const PODIUM_HEIGHT = ["sm:h-72", "sm:h-60", "sm:h-52"];
const PODIUM_ORDER = ["sm:order-2", "sm:order-1", "sm:order-3"];

const cell = "px-3 py-3 text-center text-xl font-medium tabular-nums sm:text-2xl";
const head =
  "px-3 py-2 text-center text-xs font-semibold uppercase tracking-widest text-zinc-500";

/** Métrica em destaque no placar, conforme o critério de ordenação do torneio. */
const PRIMARY_METRIC: Record<
  RankingMode,
  { label: string; get: (stats: PlayerStats) => number; signed?: boolean }
> = {
  PONTOS: { label: "PTS", get: (stats) => stats.points },
  GAMES_PRO: { label: "GP", get: (stats) => stats.gamesFor },
  VITORIAS: { label: "V", get: (stats) => stats.wins },
  SALDO_GAMES: { label: "SG", get: (stats) => stats.gameDiff, signed: true },
};

function formatMetric(
  metric: (typeof PRIMARY_METRIC)[RankingMode],
  value: number,
): string {
  return metric.signed ? formatSigned(value) : String(value);
}

export function StandingsTvPanel({
  tournamentName,
  standings,
  config,
  showByes,
  finished,
  total,
  onClose,
}: StandingsTvPanelProps) {
  const [clock, setClock] = useState(() => new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 10_000);
    return () => clearInterval(timer);
  }, []);

  // Modo TV nunca mostra barra de rolagem: o conteúdo é medido e reduzido
  // (transform: scale) para caber inteiro na viewport.
  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const fit = () => {
      const ratio = Math.min(
        1,
        container.clientWidth / content.scrollWidth,
        container.clientHeight / content.scrollHeight,
      );
      setScale(ratio > 0 && Number.isFinite(ratio) ? ratio : 1);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Montagem única: o cleanup só roda ao fechar o modo TV (daí sair da tela
  // cheia). `onClose` vive numa ref para o efeito não re-executar quando o
  // pai re-renderiza (ex.: ao informar um resultado).
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Primeiro Esc só sai do fullscreen do navegador; o segundo fecha.
      if (document.fullscreenElement) return;
      onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      if (document.fullscreenElement) {
        void document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  };

  const podium = standings.slice(0, 3);
  const rest = standings.slice(3);
  const progress = total > 0 ? Math.round((finished / total) * 100) : 0;
  const metric = PRIMARY_METRIC[config.rankingMode];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Classificação de ${tournamentName} em modo TV`}
      ref={containerRef}
      className="fixed inset-0 z-50 overflow-hidden bg-zinc-950 text-zinc-50"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(63,63,70,0.35),transparent_60%)]" />

      <div
        ref={contentRef}
        className="relative mx-auto w-full max-w-6xl px-6 py-8 sm:px-10 sm:py-10"
        style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
      >
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-500">
              Classificação geral
            </p>
            <h1 className="mt-2 truncate text-4xl font-bold tracking-tight sm:text-6xl">
              {tournamentName}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-zinc-400 sm:text-base">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
                AO VIVO
              </span>
              <span>
                {FORMAT_LABEL[config.format]} · {finished}/{total} jogos
              </span>
              <span className="hidden sm:inline">
                {RANKING_MODE_LABEL[config.rankingMode]}
              </span>
            </div>
            <div className="mt-4 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p className="hidden font-mono text-3xl font-medium tabular-nums text-zinc-300 sm:block">
              {clock.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              aria-label={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}
              className="rounded-lg border border-white/15 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
            >
              {isFullscreen ? (
                <MinimizeIcon className="h-5 w-5" />
              ) : (
                <MaximizeIcon className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Fechar (Esc)"
              aria-label="Fechar modo TV"
              className="rounded-lg border border-white/15 bg-white/5 p-2.5 text-zinc-300 transition hover:bg-red-500/20 hover:text-red-200"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </header>

        {standings.length === 0 ? (
          <p className="mt-16 text-center text-2xl text-zinc-500">
            Nenhum atleta cadastrado.
          </p>
        ) : (
          <>
            <section className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-center sm:gap-4">
              {podium.map((entry, index) => {
                const medal = MEDALS[index];
                const nameSize =
                  index === 0 ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl";
                return (
                  <div
                    key={entry.playerId}
                    className={`relative flex flex-1 flex-col justify-end overflow-hidden rounded-2xl border border-white/10 p-5 ${medal.card} ${PODIUM_HEIGHT[index]} ${PODIUM_ORDER[index]}`}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-6 right-3 select-none text-[6rem] font-black leading-none text-white/5 sm:text-[8rem]"
                    >
                      {entry.position}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 top-0 h-1 ${medal.accent}`}
                    />

                    <div className="relative flex items-center gap-4">
                      <span
                        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-bold ${medal.badge}`}
                      >
                        {entry.position}
                      </span>
                      <p className={`min-w-0 flex-1 truncate font-semibold ${nameSize}`}>
                        {entry.name}
                      </p>
                    </div>
                    <div className="relative mt-4 flex items-end justify-between gap-3">
                      <p className="text-sm text-zinc-400 sm:text-base">
                        {entry.stats.wins}V {entry.stats.draws}E{" "}
                        {entry.stats.losses}D · SG{" "}
                        {formatSigned(entry.stats.gameDiff)}
                      </p>
                      <p
                        className={`text-3xl font-bold tabular-nums sm:text-4xl ${medal.points}`}
                      >
                        {formatMetric(metric, metric.get(entry.stats))}
                        <span className="ml-1 text-sm font-medium text-zinc-500">
                          {metric.label}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}
            </section>

            {rest.length > 0 ? (
              <section className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <table className="w-full min-w-[40rem]">
                  <thead className="border-b border-white/10">
                    <tr>
                      <th scope="col" className={head}>
                        #
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-widest text-zinc-500"
                      >
                        Atleta
                      </th>
                      <th scope="col" className={head}>
                        J
                      </th>
                      <th scope="col" className={head}>
                        V
                      </th>
                      <th scope="col" className={head}>
                        E
                      </th>
                      <th scope="col" className={head}>
                        D
                      </th>
                      {showByes ? (
                        <th scope="col" className={head}>
                          Desc.
                        </th>
                      ) : null}
                      <th scope="col" className={head}>
                        SG
                      </th>
                      <th scope="col" className={`${head} text-zinc-300`}>
                        {metric.label}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {rest.map((entry, index) => (
                      <tr
                        key={entry.playerId}
                        className={
                          index % 2 === 1 ? "bg-white/[0.03]" : undefined
                        }
                      >
                        <td className={`${cell} text-zinc-500`}>
                          {entry.position}
                        </td>
                        <td className="px-3 py-3 text-left text-xl font-semibold sm:text-2xl">
                          {entry.name}
                        </td>
                        <td className={cell}>{entry.stats.played}</td>
                        <td className={`${cell} text-emerald-300`}>
                          {entry.stats.wins}
                        </td>
                        <td className={cell}>{entry.stats.draws}</td>
                        <td className={`${cell} text-zinc-500`}>
                          {entry.stats.losses}
                        </td>
                        {showByes ? (
                          <td className={`${cell} text-zinc-500`}>
                            {entry.stats.byes}
                          </td>
                        ) : null}
                        <td className={cell}>
                          {formatSigned(entry.stats.gameDiff)}
                        </td>
                        <td className={`${cell} font-bold text-white`}>
                          {formatMetric(metric, metric.get(entry.stats))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ) : null}
          </>
        )}

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500">
          <span>
            Ordenado por {RANKING_MODE_LABEL[config.rankingMode]} · desempate
            pelos critérios configurados
          </span>
          <span>
            Atualiza automaticamente · Esc para sair
          </span>
        </footer>
      </div>
    </div>
  );
}
