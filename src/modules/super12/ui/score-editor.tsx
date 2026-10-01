"use client";

import { useState } from "react";

import {
  validScoreChips,
  validateScore,
  type MatchFormat,
  type ScoreInput,
  type TeamSide,
} from "@/modules/super12/domain";

import type { StoredMatch } from "@/modules/super12/data";

type SubmitResult = { ok: boolean; error?: string };

type ScoreEditorProps = {
  match: StoredMatch;
  format: MatchFormat;
  teamAName: string;
  teamBName: string;
  onSubmit: (input: ScoreInput) => Promise<SubmitResult>;
  onClear: () => Promise<void>;
};

function needsTiebreak(format: MatchFormat, gamesA: number, gamesB: number) {
  if (gamesA !== gamesB) return false;
  if (format.kind === "PRO_SET") return true;
  if (format.kind === "SET_ATE_N") return format.tiebreak;
  return false;
}

function needsDecisive(format: MatchFormat, gamesA: number, gamesB: number) {
  return (
    format.kind === "SOMA_FIXA" &&
    !format.permitirEmpate &&
    gamesA === gamesB
  );
}

const stepperClassName =
  "h-11 w-11 rounded-lg border border-zinc-300 text-xl font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800";
const scoreClassName =
  "h-11 w-14 rounded-lg border border-zinc-300 bg-white text-center text-lg font-semibold tabular-nums text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";
const inputClassName =
  "w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50";

export function ScoreEditor({
  match,
  format,
  teamAName,
  teamBName,
  onSubmit,
  onClear,
}: ScoreEditorProps) {
  const [gamesA, setGamesA] = useState(match.gamesA ?? 0);
  const [gamesB, setGamesB] = useState(match.gamesB ?? 0);
  const [decisivoPara, setDecisivoPara] = useState<TeamSide | undefined>(
    match.decisivoPara,
  );
  const [tiebreakA, setTiebreakA] = useState(match.tiebreakA ?? 0);
  const [tiebreakB, setTiebreakB] = useState(match.tiebreakB ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const chips = validScoreChips(format);
  const showTiebreak = needsTiebreak(format, gamesA, gamesB);
  const showDecisive = needsDecisive(format, gamesA, gamesB);
  const untouched = gamesA === 0 && gamesB === 0;

  const validation = validateScore(format, {
    gamesA,
    gamesB,
    decisivoPara: showDecisive ? decisivoPara : undefined,
    tiebreakA: showTiebreak ? tiebreakA : undefined,
    tiebreakB: showTiebreak ? tiebreakB : undefined,
  });

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await onSubmit({
      gamesA,
      gamesB,
      decisivoPara: showDecisive ? decisivoPara : undefined,
      tiebreakA: showTiebreak ? tiebreakA : undefined,
      tiebreakB: showTiebreak ? tiebreakB : undefined,
    });
    setSaving(false);
    if (!result.ok) setError(result.error ?? "Placar inválido.");
  }

  async function handleClear() {
    setSaving(true);
    await onClear();
    setSaving(false);
    setError(null);
  }

  return (
    <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1 text-center">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {teamAName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              className={stepperClassName}
              onClick={() => setGamesA((value) => Math.max(0, value - 1))}
              aria-label="Diminuir games do time A"
            >
              −
            </button>
            <input
              className={scoreClassName}
              type="number"
              min={0}
              inputMode="numeric"
              value={gamesA}
              onChange={(event) => setGamesA(Math.max(0, Number(event.target.value) || 0))}
              aria-label={`Games do time A (${teamAName})`}
            />
            <button
              type="button"
              className={stepperClassName}
              onClick={() => setGamesA((value) => value + 1)}
              aria-label="Aumentar games do time A"
            >
              +
            </button>
          </div>
        </div>

        <span className="pb-3 text-sm font-semibold text-zinc-400">x</span>

        <div className="flex-1 text-center">
          <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {teamBName}
          </p>
          <div className="mt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              className={stepperClassName}
              onClick={() => setGamesB((value) => Math.max(0, value - 1))}
              aria-label="Diminuir games do time B"
            >
              −
            </button>
            <input
              className={scoreClassName}
              type="number"
              min={0}
              inputMode="numeric"
              value={gamesB}
              onChange={(event) => setGamesB(Math.max(0, Number(event.target.value) || 0))}
              aria-label={`Games do time B (${teamBName})`}
            />
            <button
              type="button"
              className={stepperClassName}
              onClick={() => setGamesB((value) => value + 1)}
              aria-label="Aumentar games do time B"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {chips.map((chip) => {
            const active = chip.gamesA === gamesA && chip.gamesB === gamesB;
            return (
              <button
                key={`${chip.gamesA}x${chip.gamesB}`}
                type="button"
                onClick={() => {
                  setGamesA(chip.gamesA);
                  setGamesB(chip.gamesB);
                  setError(null);
                }}
                className={
                  active
                    ? "rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }
              >
                {chip.gamesA}x{chip.gamesB}
              </button>
            );
          })}
        </div>
      ) : null}

      {showTiebreak ? (
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <span>Tie-break</span>
          <input
            className={inputClassName}
            type="number"
            min={0}
            inputMode="numeric"
            value={tiebreakA}
            onChange={(event) => setTiebreakA(Math.max(0, Number(event.target.value) || 0))}
            aria-label="Tie-break do time A"
          />
          <span>x</span>
          <input
            className={inputClassName}
            type="number"
            min={0}
            inputMode="numeric"
            value={tiebreakB}
            onChange={(event) => setTiebreakB(Math.max(0, Number(event.target.value) || 0))}
            aria-label="Tie-break do time B"
          />
        </div>
      ) : null}

      {showDecisive ? (
        <fieldset className="flex items-center justify-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
          <legend className="sr-only">Ponto decisivo</legend>
          <span>Venceu o decisivo:</span>
          {(["A", "B"] as const).map((side) => (
            <label key={side} className="flex items-center gap-1.5">
              <input
                type="radio"
                name={`decisivo-${match.id}`}
                checked={decisivoPara === side}
                onChange={() => setDecisivoPara(side)}
              />
              {side === "A" ? teamAName : teamBName}
            </label>
          ))}
        </fieldset>
      ) : null}

      {!validation.ok && !untouched ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {validation.error}
        </p>
      ) : null}
      {error ? (
        <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={untouched || !validation.ok || saving}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {saving ? "Salvando..." : "Salvar placar"}
        </button>
        {match.gamesA !== undefined ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Limpar
          </button>
        ) : null}
      </div>
    </div>
  );
}
