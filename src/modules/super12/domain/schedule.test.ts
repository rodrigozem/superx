import { describe, expect, it } from "vitest";

import { generateSchedule, FORMAT_PLAYERS } from "./schedule";
import { createDefaultConfig, type Schedule } from "./types";

function makePlayers(n: number) {
  return Array.from({ length: n }, (_, index) => ({
    id: `P${index + 1}`,
    name: `Jogador ${index + 1}`,
  }));
}

function gamesPerPlayer(schedule: Schedule) {
  const counts = new Map<string, number>();
  for (const player of schedule.players) counts.set(player.id, 0);
  for (const match of schedule.matches) {
    for (const id of [...match.teamA, ...match.teamB]) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  return counts;
}

function assertNoDoubleBooking(schedule: Schedule) {
  for (const round of schedule.rounds) {
    const seen = new Set<string>();
    for (const match of round.matches) {
      for (const id of [...match.teamA, ...match.teamB]) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
  }
}

describe("generateSchedule — Super 8 completo", () => {
  const schedule = generateSchedule(
    createDefaultConfig({ format: "SUPER8", scheduleMode: "COMPLETO", courts: 2 }),
    makePlayers(8),
    42,
  );

  it("gera 7 rodadas / 14 jogos / 2 por rodada", () => {
    expect(schedule.rounds).toHaveLength(7);
    expect(schedule.matches).toHaveLength(14);
    for (const round of schedule.rounds) expect(round.matches).toHaveLength(2);
  });

  it("cumpre os invariantes (sem dupla repetida, jogos iguais)", () => {
    assertNoDoubleBooking(schedule);
    expect(schedule.metrics.partnerRepeatPairs).toBe(0);
    const counts = [...gamesPerPlayer(schedule).values()];
    expect(Math.min(...counts)).toBe(7);
    expect(Math.max(...counts)).toBe(7);
    expect(schedule.metrics.byesPerPlayerMax).toBe(0);
  });

  it("é determinístico", () => {
    const again = generateSchedule(
      createDefaultConfig({ format: "SUPER8", scheduleMode: "COMPLETO", courts: 2 }),
      makePlayers(8),
      42,
    );
    expect(JSON.stringify(again)).toBe(JSON.stringify(schedule));
  });
});

describe("generateSchedule — Super 12 completo", () => {
  const schedule = generateSchedule(
    createDefaultConfig({ format: "SUPER12", scheduleMode: "COMPLETO", courts: 3 }),
    makePlayers(12),
    7,
  );

  it("gera 11 rodadas / 33 jogos / 3 por rodada", () => {
    expect(schedule.rounds).toHaveLength(11);
    expect(schedule.matches).toHaveLength(33);
    for (const round of schedule.rounds) expect(round.matches).toHaveLength(3);
  });

  it("cada atleta joga 11 jogos, com parceiros distintos", () => {
    assertNoDoubleBooking(schedule);
    expect(schedule.metrics.partnerRepeatPairs).toBe(0);
    const counts = [...gamesPerPlayer(schedule).values()];
    expect(Math.min(...counts)).toBe(11);
    expect(Math.max(...counts)).toBe(11);
  });
});

describe("generateSchedule — Super 12 reduzido", () => {
  const schedule = generateSchedule(
    createDefaultConfig({
      format: "SUPER12",
      scheduleMode: "REDUZIDO",
      rounds: 6,
      courts: 2,
    }),
    makePlayers(12),
    99,
  );

  it("gera 6 rodadas / 18 jogos / parceiros distintos", () => {
    expect(schedule.rounds).toHaveLength(6);
    expect(schedule.matches).toHaveLength(18);
    assertNoDoubleBooking(schedule);
    expect(schedule.metrics.partnerRepeatPairs).toBe(0);
    const counts = [...gamesPerPlayer(schedule).values()];
    expect(Math.min(...counts)).toBe(6);
    expect(Math.max(...counts)).toBe(6);
  });
});

describe("generateSchedule — Super 10", () => {
  it("modo Equilibrado: 10 rodadas, todos jogam 8 e descansam 2", () => {
    const schedule = generateSchedule(
      createDefaultConfig({
        format: "SUPER10",
        scheduleMode: "EQUILIBRADO",
        courts: 2,
      }),
      makePlayers(10),
      5,
    );

    expect(schedule.rounds).toHaveLength(10);
    expect(schedule.matches).toHaveLength(20);
    assertNoDoubleBooking(schedule);
    expect(schedule.metrics.partnerRepeatPairs).toBe(0);
    const counts = [...gamesPerPlayer(schedule).values()];
    expect(Math.min(...counts)).toBe(8);
    expect(Math.max(...counts)).toBe(8);
    expect(schedule.metrics.byesPerPlayerMin).toBe(2);
    expect(schedule.metrics.byesPerPlayerMax).toBe(2);
  });

  it("modo Parceiro de todos: 9 rodadas, 18 jogos, parceiros distintos", () => {
    const schedule = generateSchedule(
      createDefaultConfig({
        format: "SUPER10",
        scheduleMode: "PARCEIRO_DE_TODOS",
        courts: 2,
      }),
      makePlayers(10),
      5,
    );

    expect(schedule.rounds).toHaveLength(9);
    expect(schedule.matches).toHaveLength(18);
    assertNoDoubleBooking(schedule);
    expect(schedule.metrics.partnerRepeatPairs).toBe(0);
    const counts = [...gamesPerPlayer(schedule).values()];
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(7);
    expect(Math.max(...counts)).toBeLessThanOrEqual(8);
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });
});

describe("generateSchedule — quadras e turnos", () => {
  it("com 1 quadra no Super 12, distribui 3 turnos por rodada", () => {
    const schedule = generateSchedule(
      createDefaultConfig({ format: "SUPER12", scheduleMode: "COMPLETO", courts: 1 }),
      makePlayers(12),
      3,
    );
    for (const round of schedule.rounds) {
      const turns = new Set(round.matches.map((match) => match.turn));
      expect(turns.size).toBe(3);
      for (const match of round.matches) expect(match.court).toBe(1);
    }
    assertNoDoubleBooking(schedule);
  });

  it("rejeita número de atletas incompatível com o formato", () => {
    expect(() =>
      generateSchedule(createDefaultConfig({ format: "SUPER8" }), makePlayers(10)),
    ).toThrow();
    expect(FORMAT_PLAYERS.SUPER12).toBe(12);
  });
});

describe("generateSchedule — Super 10 em varredura determinística", () => {
  const modes = ["EQUILIBRADO", "PARCEIRO_DE_TODOS"] as const;

  for (const scheduleMode of modes) {
    it(`${scheduleMode}: equilibra jogos e nunca repete parceiro (seeds 0–199)`, () => {
      for (let seed = 0; seed <= 199; seed += 1) {
        const schedule = generateSchedule(
          createDefaultConfig({
            format: "SUPER10",
            scheduleMode,
            courts: ((seed % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
          }),
          makePlayers(10),
          seed,
        );

        const counts = [...gamesPerPlayer(schedule).values()];
        const diff = Math.max(...counts) - Math.min(...counts);

        expect(
          diff,
          `seed ${seed}: jogos ${counts.join(",")}`,
        ).toBeLessThanOrEqual(1);
        expect(schedule.metrics.partnerRepeatPairs, `seed ${seed}`).toBe(0);
        assertNoDoubleBooking(schedule);
      }
    });
  }
});
