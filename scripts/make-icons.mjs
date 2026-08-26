/**
 * Generates the PWA icons as PNGs, with no image library.
 *
 * sharp cannot load on this machine (its native binary is blocked by a Windows
 * application-control policy), and the icon is a flat colour plus a letter drawn
 * from three rectangles - so encoding the PNG by hand is simpler than fighting
 * the toolchain.
 *
 *   node scripts/make-icons.mjs
 */
import fs from "node:fs";
import zlib from "node:zlib";

const CORAL = [0xe9, 0x63, 0x3c];
const WHITE = [0xff, 0xff, 0xff];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type; 0 means "none".
  const raw = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Draws the HFit mark: coral field, white "H" built from three bars. */
function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);

  // The glyph occupies the middle 44% so it survives the circular mask iOS and
  // Android apply to home-screen icons.
  const barW = Math.round(size * 0.085);
  const glyphH = Math.round(size * 0.44);
  const glyphW = Math.round(size * 0.38);
  const left = Math.round((size - glyphW) / 2);
  const right = left + glyphW - barW;
  const top = Math.round((size - glyphH) / 2);
  const bottom = top + glyphH;
  const crossTop = Math.round(top + glyphH / 2 - barW / 2);
  const crossBottom = crossTop + barW;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inLeftBar = x >= left && x < left + barW && y >= top && y < bottom;
      const inRightBar = x >= right && x < right + barW && y >= top && y < bottom;
      const inCross = x >= left && x < right + barW && y >= crossTop && y < crossBottom;

      const [r, g, b] = inLeftBar || inRightBar || inCross ? WHITE : CORAL;
      const i = (y * size + x) * 4;
      rgba[i] = r;
      rgba[i + 1] = g;
      rgba[i + 2] = b;
      rgba[i + 3] = 255;
    }
  }

  return encodePng(size, size, rgba);
}

fs.mkdirSync("public/icons", { recursive: true });

for (const size of [180, 192, 512]) {
  const file = `public/icons/icon-${size}.png`;
  fs.writeFileSync(file, drawIcon(size));
  console.log(`${file} — ${Math.round(fs.statSync(file).size / 1024)} Ko`);
}
