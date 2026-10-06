"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  FORMAT_PLAYERS,
  type Format,
  type MatchFormat,
  type RankingMode,
  type ScheduleMode,
} from "@/modules/super12/domain";

import { createTournament, getDb } from "@/modules/super12/data";

import {
  describeMatchFormat,
  FORMAT_LABEL,
  RANKING_MODE_LABEL,
  SCHEDULE_MODE_LABEL,
} from "./labels";
import { HelpTip } from "./help-tip";

type Draft = {
  name: string;
  format: Format;
  scheduleMode: ScheduleMode;
  rounds: number;
  courts: number;
  matchFormat: MatchFormat;
  rankingMode: RankingMode;
  seed: number;
  players: string[];
};

const FORMATS: Format[] = ["SUPER8", "SUPER10", "SUPER12"];
const RANKING_MODES: RankingMode[] = ["VITORIAS", "PONTOS", "SALDO_GAMES", "GAMES_PRO"];

const MATCH_FORMAT_KINDS = [
  "SOMA_FIXA",
  "SET_ATE_N",
  "PRO_SET",
  "TEMPO",
  "LIVRE",
] as const;

type MatchFormatKind = (typeof MATCH_FORMAT_KINDS)[number];

function modesFor(format: Format): ScheduleMode[] {
  return format === "SUPER10" ? ["EQUILIBRADO", "PARCEIRO_DE_TODOS"] : ["COMPLETO", "REDUZIDO"];
}

/** Rodadas da tabela "todos contra todos" em cada formato. */
const FULL_ROUNDS: Record<Format, number> = {
  SUPER8: 7,
  SUPER10: 10,
  SUPER12: 11,
};

/** Padrão do campo Rodadas no modo Reduzido: metade da tabela completa. */
function defaultRounds(format: Format): number {
  return Math.ceil(FULL_ROUNDS[format] / 2);
}

const FORMAT_HELP =
  "Quantos atletas o torneio exige: Super 8 = 8, Super 10 = 10, Super 12 = 12. A tabela completa (todos contra todos) tem 7 rodadas no Super 8 e 11 no Super 12; o Super 10 usa os modos Equilibrado e Parceiro de todos.";

const SCHEDULE_HELP: Record<Format, string> = {
  SUPER8:
    "Completo: todos contra todos — 7 rodadas e 14 jogos. Reduzido: você escolhe de 1 a 7 rodadas e o sistema mantém as que melhor equilibram os confrontos e os descansos.",
  SUPER10:
    "Equilibrado: 10 rodadas; cada atleta joga 8 e descansa exatamente 2, com parceiros distintos. Parceiro de todos: 9 rodadas; cada par de atletas vira parceiro uma vez, 1 dupla descansa por rodada e cada atleta joga 7 ou 8 jogos.",
  SUPER12:
    "Completo: todos contra todos — 11 rodadas e 33 jogos. Reduzido: você escolhe de 1 a 11 rodadas e o sistema mantém as que melhor equilibram os confrontos e os descansos.",
};

const COURTS_HELP =
  "De 1 a 6 quadras usadas ao mesmo tempo. Os jogos de cada rodada são distribuídos entre elas; mais quadras significam mais jogos simultâneos.";

const SEED_HELP =
  "Mesma seed gera sempre a mesma tabela: ela controla o sorteio de quadras, de parceiros e a ordem do desempate por sorteio. Troque o número para embaralhar de novo.";

const RANKING_HELP =
  "Como a classificação é ordenada antes dos desempates: Vitórias, Pontos (pontuação de vitória/empate/derrota do torneio), Saldo de games ou Games pró. No empate seguem, nesta ordem: saldo de games, games pró, confronto direto, aproveitamento de games, mini-classificação e sorteio.";

const MATCH_KINDS_HELP =
  "Soma fixa: a soma dos games fecha no total (6 → 6x0, 5x1, 3x3). Set até N: o set vai até N games e empate só vale com tie-break. Pro Set: até 8 games com diferença de 2; 8x8 decide no tie-break. Tempo: o tempo é informativo e o placar é livre. Livre: qualquer placar é aceito.";

const SOMA_TOTAL_HELP =
  "Total obrigatório da soma dos games em cada jogo. Com 6, os placares válidos são 6x0, 5x1, 4x2 e 3x3.";

const EMPATE_HELP =
  "Marcado, um placar empatado (ex.: 3x3) é válido. Desmarcado, ao registrar o jogo será obrigatório informar quem venceu o ponto decisivo.";

