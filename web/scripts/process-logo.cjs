const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const srcPng = process.argv[2];
const outPath = process.argv[3];
const lightPath = process.argv[4];

function readPng(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function idx(png, x, y) {
  return (png.width * y + x) << 2;
}

function get(png, x, y) {
  const i = idx(png, x, y);
  return {
    r: png.data[i],
    g: png.data[i + 1],
    b: png.data[i + 2],
    a: png.data[i + 3],
  };
}

function set(png, x, y, c) {
  const i = idx(png, x, y);
  png.data[i] = c.r;
  png.data[i + 1] = c.g;
  png.data[i + 2] = c.b;
  png.data[i + 3] = c.a;
}

function isNearBlack(c, tol = 28) {
  return c.r <= tol && c.g <= tol && c.b <= tol;
}

function isAccent(c) {
  // magenta / wine / red tones
  return c.r > 90 && c.r > c.g + 20 && (c.b > c.g - 10 || c.g < 120);
}

function processLogo(src, forDark) {
  const w = src.width;
  const h = src.height;
  const out = new PNG({ width: w, height: h });
  let minX = w,
    minY = h,
    maxX = 0,
    maxY = 0;
  let found = false;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = get(src, x, y);
      if (isNearBlack(c, 30)) {
        set(out, x, y, { r: 0, g: 0, b: 0, a: 0 });
        continue;
      }

      let next = { ...c };
      if (forDark) {
        if (!isAccent(c)) {
          // gray / dark neutrals -> soft white for dark UIs
          const lum = (c.r + c.g + c.b) / 3;
          if (lum < 200) {
            next = { r: 248, g: 242, b: 245, a: c.a };
          }
        }
      }
      set(out, x, y, next);
      found = true;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (!found) return out;

  const pad = 12;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const cropped = new PNG({ width: cw, height: ch });
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      set(cropped, x, y, get(out, minX + x, minY + y));
    }
  }
  return cropped;
}

const src = readPng(srcPng);
fs.writeFileSync(outPath, PNG.sync.write(processLogo(src, false)));
fs.writeFileSync(lightPath, PNG.sync.write(processLogo(src, true)));
console.log("Wrote", outPath);
console.log("Wrote", lightPath);
