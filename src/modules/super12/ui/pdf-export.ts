import type { jsPDF } from "jspdf";

import type {
  RankingMode,
  StandingEntry,
  TournamentConfig,
} from "@/modules/super12/domain";
import type { StoredMatch, StoredTournament } from "@/modules/super12/data";

import {
  describeMatchFormat,
  FORMAT_LABEL,
  formatPercent,
  formatSigned,
  MATCH_STATUS_LABEL,
  RANKING_MODE_LABEL,
  SCHEDULE_MODE_LABEL,
} from "./labels";

type RGB = [number, number, number];

const NAVY_950: RGB = [12, 24, 48];
const NAVY_900: RGB = [18, 36, 75];
const NAVY_800: RGB = [28, 49, 89];
const NAVY_600: RGB = [52, 82, 138];
const NAVY_300: RGB = [159, 178, 212];
const NAVY_200: RGB = [201, 213, 232];
const NAVY_50: RGB = [243, 246, 251];

const CRIMSON_700: RGB = [181, 22, 75];
const CRIMSON_600: RGB = [214, 31, 91];
const CRIMSON_300: RGB = [239, 157, 185];

const ZINC_600: RGB = [82, 82, 91];
const ZINC_500: RGB = [113, 113, 122];
const ZINC_300: RGB = [212, 212, 216];
const ZINC_200: RGB = [228, 228, 231];
const ZINC_50: RGB = [250, 250, 250];
const WHITE: RGB = [255, 255, 255];

const EMERALD: RGB = [16, 150, 110];
const AMBER: RGB = [180, 120, 20];
const RED: RGB = [200, 45, 45];
const FAINT: RGB = [230, 230, 235];

const GOLD: RGB = [217, 165, 32];
const GOLD_TINT: RGB = [253, 247, 227];
const SILVER: RGB = [148, 163, 184];
const SILVER_TINT: RGB = [245, 247, 250];
const BRONZE: RGB = [196, 112, 47];
const BRONZE_TINT: RGB = [253, 244, 235];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 18;

const BODY_FONT = 7.8;
const BODY_LINE = 3.3;

type Align = "left" | "center" | "right";

type Column = { label: string; width: number; align: Align };

type Cell = {
  text: string;
  align: Align;
  color: RGB;
  bold?: boolean;
};

const ROUND_COLUMNS: Column[] = [
  { label: "QUADRA", width: 24, align: "left" },
  { label: "TURNO", width: 12, align: "center" },
  { label: "DUPLA A", width: 54, align: "left" },
  { label: "PLACAR", width: 18, align: "center" },
  { label: "DUPLA B", width: 54, align: "left" },
  { label: "STATUS", width: 20, align: "center" },
];

function rankingColumns(showByes: boolean): Column[] {
  const columns: Column[] = [
    { label: "#", width: 7, align: "center" },
    { label: "ATLETA", width: 34, align: "left" },
    { label: "J", width: 8, align: "center" },
    { label: "V", width: 8, align: "center" },
    { label: "E", width: 8, align: "center" },
    { label: "D", width: 8, align: "center" },
  ];
  if (showByes) columns.push({ label: "DESC.", width: 11, align: "center" });
  columns.push(
    { label: "GP", width: 9, align: "center" },
    { label: "GC", width: 9, align: "center" },
    { label: "SG", width: 9, align: "center" },
    { label: "APR.", width: 11, align: "center" },
    { label: "DESEMPATE", width: showByes ? 60 : 71, align: "left" },
  );
  return columns;
}