const DECISIVO_HELP =
  "Quando o jogo termina empatado e há ponto decisivo: marcado, ele soma +1 game no placar (ex.: 4x3); desmarcado, o placar fica 3x3 e só o vencedor do decisivo é registrado.";

const SET_GAMES_HELP =
  "Primeiro a chegar a N games vence o set (ex.: 6 → vence quem fizer 6 games).";

const TIEBREAK_HELP =
  "Permite o set empatado no total (ex.: 6x6), decidido no tie-break: mínimo 7 pontos e diferença de 2 (ex.: 8x6). Desmarcado, o set não aceita empate.";

const DIF_MINIMA_HELP =
  "Com a opção, o vencedor precisa vencer por 2 games de vantagem (ex.: 6x4 ou 7x5). Sem ela, o set termina exatamente em N x X (ex.: 6x5 vale).";

const MINUTOS_HELP =
  "Duração da partida em minutos. É informativa — aparece na descrição do formato; o placar lançado é livre.";

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

function initialDraft(): Draft {
  return {
    name: "",
    format: "SUPER12",
    scheduleMode: "COMPLETO",
    rounds: defaultRounds("SUPER12"),
    courts: 3,
    matchFormat: {
      kind: "SOMA_FIXA",
      total: 6,
      permitirEmpate: true,
      decisivoContaGame: true,
    },
    rankingMode: "VITORIAS",
    seed: Math.floor(Math.random() * 900_000) + 100_000,
    players: emptyNames(FORMAT_PLAYERS.SUPER12),
  };
}

const fieldClassName =
  "w-full rounded-lg border border-zinc-200 bg-field px-3 py-2.5 text-sm text-navy-900 outline-none transition focus:border-crimson-500 focus:ring-2 focus:ring-crimson-500/15 dark:border-navy-600 dark:bg-navy-950 dark:text-zinc-50";
const labelClassName =
  "block text-sm font-semibold text-navy-800 dark:text-navy-200";
const stepClassName =
  "rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-navy-800 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-navy-600 dark:bg-navy-800 dark:text-zinc-200 dark:hover:bg-navy-700";
const activeStepClassName =
  "rounded-lg border border-transparent bg-navy-900 px-3 py-2 text-sm font-semibold text-white transition dark:bg-navy-700";

