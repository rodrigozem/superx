import path from "node:path";

import { describe, expect, it } from "vitest";

import { resolveDatabasePath } from "./db-path";

const CWD = path.resolve("/app/nodejs");
const HOME = path.resolve("/home/u559221023");

describe("resolveDatabasePath", () => {
  it("usa data/app.db dentro do projeto por padrão", () => {
    expect(resolveDatabasePath(undefined, { cwd: CWD, home: HOME })).toBe(
      path.join(CWD, "data", "app.db"),
    );
    expect(resolveDatabasePath("", { cwd: CWD, home: HOME })).toBe(
      path.join(CWD, "data", "app.db"),
    );
    expect(resolveDatabasePath("   ", { cwd: CWD, home: HOME })).toBe(
      path.join(CWD, "data", "app.db"),
    );
  });

  it("respeita caminho absoluto", () => {
    const target = path.join(HOME, "dados-sistema", "app.db");
    expect(resolveDatabasePath(target, { cwd: CWD, home: HOME })).toBe(target);
  });

  it("expande ~/ para o home do usuário", () => {
    expect(resolveDatabasePath("~/dados-sistema/app.db", { cwd: CWD, home: HOME })).toBe(
      path.join(HOME, "dados-sistema", "app.db"),
    );
  });

  it("trata caminho relativo como relativo à pasta do projeto", () => {
    expect(resolveDatabasePath("var/app.db", { cwd: CWD, home: HOME })).toBe(
      path.join(CWD, "var", "app.db"),
    );
  });

  it("normaliza espaços em volta do valor", () => {
    expect(resolveDatabasePath("  ~/dados/app.db  ", { cwd: CWD, home: HOME })).toBe(
      path.join(HOME, "dados", "app.db"),
    );
  });
});
