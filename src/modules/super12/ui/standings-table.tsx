import type { StandingEntry, TournamentConfig } from "@/modules/super12/domain";

import { formatPercent, formatSigned, RANKING_MODE_LABEL } from "./labels";

type StandingsTableProps = {
  standings: StandingEntry[];
  config: TournamentConfig;
  showByes: boolean;
};

const cellClassName = "px-3 py-2 text-right tabular-nums";
const headClassName =
  "px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-navy-600 dark:text-navy-300";

export function StandingsTable({
  standings,
  config,
  showByes,
}: StandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-navy-800 dark:bg-navy-900">
      <table className="w-full min-w-[46rem] text-sm">
        <thead className="border-b border-navy-200 bg-navy-100 dark:border-navy-800 dark:bg-navy-800/60">
          <tr>
            <th scope="col" className={`${cellClassName} ${headClassName}`}>
              #
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy-600 dark:text-navy-300"
            >
              Atleta
            </th>
            <th scope="col" className={headClassName}>
              J
            </th>
            <th scope="col" className={headClassName}>
              V
            </th>
            <th scope="col" className={headClassName}>
              E
            </th>
            <th scope="col" className={headClassName}>
              D
            </th>
            {showByes ? (
              <th scope="col" className={headClassName}>
                Desc.
              </th>
            ) : null}
            <th scope="col" className={headClassName}>
              GP
            </th>
            <th scope="col" className={headClassName}>
              GC
            </th>
            <th scope="col" className={headClassName}>
              SG
            </th>
            <th scope="col" className={headClassName}>
              Apr.
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-navy-600 dark:text-navy-300"
            >
              Desempate
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100 dark:divide-navy-800">
          {standings.map((entry) => (
            <tr key={entry.playerId}>
              <td className={`${cellClassName} font-semibold text-zinc-500`}>
                {entry.position}
              </td>
              <td className="px-3 py-2 font-medium text-navy-900 dark:text-zinc-50">
                {entry.name}
              </td>
              <td className={cellClassName}>{entry.stats.played}</td>
              <td className={cellClassName}>{entry.stats.wins}</td>
              <td className={cellClassName}>{entry.stats.draws}</td>
              <td className={cellClassName}>{entry.stats.losses}</td>
              {showByes ? (
                <td className={`${cellClassName} text-zinc-400`}>
                  {entry.stats.byes}
                </td>
              ) : null}
              <td className={cellClassName}>{entry.stats.gamesFor}</td>
              <td className={cellClassName}>{entry.stats.gamesAgainst}</td>
              <td className={cellClassName}>{formatSigned(entry.stats.gameDiff)}</td>
              <td className={cellClassName}>
                {formatPercent(entry.stats.gamesWinPct)}
              </td>
              <td className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400">
                {entry.tiebreak?.detail ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {standings.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">
          Nenhum atleta cadastrado.
        </p>
      ) : null}

      <p className="border-t border-zinc-200 px-4 py-3 text-xs text-zinc-500 dark:border-navy-800 dark:text-zinc-400">
        Ordenado por {RANKING_MODE_LABEL[config.rankingMode]} e, em caso de
        empate, pelos critérios configurados.
      </p>
    </div>
  );
}
