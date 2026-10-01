export type Pair = [number, number];

/**
 * Método do círculo (circle method) para n atletas (n par).
 * Retorna n-1 rodadas de emparelhamentos perfeitos, onde cada par de atletas
 * é parceiro exatamente uma vez.
 */
export function circleMethodPairs(n: number): Pair[][] {
  if (n % 2 !== 0) {
    throw new Error("circleMethodPairs requer um número par de atletas");
  }
  if (n < 2) return [];

  const positions = Array.from({ length: n }, (_, index) => index);
  const rounds: Pair[][] = [];

  for (let round = 0; round < n - 1; round += 1) {
    const pairs: Pair[] = [];
    for (let i = 0; i < n / 2; i += 1) {
      pairs.push([positions[i], positions[n - 1 - i]]);
    }
    rounds.push(pairs);

    // Mantém o primeiro fixo e gira os demais em uma posição.
    const fixed = positions[0];
    const rest = positions.slice(1);
    const last = rest.pop() as number;
    rest.unshift(last);
    positions.splice(0, positions.length, fixed, ...rest);
  }

  return rounds;
}

/** Todas as formas de dividir uma lista em grupos de 2 (perfect matchings). */
export function perfectMatchings<T>(items: readonly T[]): [T, T][][] {
  if (items.length === 0) return [[]];
  if (items.length % 2 !== 0) return [];

  const [first, ...rest] = items;
  const results: [T, T][][] = [];

  for (let i = 0; i < rest.length; i += 1) {
    const partner = rest[i];
    const remaining = rest.filter((_, index) => index !== i);
    for (const tail of perfectMatchings(remaining)) {
      results.push([[first, partner], ...tail]);
    }
  }

  return results;
}

export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
