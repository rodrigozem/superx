import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const DEFAULT_DIRECTORY = "data";
const DEFAULT_FILE = "app.db";

/**
 * Caminho do arquivo SQLite.
 *
 * Por padrão fica em `data/app.db`, dentro da pasta do projeto (desenvolvimento
 * local). Em hospedagens que sobrescrevem a pasta do app a cada deploy — como a
 * Hostinger, que redeploya `~/domains/<dominio>/nodejs` — use `DB_PATH` para
 * apontar para fora, garantindo que os usuários cadastrados sobrevivam:
 *
 *   DB_PATH=/home/USER/dados-sistema/app.db
 *
 * Aceita caminho absoluto, relativo à pasta do projeto ou `~/` (home do usuário).
 */
export function resolveDatabasePath(
  configuredPath: string | undefined = process.env.DB_PATH,
  options: { cwd?: string; home?: string } = {},
): string {
  const cwd = options.cwd ?? process.cwd();
  const home = options.home ?? homedir();
  const value = configuredPath?.trim();

  if (!value) return path.join(cwd, DEFAULT_DIRECTORY, DEFAULT_FILE);

  const expanded =
    value === "~" ? home : value.startsWith("~/") ? path.join(home, value.slice(2)) : value;

  return path.isAbsolute(expanded) ? expanded : path.join(cwd, expanded);
}

/** Garante que o diretório do banco exista (idempotente). */
export function ensureDatabaseDirectory(filePath: string): string {
  mkdirSync(path.dirname(filePath), { recursive: true });
  return filePath;
}
