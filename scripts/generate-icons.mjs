/**
 * Gera os ícones do PWA (PNG, sem dependências externas).
 *
 * O desenho é uma quadra: contorno, linhas de serviço e a rede ao centro.
 * Execute com `npm run icons` sempre que a marca mudar.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const BACKGROUND = [24, 24, 27];
const STROKE = [250, 250, 250];
const NET = [163, 230, 53];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value;
  }
  return table;
})();

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const payload = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload), 0);
  return Buffer.concat([length, payload, crc]);
}

function encodePng(size, pixels) {
  const stride = size * 3;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profundidade de bits
  header[9] = 2; // cor verdadeira (RGB)
  header[10] = 0;
  header[11] = 0;
  header[12] = 0;

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function blend(base, layer, alpha) {
  if (alpha <= 0) return;
  for (let channel = 0; channel < 3; channel += 1) {
    base[channel] = Math.round(base[channel] + (layer[channel] - base[channel]) * alpha);
  }
}

function renderIcon(size, inset) {
  const pixels = Buffer.alloc(size * size * 3);
  const left = inset;
  const right = 1 - inset;
  const middle = (left + right) / 2;
  const serviceOffset = (right - left) * 0.19;

  const border = [
    [left, left, right, left],
    [left, right, right, right],
    [left, left, left, right],
    [right, left, right, right],
  ];
  const services = [
    [middle - serviceOffset, left, middle - serviceOffset, middle],
    [middle + serviceOffset, left, middle + serviceOffset, middle],
    [middle - serviceOffset, middle, middle - serviceOffset, right],
    [middle + serviceOffset, middle, middle + serviceOffset, right],
  ];
  const net = [left, middle, right, middle];

  const minDistance = (segments, u, v) => {
    let best = Infinity;
    for (const [ax, ay, bx, by] of segments) {
      best = Math.min(best, distanceToSegment(u, v, ax, ay, bx, by));
    }
    return best;
  };
  const coverage = (distance, strokeWidth) =>
    Math.max(0, Math.min(1, (strokeWidth - distance) * size + 0.5));

  for (let y = 0; y < size; y += 1) {
    const v = (y + 0.5) / size;
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const color = [...BACKGROUND];
      blend(color, STROKE, coverage(minDistance(border, u, v), 0.036));
      blend(color, STROKE, coverage(minDistance(services, u, v), 0.022));
      blend(color, NET, coverage(distanceToSegment(u, v, ...net), 0.03));

      const index = (y * size + x) * 3;
      pixels[index] = color[0];
      pixels[index + 1] = color[1];
      pixels[index + 2] = color[2];
    }
  }

  return encodePng(size, pixels);
}

const TARGETS = [
  { path: "public/icons/icon-192.png", size: 192, inset: 0.14 },
  { path: "public/icons/icon-512.png", size: 512, inset: 0.14 },
  { path: "public/icons/maskable-192.png", size: 192, inset: 0.28 },
  { path: "public/icons/maskable-512.png", size: 512, inset: 0.28 },
  { path: "src/app/apple-icon.png", size: 180, inset: 0.14 },
];

for (const target of TARGETS) {
  const file = join(ROOT, target.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderIcon(target.size, target.inset));
  console.log(`gerado ${target.path} (${target.size}x${target.size})`);
}
