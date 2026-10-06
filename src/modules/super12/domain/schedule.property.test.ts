import fc from "fast-check";
import { describe, it } from "vitest";

import { generateSchedule } from "./schedule";
import { createDefaultConfig, type Schedule } from "./types";

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, index) => ({
    id: `P${index + 1}`,
    name: `Jogador ${index + 1}`,
  }));
}

function noDoubleBooking(schedule: Schedule): boolean {
  for (const round of schedule.rounds) {
    const seen = new Set<string>();
    for (const match of round.matches) {
      for (const id of [...match.teamA, ...match.teamB]) {
        if (seen.has(id)) return false;
        seen.add(id);
      }
    }
  }
  return true;
}

function gamesPerPlayer(schedule: Schedule): number[] {
  const counts = new Map<string, number>();
  for (const player of schedule.players) counts.set(player.id, 0);
  for (const match of schedule.matches) {
    for (const id of [...match.teamA, ...match.teamB]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return [...counts.values()];
}

/** Nº de pares de atletas que nunca se enfrentaram como adversários. */
function uncoveredPairs(schedule: Schedule): number {
  const met = new Set<string>();
  for (const match of schedule.matches) {
    for (const a of match.teamA) {
      for (const b of match.teamB) {
        met.add(a < b ? `${a}:${b}` : `${b}:${a}`);
      }
    }
  }
  const n = schedule.players.length;
  return (n * (n - 1)) / 2 - met.size;
}

describe("generateSchedule — propriedades", () => {
  it("Super 8/12: invariantes para qualquer seed e nº de quadras", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("SUPER8" as const, "SUPER12" as const),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 6 }),
        (format, seed, courts) => {
          const n = format === "SUPER8" ? 8 : 12;
          const schedule = generateSchedule(
            createDefaultConfig({ format, scheduleMode: "COMPLETO", courts }),
            makePlayers(n),
            seed,
          );

          if (!noDoubleBooking(schedule)) return false;
          if (schedule.metrics.partnerRepeatPairs !== 0) return false;
          if (uncoveredPairs(schedule) > 0) return false;
          if ((schedule.metrics.opponentMeetingHistogram[0] ?? 0) > 0) {
            return false;
          }
          const counts = gamesPerPlayer(schedule);
          return counts.every((value) => value === n - 1);
        },
      ),
      { numRuns: 40, seed: 20260930 },
    );
  }, 60_000);

  it("Super 10: jogos equilibrados e sem dupla marcação em qualquer modo", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("EQUILIBRADO" as const, "PARCEIRO_DE_TODOS" as const),
        fc.integer({ min: 0, max: 500_000 }),
        fc.integer({ min: 1, max: 6 }),
        (scheduleMode, seed, courts) => {
          const schedule = generateSchedule(
            createDefaultConfig({ format: "SUPER10", scheduleMode, courts }),
            makePlayers(10),
            seed,
          );

          if (!noDoubleBooking(schedule)) return false;
          const counts = gamesPerPlayer(schedule);
          const diff = Math.max(...counts) - Math.min(...counts);
          if (diff > 1) return false;
          if (uncoveredPairs(schedule) > 0) return false;
          if (!schedule.metrics.relaxed && schedule.metrics.partnerRepeatPairs !== 0) {
            return false;
          }
          return true;
        },
      ),
      { numRuns: 120, seed: 20260930 },
    );
  }, 60_000);

  it("é determinístico (mesma seed ⇒ mesma tabela)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 6 }),
        (seed, courts) => {
          const config = createDefaultConfig({
            format: "SUPER12",
            scheduleMode: "COMPLETO",
            courts,
          });
          const first = generateSchedule(config, makePlayers(12), seed);
          const second = generateSchedule(config, makePlayers(12), seed);
          return JSON.stringify(first) === JSON.stringify(second);
        },
      ),
      { numRuns: 10, seed: 20260930 },
    );
  });
});
