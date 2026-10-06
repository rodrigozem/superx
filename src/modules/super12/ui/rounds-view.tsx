"use client";

import { useMemo, useState } from "react";

import type { MatchFormat, ScoreInput } from "@/modules/super12/domain";

import { clearScore, recordScore, type StoredMatch, type StoredTournament } from "@/modules/super12/data";

import { MATCH_STATUS_LABEL } from "./labels";
import { ScoreEditor } from "./score-editor";

type RoundsViewProps = {
  tournament: StoredTournament;
  matches: StoredMatch[];
};

type SubmitResult = { ok: boolean; error?: string };

export function RoundsView({ tournament, matches }: RoundsViewProps) {
  const rounds = useMemo(
    () => [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b),
    [matches],
  );
  const [round, setRound] = useState(rounds[0] ?? 1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const names = useMemo(
    () => new Map(tournament.players.map((player) => [player.id, player.name])),
    [tournament.players],
  );

  const roundMatches = useMemo(
    () => matches.filter((match) => match.round === round),
    [matches, round],
  );

  const byes = tournament.byesByRound[String(round)] ?? [];

  async function handleSubmit(matchId: string, input: ScoreInput): Promise<SubmitResult> {
    const result = await recordScore(matchId, input);
    if (result.ok) setEditingId(null);
    return { ok: result.ok, ...(result.ok ? {} : { error: result.error }) };
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Rodadas">
        {rounds.map((value) => {
          const done = matches.filter(
            (match) => match.round === value && match.status === "FINALIZADO",
          ).length;
          const total = matches.filter((match) => match.round === value).length;
          const active = value === round;

          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setRound(value);
                setEditingId(null);
              }}
              className={
                active
                  ? "rounded-lg bg-navy-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-navy-800"
                  : "rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
              }
            >
              R{value}
              <span className={active ? "ml-1.5 opacity-70" : "ml-1.5 text-zinc-400"}>
                {done}/{total}
              </span>
            </button>
          );
        })}
      </div>

      {byes.length > 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Descansam nesta rodada:{" "}
          <span className="font-medium text-navy-800 dark:text-navy-200">
            {byes.map((id) => names.get(id) ?? id).join(", ")}
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {roundMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            names={names}
            matchFormat={tournament.config.matchFormat}
            courtNames={tournament.config.courtNames}
            editing={editingId === match.id}
            onToggle={() =>
              setEditingId((current) => (current === match.id ? null : match.id))
            }
            onSubmit={(input) => handleSubmit(match.id, input)}
            onClear={async () => {
              await clearScore(match.id);
              setEditingId(null);
            }}
          />
        ))}
      </div>

      {roundMatches.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-navy-600">
          Nenhum jogo nesta rodada.
        </p>
      ) : null}
    </div>
  );
}

type MatchCardProps = {
  match: StoredMatch;
  names: Map<string, string>;
  matchFormat: MatchFormat;
  courtNames?: string[];
  editing: boolean;
  onToggle: () => void;
  onSubmit: (input: ScoreInput) => Promise<SubmitResult>;
  onClear: () => Promise<void>;
};

function MatchCard({
  match,
  names,
  matchFormat,
  courtNames,
  editing,
  onToggle,
  onSubmit,
  onClear,
}: MatchCardProps) {
  const teamA = match.teamA.map((id) => names.get(id) ?? id).join(" / ");
  const teamB = match.teamB.map((id) => names.get(id) ?? id).join(" / ");
  const played = match.gamesA !== undefined && match.gamesB !== undefined;
  const gamesA = match.gamesA ?? 0;
  const gamesB = match.gamesB ?? 0;
  const winnerA = played && gamesA > gamesB;
  const winnerB = played && gamesB > gamesA;
  const court = courtNames?.[match.court - 1] ?? `Quadra ${match.court}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-navy-800 dark:bg-navy-900">
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {court} · Turno {match.turn}
        </span>
        <span>{MATCH_STATUS_LABEL[match.status]}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span
          className={
            winnerA
              ? "text-sm font-semibold text-navy-900 dark:text-zinc-50"
              : "text-sm text-zinc-600 dark:text-zinc-300"
          }
        >
          {teamA}
        </span>
        <span className="shrink-0 rounded-md bg-zinc-100 px-2 py-1 text-sm font-semibold tabular-nums text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
          {played ? `${gamesA}x${gamesB}` : "—"}
        </span>
        <span
          className={
            winnerB
              ? "text-sm font-semibold text-navy-900 dark:text-zinc-50"
              : "text-sm text-zinc-600 dark:text-zinc-300"
          }
        >
          {teamB}
        </span>
      </div>

      <div className="mt-3">
        {editing ? (
          <ScoreEditor
            match={match}
            format={matchFormat}
            teamAName={teamA}
            teamBName={teamB}
            onSubmit={onSubmit}
            onClear={onClear}
          />
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-100 dark:bg-navy-800 px-3 py-1.5 text-sm font-medium text-navy-800 transition hover:bg-zinc-200 dark:border-navy-600 dark:text-zinc-200 dark:hover:bg-navy-700"
          >
            {played ? "Editar placar" : "Informar placar"}
          </button>
        )}
      </div>
    </div>
  );
}
