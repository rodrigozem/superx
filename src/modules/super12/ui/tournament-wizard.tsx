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

type Draft = {
  name: string;
  format: Format;
  scheduleMode: ScheduleMode;
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

function emptyNames(count: number): string[] {
  return Array.from({ length: count }, () => "");
}

function initialDraft(): Draft {
  return {
    name: "",
    format: "SUPER12",
    scheduleMode: "COMPLETO",
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
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const labelClassName = "block text-sm font-medium text-zinc-700 dark:text-zinc-300";
const stepClassName =
  "rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-900 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-100";

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
                  ? "rounded-lg bg-zinc-900 px-3 py-1.5 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "rounded-lg border border-zinc-300 px-3 py-1.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
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
            <span className={labelClassName}>Formato</span>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setFormat(format)}
                  className={draft.format === format ? stepClassName.replace("border-zinc-300", "border-zinc-900 font-semibold") : stepClassName}
                >
                  {FORMAT_LABEL[format]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className={labelClassName}>Modo da tabela</span>
            <div className="flex flex-wrap gap-2">
              {modesFor(draft.format).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDraft({ ...draft, scheduleMode: mode })}
                  className={draft.scheduleMode === mode ? stepClassName.replace("border-zinc-300", "border-zinc-900 font-semibold") : stepClassName}
                >
                  {SCHEDULE_MODE_LABEL[mode]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="courts" className={labelClassName}>
                Quadras (1–6)
              </label>
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
              <label htmlFor="seed" className={labelClassName}>
                Seed do sorteio
              </label>
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
              <label htmlFor="ranking" className={labelClassName}>
                Critério principal
              </label>
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
          <div className="flex flex-wrap gap-2">
            {MATCH_FORMAT_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setMatchFormatKind(kind)}
                className={draft.matchFormat.kind === kind ? stepClassName.replace("border-zinc-300", "border-zinc-900 font-semibold") : stepClassName}
              >
                {describeMatchFormat(defaultOf(kind))}
              </button>
            ))}
          </div>

          {draft.matchFormat.kind === "SOMA_FIXA" ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label htmlFor="total" className={labelClassName}>
                  Soma de games
                </label>
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
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.matchFormat.permitirEmpate}
                  onChange={(event) =>
                    updateMatchFormat({ permitirEmpate: event.target.checked })
                  }
                />
                Permitir empate
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.matchFormat.decisivoContaGame}
                  onChange={(event) =>
                    updateMatchFormat({ decisivoContaGame: event.target.checked })
                  }
                />
                Decisivo conta como game
              </label>
            </div>
          ) : null}

          {draft.matchFormat.kind === "SET_ATE_N" ? (
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <label htmlFor="games" className={labelClassName}>
                  Games
                </label>
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
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.matchFormat.tiebreak}
                  onChange={(event) => updateMatchFormat({ tiebreak: event.target.checked })}
                />
                Tie-break
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={draft.matchFormat.difMinima2}
                  onChange={(event) => updateMatchFormat({ difMinima2: event.target.checked })}
                />
                Diferença mínima de 2
              </label>
            </div>
          ) : null}

          {draft.matchFormat.kind === "TEMPO" ? (
            <div className="space-y-2 sm:w-48">
              <label htmlFor="minutos" className={labelClassName}>
                Minutos
              </label>
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
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Voltar
        </button>

        {step < 2 ? (
          <button
            type="button"
            onClick={() => setStep((value) => value + 1)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Avançar
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900"
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