function setFill(doc: jsPDF, color: RGB) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: RGB) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setStroke(doc: jsPDF, color: RGB) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function ellipsize(doc: jsPDF, text: string, maxWidth: number): string {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && doc.getTextWidth(`${result}...`) > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}...`;
}

function fitTitle(doc: jsPDF, text: string, maxWidth: number): string {
  let size = 21;
  doc.setFont("helvetica", "bold");
  while (size > 13) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidth) break;
    size -= 0.5;
  }
  doc.setFontSize(size);
  return ellipsize(doc, text, maxWidth);
}

function nowLabel(): string {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fileStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function drawHeader(
  doc: jsPDF,
  options: {
    kicker: string;
    title: string;
    subtitle: string;
    right?: string;
  },
) {
  setFill(doc, NAVY_950);
  doc.rect(0, 0, PAGE_W, 40, "F");
  setFill(doc, CRIMSON_600);
  doc.rect(0, 40, PAGE_W, 1.6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setText(doc, CRIMSON_300);
  doc.text(options.kicker.toUpperCase(), MARGIN, 11.5);

  const title = fitTitle(doc, options.title, CONTENT_W - 50);
  setText(doc, WHITE);
  doc.text(title, MARGIN, 23);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(doc, NAVY_200);
  doc.text(ellipsize(doc, options.subtitle, CONTENT_W - 50), MARGIN, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  setText(doc, NAVY_300);
  doc.text("GERADO EM", PAGE_W - MARGIN, 11.5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  setText(doc, WHITE);
  doc.text(options.right ?? nowLabel(), PAGE_W - MARGIN, 23, { align: "right" });
}

function drawCompactHeader(doc: jsPDF, title: string, right: string) {
  setFill(doc, NAVY_950);
  doc.rect(0, 0, PAGE_W, 16, "F");
  setFill(doc, CRIMSON_600);
  doc.rect(0, 16, PAGE_W, 1.2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setText(doc, WHITE);
  doc.text(ellipsize(doc, title, CONTENT_W - 40), MARGIN, 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  setText(doc, NAVY_300);
  doc.text(right, PAGE_W - MARGIN, 10, { align: "right" });
}

type Chip = { label: string; value: string };

function drawChips(doc: jsPDF, y: number, chips: Chip[]): number {
  const gap = 4;
  const width = (CONTENT_W - gap * (chips.length - 1)) / chips.length;

  chips.forEach((chip, index) => {
    const x = MARGIN + index * (width + gap);
    setFill(doc, NAVY_50);
    doc.roundedRect(x, y, width, 14, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.4);
    setText(doc, ZINC_500);
    doc.text(ellipsize(doc, chip.label.toUpperCase(), width - 8), x + 4, y + 5.4);

    doc.setFontSize(11.5);
    setText(doc, NAVY_900);
    doc.text(ellipsize(doc, chip.value, width - 8), x + 4, y + 11.4);
  });

  return y + 14;
}

function drawTableHeader(doc: jsPDF, y: number, columns: Column[]): number {
  setFill(doc, NAVY_600);
  doc.rect(MARGIN, y, CONTENT_W, 7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  setText(doc, WHITE);

  let x = MARGIN;
  for (const column of columns) {
    const tx =
      column.align === "left"
        ? x + 2
        : column.align === "right"
          ? x + column.width - 2
          : x + column.width / 2;
    doc.text(column.label, tx, y + 4.8, { align: column.align });
    x += column.width;
  }

  return y + 7;
}

function drawRoundBar(
  doc: jsPDF,
  y: number,
  round: number,
  done: number,
  total: number,
): number {
  setFill(doc, NAVY_900);
  doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.6, 1.6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.6);
  setText(doc, WHITE);
  doc.text(`RODADA ${round}`, MARGIN + 4, y + 5.4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  setText(doc, NAVY_300);
  doc.text(
    `${done}/${total} finalizados`,
    MARGIN + CONTENT_W - 4,
    y + 5.4,
    { align: "right" },
  );

  return y + 8;
}

function prepareRow(
  doc: jsPDF,
  columns: Column[],
  cells: Cell[],
): { lines: string[][]; height: number } {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(BODY_FONT);

  const lines = cells.map((cell, index) => {
    doc.setFont("helvetica", cell.bold ? "bold" : "normal");
    doc.setFontSize(BODY_FONT);
    const width = columns[index].width - 4;
    const wrapped = cell.text.length > 0 ? doc.splitTextToSize(cell.text, width) : [""];
    return wrapped.slice(0, 2);
  });

  const maxLines = Math.max(1, ...lines.map((line) => line.length));
  return { lines, height: Math.max(9, maxLines * BODY_LINE + 4) };
}

function paintRow(
  doc: jsPDF,
  y: number,
  columns: Column[],
  cells: Cell[],
  prepared: { lines: string[][]; height: number },
  striped: boolean,
  overrideFill?: RGB,
) {
  setFill(doc, overrideFill ?? (striped ? ZINC_50 : WHITE));
  doc.rect(MARGIN, y, CONTENT_W, prepared.height, "F");

  let x = MARGIN;
  cells.forEach((cell, index) => {
    const column = columns[index];
    const lineList = prepared.lines[index];
    doc.setFont("helvetica", cell.bold ? "bold" : "normal");
    doc.setFontSize(BODY_FONT);
    setText(doc, cell.color);

    const tx =
      cell.align === "left"
        ? x + 2
        : cell.align === "right"
          ? x + column.width - 2
          : x + column.width / 2;
    const ty = y + (prepared.height - lineList.length * BODY_LINE) / 2 + BODY_LINE * 0.82;

    doc.text(lineList, tx, ty, { align: cell.align });
    x += column.width;
  });

  setStroke(doc, ZINC_200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y + prepared.height, MARGIN + CONTENT_W, y + prepared.height);
}

function statusColor(status: StoredMatch["status"]): RGB {
  switch (status) {
    case "FINALIZADO":
      return EMERALD;
    case "EM_ANDAMENTO":
      return AMBER;
    case "WO":
    case "CANCELADO":
      return RED;
    default:
      return ZINC_500;
  }
}

function drawFooters(doc: jsPDF, label: string) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    setStroke(doc, ZINC_200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, PAGE_H - 13, PAGE_W - MARGIN, PAGE_H - 13);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.2);
    setText(doc, ZINC_500);
    doc.text(ellipsize(doc, label, 80), MARGIN, PAGE_H - 8);
    doc.text(`Página ${page} de ${pages}`, PAGE_W - MARGIN, PAGE_H - 8, {
      align: "right",
    });
  }
}

function savePdf(doc: jsPDF, filename: string) {
  if (typeof window === "undefined") {
    doc.output("arraybuffer");
    return;
  }
  doc.save(filename);
}

type RoundPdfInput = {
  tournament: StoredTournament;
  matches: StoredMatch[];
};

export async function exportRoundsPdf({ tournament, matches }: RoundPdfInput) {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const names = new Map(tournament.players.map((player) => [player.id, player.name]));
  const courtNames = tournament.config.courtNames;
  const courtLabel = (court: number) =>
    courtNames?.[court - 1]?.trim() || `Quadra ${court}`;

  const rounds = [...new Set(matches.map((match) => match.round))].sort(
    (a, b) => a - b,
  );
  const finishedTotal = matches.filter(
    (match) => match.status === "FINALIZADO",
  ).length;

  drawHeader(doc, {
    kicker: `Tabela de jogos · ${FORMAT_LABEL[tournament.config.format]}`,
    title: tournament.name,
    subtitle: `${SCHEDULE_MODE_LABEL[tournament.config.scheduleMode]} · ${describeMatchFormat(
      tournament.config.matchFormat,
    )} · seed ${tournament.config.seed}`,
  });

  let y = drawChips(doc, 46, [
    { label: "Rodadas", value: String(rounds.length) },
    { label: "Jogos", value: String(matches.length) },
    { label: "Finalizados", value: `${finishedTotal}/${matches.length}` },
    { label: "Quadras", value: String(tournament.config.courts) },
  ]);

  y += 8;

  const startNewPage = () => {
    doc.addPage();
    drawCompactHeader(doc, tournament.name, "Tabela de jogos");
    y = 24;
  };

  for (const round of rounds) {
    const roundMatches = matches
      .filter((match) => match.round === round)
      .sort(
        (a, b) =>
          a.turn - b.turn || a.court - b.court || a.id.localeCompare(b.id),
      );
    const done = roundMatches.filter(
      (match) => match.status === "FINALIZADO",
    ).length;

    if (y + 8 + 7 + 9 > BOTTOM_LIMIT) startNewPage();

    y = drawRoundBar(doc, y, round, done, roundMatches.length);
    y = drawTableHeader(doc, y, ROUND_COLUMNS);

    roundMatches.forEach((match, index) => {
      const teamA = match.teamA.map((id) => names.get(id) ?? id).join(" / ");
      const teamB = match.teamB.map((id) => names.get(id) ?? id).join(" / ");
      const played = match.gamesA !== undefined && match.gamesB !== undefined;
      const gamesA = match.gamesA ?? 0;
      const gamesB = match.gamesB ?? 0;

      const hasTiebreak =
        match.tiebreakA !== undefined &&
        match.tiebreakB !== undefined &&
        match.tiebreakA > 0 &&
        match.tiebreakB > 0;
      const decisivo =
        tournament.config.matchFormat.kind === "SOMA_FIXA" &&
        !tournament.config.matchFormat.permitirEmpate &&
        match.decisivoPara !== undefined &&
        gamesA === gamesB;

      const winnerA =
        played &&
        (gamesA > gamesB ||
          (decisivo && match.decisivoPara === "A"));
      const winnerB =
        played &&
        (gamesB > gamesA ||
          (decisivo && match.decisivoPara === "B"));

      const score = played
        ? `${gamesA}x${gamesB}${hasTiebreak ? `  TB ${match.tiebreakA}x${match.tiebreakB}` : ""}`
        : "—";

      const cells: Cell[] = [
        { text: courtLabel(match.court), align: "left", color: NAVY_800, bold: true },
        { text: `T${match.turn}`, align: "center", color: ZINC_500 },
        {
          text: teamA,
          align: "left",
          color: winnerA ? NAVY_900 : ZINC_600,
          bold: winnerA,
        },
        {
          text: score,
          align: "center",
          color: played ? NAVY_900 : ZINC_300,
          bold: played,
        },
        {
          text: teamB,
          align: "left",
          color: winnerB ? NAVY_900 : ZINC_600,
          bold: winnerB,
        },
        {
          text: MATCH_STATUS_LABEL[match.status],
          align: "center",
          color: statusColor(match.status),
          bold: match.status === "FINALIZADO",
        },
      ];

      const prepared = prepareRow(doc, ROUND_COLUMNS, cells);

      if (y + prepared.height > BOTTOM_LIMIT) {
        startNewPage();
        y = drawRoundBar(doc, y, round, done, roundMatches.length);
        y = drawTableHeader(doc, y, ROUND_COLUMNS);
      }

      paintRow(doc, y, ROUND_COLUMNS, cells, prepared, index % 2 === 1);
      y += prepared.height;
    });

    y += 6;
  }

  drawFooters(doc, `${tournament.name} · Tabela de jogos`);
  savePdf(doc, `${slugify(tournament.name)}-rodadas-${fileStamp()}.pdf`);
}

type StandingsPdfInput = {
  tournament: StoredTournament;
  standings: StandingEntry[];
  finished: number;
  total: number;
};

const PRIMARY_METRIC: Record<
  RankingMode,
  { label: string; get: (entry: StandingEntry) => number; signed?: boolean }
> = {
  VITORIAS: { label: "VIT", get: (entry) => entry.stats.wins },
  PONTOS: { label: "PTS", get: (entry) => entry.stats.points },
  SALDO_GAMES: { label: "SG", get: (entry) => entry.stats.gameDiff, signed: true },
  GAMES_PRO: { label: "GP", get: (entry) => entry.stats.gamesFor },
};

function formatMetric(metric: (typeof PRIMARY_METRIC)[RankingMode], entry: StandingEntry) {
  const value = metric.get(entry);
  return metric.signed ? formatSigned(value) : String(value);
}

function drawPodium(doc: jsPDF, y: number, standings: StandingEntry[], config: TournamentConfig) {
  const top = standings.slice(0, 3);
  const gap = 4;
  const width = (CONTENT_W - gap * 2) / 3;
  const height = 32;
  const metric = PRIMARY_METRIC[config.rankingMode];

  const styles = [
    { accent: GOLD, tint: GOLD_TINT },
    { accent: SILVER, tint: SILVER_TINT },
    { accent: BRONZE, tint: BRONZE_TINT },
  ];

  top.forEach((entry, index) => {
    const style = styles[index];
    const x = MARGIN + index * (width + gap);

    setFill(doc, style.tint);
    doc.roundedRect(x, y, width, height, 2.4, 2.4, "F");
    setFill(doc, index === 0 ? CRIMSON_600 : style.accent);
    doc.roundedRect(x, y, width, 1.8, 0.9, 0.9, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setText(doc, FAINT);
    doc.text(String(entry.position), x + width - 6, y + 18, { align: "right" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.6);
    setText(doc, index === 0 ? CRIMSON_700 : style.accent);
    doc.text(`${entry.position}º LUGAR`, x + 5, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    setText(doc, NAVY_900);
    const nameLines = doc.splitTextToSize(entry.name, width - 10).slice(0, 2);
    doc.text(nameLines, x + 5, y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    setText(doc, ZINC_600);
    doc.text(
      `${entry.stats.wins}V  ${entry.stats.draws}E  ${entry.stats.losses}D  ·  SG ${formatSigned(entry.stats.gameDiff)}`,
      x + 5,
      y + 25,
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setText(doc, NAVY_900);
    doc.text(
      `${formatMetric(metric, entry)} ${metric.label}`,
      x + width - 5,
      y + 30,
      { align: "right" },
    );
  });

  return y + height;
}

export async function exportStandingsPdf({
  tournament,
  standings,
  finished,
  total,
}: StandingsPdfInput) {
  const { jsPDF: JsPDF } = await import("jspdf");
  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const showByes = Object.keys(tournament.byesByRound).length > 0;
  const columns = rankingColumns(showByes);

  drawHeader(doc, {
    kicker: `Classificação final · ${FORMAT_LABEL[tournament.config.format]}`,
    title: tournament.name,
    subtitle: `${describeMatchFormat(tournament.config.matchFormat)} · ranking por ${RANKING_MODE_LABEL[
      tournament.config.rankingMode
    ].toLowerCase()}`,
  });

  let y = drawChips(doc, 46, [
    { label: "Atletas", value: String(standings.length) },
    { label: "Jogos finalizados", value: `${finished}/${total}` },
    { label: "Quadras", value: String(tournament.config.courts) },
    { label: "Critério", value: RANKING_MODE_LABEL[tournament.config.rankingMode] },
  ]);

  y += 8;

  if (standings.length > 0) {
    y = drawPodium(doc, y, standings, tournament.config);
    y += 8;
  }

  y = drawTableHeader(doc, y, columns);

  standings.forEach((entry, index) => {
    const isPodium = entry.position <= 3;
    const tint = index === 0 ? GOLD_TINT : index === 1 ? SILVER_TINT : index === 2 ? BRONZE_TINT : null;

    const cells: Cell[] = [
      {
        text: String(entry.position),
        align: "center",
        color: isPodium ? NAVY_900 : ZINC_500,
        bold: isPodium,
      },
      {
        text: entry.name,
        align: "left",
        color: NAVY_900,
        bold: isPodium,
      },
      { text: String(entry.stats.played), align: "center", color: ZINC_600 },
      { text: String(entry.stats.wins), align: "center", color: EMERALD, bold: entry.stats.wins > 0 },
      { text: String(entry.stats.draws), align: "center", color: ZINC_600 },
      { text: String(entry.stats.losses), align: "center", color: ZINC_600 },
    ];

    if (showByes) {
      cells.push({
        text: String(entry.stats.byes),
        align: "center",
        color: ZINC_500,
      });
    }

    cells.push(
      { text: String(entry.stats.gamesFor), align: "center", color: ZINC_600 },
      { text: String(entry.stats.gamesAgainst), align: "center", color: ZINC_600 },
      {
        text: formatSigned(entry.stats.gameDiff),
        align: "center",
        color: NAVY_800,
      },
      {
        text: formatPercent(entry.stats.gamesWinPct),
        align: "center",
        color: ZINC_600,
      },
      {
        text: entry.tiebreak?.detail ?? "—",
        align: "left",
        color: ZINC_500,
      },
    );

    const prepared = prepareRow(doc, columns, cells);

    if (y + prepared.height > BOTTOM_LIMIT) {
      doc.addPage();
      drawCompactHeader(doc, tournament.name, "Classificação final");
      y = 24;
      y = drawTableHeader(doc, y, columns);
    }

    if (tint) {
      paintRow(doc, y, columns, cells, prepared, false, tint);
    } else {
      paintRow(doc, y, columns, cells, prepared, index % 2 === 1);
    }

    y += prepared.height;
  });

  if (standings.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setText(doc, ZINC_500);
    doc.text("Nenhum atleta cadastrado.", MARGIN, y + 10);
  }

  drawFooters(doc, `${tournament.name} · Classificação final`);
  savePdf(doc, `${slugify(tournament.name)}-classificacao-${fileStamp()}.pdf`);
}
