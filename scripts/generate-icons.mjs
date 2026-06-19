#!/usr/bin/env node
/**
 * scripts/generate-icons.mjs
 *
 * Generates placeholder PNG icons at 16×16, 32×32, 48×48, and 128×128.
 * Produces solid indigo-500 squares (#6366F1) — replace with real artwork
 * before submitting to the Chrome Web Store.
 *
 * Uses only Node.js built-ins (fs, zlib) — no npm dependencies.
 * Run via: pnpm generate:icons   (or automatically on `pnpm prepare`)
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = join(__dirname, '../src/assets/icons');

// LinguaFlix brand color: Tailwind indigo-500
const BRAND = { r: 99, g: 102, b: 241 };

/** Write a 32-bit unsigned integer as 4 big-endian bytes. */
function uint32BE(n) {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(n, 0);
  return buf;
}

/** Standard CRC-32 as specified by the PNG spec (ISO 15948). */
function crc32(data) {
  // Build the CRC lookup table once per call (cheap at these sizes)
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = (crc >>> 8) ^ table[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Wrap raw bytes in a PNG chunk.
 * Chunk layout: [4-byte length][4-byte type][data][4-byte CRC of type+data]
 */
function makeChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcInput))]);
}

/**
 * Generate a minimal valid PNG filled with a single RGB color.
 * Uses color type 2 (RGB, 8 bits per channel) with no alpha.
 */
function generatePNG(size, color) {
  // PNG file signature — identifies the file as a PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: describes the image dimensions and encoding
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr[8] = 8; // bit depth: 8 bits per channel
  ihdr[9] = 2; // color type: 2 = RGB (no alpha)
  // bytes 10–12: compression=0, filter=0, interlace=0 (already zero from alloc)

  // Raw (uncompressed) image data.
  // Each row: 1 filter byte (0 = None) followed by width × 3 RGB bytes.
  const rowSize = 1 + size * 3;
  const rawData = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y++) {
    const rowBase = y * rowSize;
    rawData[rowBase] = 0; // filter method: None
    for (let x = 0; x < size; x++) {
      const px = rowBase + 1 + x * 3;
      rawData[px] = color.r;
      rawData[px + 1] = color.g;
      rawData[px + 2] = color.b;
    }
  }

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', deflateSync(rawData)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Main ─────────────────────────────────────────────────────────────────────

await mkdir(ICONS_DIR, { recursive: true });

for (const size of [16, 32, 48, 128]) {
  const png = generatePNG(size, BRAND);
  const dest = join(ICONS_DIR, `icon-${size}.png`);
  await writeFile(dest, png);
  console.log(`  generated ${dest}`);
}

console.log('\nPlaceholder icons created. Replace with real artwork before publishing.');