export function TournamentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const expected = FORMAT_PLAYERS[draft.format];

  function setFormat(format: Format) {
    setDraft((current) => ({
      ...current,
      format,
      scheduleMode: modesFor(format)[0],
      rounds: defaultRounds(format),
      players: resize(current.players, FORMAT_PLAYERS[format]),
    }));
  }

  function setMatchFormatKind(kind: MatchFormatKind) {
    setDraft((current) => ({
      ...current,
      matchFormat:
        kind === "SOMA_FIXA"
          ? { kind, total: 6, permitirEmpate: true, decisivoContaGame: true }
          : kind === "SET_ATE_N"
            ? { kind, games: 6, tiebreak: true, difMinima2: false }
            : kind === "PRO_SET"
              ? { kind, games: 8 }
              : kind === "TEMPO"
                ? { kind, minutos: 20 }
                : { kind: "LIVRE" },
    }));
  }

  function updateMatchFormat(patch: Partial<MatchFormat>) {
    setDraft((current) => ({
      ...current,
      matchFormat: { ...current.matchFormat, ...patch } as MatchFormat,
    }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    setErrors({});

    const result = await createTournament(
      {
        name: draft.name,
        format: draft.format,
        scheduleMode: draft.scheduleMode,
        rounds: draft.rounds,
        courts: draft.courts,
        matchFormat: draft.matchFormat,
        rankingMode: draft.rankingMode,
        seed: draft.seed,
        players: draft.players.map((name) => ({ name })),
      },
      getDb(),
    );

    setSubmitting(false);

    if (result.ok) {
      router.push(`/dashboard/torneios/${result.data.id}`);
      return;
    }

    setErrors(result.fieldErrors ?? { form: result.error });
  }

  return (
    <div className="space-y-6">
      <ol className="flex flex-wrap gap-2 text-sm">
        {["Dados", "Formato do jogo", "Atletas"].map((label, index) => (
          <li key={label}>
            <span
              className={
                index === step
                  ? "rounded-lg bg-navy-900 px-3 py-1.5 font-semibold text-white dark:bg-navy-700"
                  : "rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-navy-700 dark:border-navy-600 dark:bg-navy-800 dark:text-navy-200"
              }
            >
              {index + 1}. {label}
            </span>
          </li>
        ))}
      </ol>

      {errors.form ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">
          {errors.form}
        </p>
      ) : null}

      {step === 0 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="name" className={labelClassName}>
              Nome do torneio
            </label>
            <input
              id="name"
              className={fieldClassName}
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Ex.: Super 12 — Liga interna"
            />
            {errors.name ? (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className={labelClassName}>Formato</span>
              <HelpTip label="Formato" text={FORMAT_HELP} />
            </div>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setFormat(format)}
                  className={draft.format === format ? activeStepClassName : stepClassName}
                >
                  {FORMAT_LABEL[format]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className={labelClassName}>Modo da tabela</span>
              <HelpTip
                label="Modo da tabela"
                text={SCHEDULE_HELP[draft.format]}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {modesFor(draft.format).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDraft({ ...draft, scheduleMode: mode })}
                  className={draft.scheduleMode === mode ? activeStepClassName : stepClassName}
                >
                  {SCHEDULE_MODE_LABEL[mode]}
                </button>
              ))}
            </div>

            {draft.scheduleMode === "REDUZIDO" ? (
              <div className="max-w-44 space-y-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <label htmlFor="rounds" className={labelClassName}>
                    Rodadas
                  </label>
                  <HelpTip
                    label="Rodadas"
                    text={`Quantas rodadas da tabela reduzida serão geradas, de 1 a ${FULL_ROUNDS[draft.format]}. O sistema escolhe as rodadas que melhor equilibram os confrontos e os descansos.`}
                  />
                </div>
                <input
                  id="rounds"
                  type="number"
                  min={1}
                  max={FULL_ROUNDS[draft.format]}
                  className={fieldClassName}
                  value={draft.rounds}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      rounds: Math.min(
                        FULL_ROUNDS[draft.format],
                        Math.max(1, Number(event.target.value) || 1),
                      ),
                    })
                  }
                />
                {errors.rounds ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors.rounds}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label htmlFor="courts" className={labelClassName}>
                  Quadras (1–6)
                </label>
                <HelpTip label="Quadras" text={COURTS_HELP} />
              </div>
              <input
                id="courts"
                type="number"
                min={1}
                max={6}
                className={fieldClassName}
                value={draft.courts}
                onChange={(event) =>
                  setDraft({ ...draft, courts: Number(event.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label htmlFor="seed" className={labelClassName}>
                  Seed do sorteio
                </label>
                <HelpTip label="Seed do sorteio" text={SEED_HELP} />
              </div>
              <input
                id="seed"
                type="number"
                min={1}
                className={fieldClassName}
                value={draft.seed}
                onChange={(event) =>
                  setDraft({ ...draft, seed: Number(event.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label htmlFor="ranking" className={labelClassName}>
                  Critério principal
                </label>
                <HelpTip label="Critério principal" text={RANKING_HELP} />
              </div>
              <select
                id="ranking"
                className={fieldClassName}
                value={draft.rankingMode}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    rankingMode: event.target.value as RankingMode,
                  })
                }
              >
                {RANKING_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {RANKING_MODE_LABEL[mode]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className={labelClassName}>Formato do jogo</span>
              <HelpTip label="Formato do jogo" text={MATCH_KINDS_HELP} />
            </div>
            <div className="flex flex-wrap gap-2">
              {MATCH_FORMAT_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setMatchFormatKind(kind)}
                  className={draft.matchFormat.kind === kind ? activeStepClassName : stepClassName}
                >
                  {describeMatchFormat(defaultOf(kind))}
                </button>
              ))}
            </div>
          </div>

          {draft.matchFormat.kind === "SOMA_FIXA" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <label htmlFor="total" className={labelClassName}>
                    Soma de games
                  </label>
                  <HelpTip label="Soma de games" text={SOMA_TOTAL_HELP} />
                </div>
                <input
                  id="total"
                  type="number"
                  min={1}
                  max={30}
                  className={fieldClassName}
                  value={draft.matchFormat.total}
                  onChange={(event) =>
                    updateMatchFormat({ total: Number(event.target.value) || 1 })
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label className="flex items-center gap-2 text-sm text-navy-800 dark:text-navy-200">
                  <input
                    type="checkbox"
                    checked={draft.matchFormat.permitirEmpate}
                    onChange={(event) =>
                      updateMatchFormat({ permitirEmpate: event.target.checked })
                    }
                  />
                  Permitir empate
                </label>
                <HelpTip label="Permitir empate" text={EMPATE_HELP} />
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label className="flex items-center gap-2 text-sm text-navy-800 dark:text-navy-200">
                  <input
                    type="checkbox"
                    checked={draft.matchFormat.decisivoContaGame}
                    onChange={(event) =>
                      updateMatchFormat({ decisivoContaGame: event.target.checked })
                    }
                  />
                  Decisivo conta como game
                </label>
                <HelpTip
                  label="Decisivo conta como game"
                  text={DECISIVO_HELP}
                />
              </div>
            </div>
          ) : null}

          {draft.matchFormat.kind === "SET_ATE_N" ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  <label htmlFor="games" className={labelClassName}>
                    Games
                  </label>
                  <HelpTip label="Games" text={SET_GAMES_HELP} />
                </div>
                <input
                  id="games"
                  type="number"
                  min={1}
                  max={15}
                  className={fieldClassName}
                  value={draft.matchFormat.games}
                  onChange={(event) =>
                    updateMatchFormat({ games: Number(event.target.value) || 1 })
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label className="flex items-center gap-2 text-sm text-navy-800 dark:text-navy-200">
                  <input
                    type="checkbox"
                    checked={draft.matchFormat.tiebreak}
                    onChange={(event) => updateMatchFormat({ tiebreak: event.target.checked })}
                  />
                  Tie-break
                </label>
                <HelpTip label="Tie-break" text={TIEBREAK_HELP} />
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label className="flex items-center gap-2 text-sm text-navy-800 dark:text-navy-200">
                  <input
                    type="checkbox"
                    checked={draft.matchFormat.difMinima2}
                    onChange={(event) => updateMatchFormat({ difMinima2: event.target.checked })}
                  />
                  Diferença mínima de 2
                </label>
                <HelpTip label="Diferença mínima de 2" text={DIF_MINIMA_HELP} />
              </div>
            </div>
          ) : null}

          {draft.matchFormat.kind === "TEMPO" ? (
            <div className="space-y-2 sm:w-48">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <label htmlFor="minutos" className={labelClassName}>
                  Minutos
                </label>
                <HelpTip label="Minutos" text={MINUTOS_HELP} />
              </div>
              <input
                id="minutos"
                type="number"
                min={1}
                max={180}
                className={fieldClassName}
                value={draft.matchFormat.minutos}
                onChange={(event) =>
                  updateMatchFormat({ minutos: Number(event.target.value) || 1 })
                }
              />
            </div>
          ) : null}

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Formato selecionado: {describeMatchFormat(draft.matchFormat)}.
          </p>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Informe os {expected} atletas. A ordem influenceia apenas a
            apresentação; o sorteio usa a seed.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {draft.players.map((name, index) => (
              <div key={index} className="space-y-1">
                <label htmlFor={`player-${index}`} className={labelClassName}>
                  Atleta {index + 1}
                </label>
                <input
                  id={`player-${index}`}
                  className={fieldClassName}
                  value={name}
                  onChange={(event) => {
                    const players = [...draft.players];
                    players[index] = event.target.value;
                    setDraft({ ...draft, players });
                  }}
                />
                {errors[`players.${index}.name`] ? (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {errors[`players.${index}.name`]}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {errors.players ? (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.players}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((value) => Math.max(0, value - 1))}
          disabled={step === 0}
          className="rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-4 py-2 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 disabled:opacity-40 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
        >
          Voltar
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((value) => value + 1)}
            className="rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-700 dark:bg-crimson-600 dark:text-white"
          >
            Avançar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-crimson-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-crimson-700 disabled:opacity-40 dark:bg-crimson-600 dark:text-white"
          >
            {submitting ? "Gerando tabela…" : "Gerar tabela"}
          </button>
        )}
      </div>
    </div>
  );
}

function resize(players: string[], size: number): string[] {
  if (players.length === size) return players;
  return Array.from({ length: size }, (_, index) => players[index] ?? "");
}

function defaultOf(kind: MatchFormatKind): MatchFormat {
  switch (kind) {
    case "SOMA_FIXA":
      return { kind, total: 6, permitirEmpate: true, decisivoContaGame: true };
    case "SET_ATE_N":
      return { kind, games: 6, tiebreak: true, difMinima2: false };
    case "PRO_SET":
      return { kind, games: 8 };
    case "TEMPO":
      return { kind, minutos: 20 };
    case "LIVRE":
      return { kind };
  }
}
