import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const PNG = { compressionLevel: 9, adaptiveFiltering: true };
const sourcePath = path.join("public", "brand", "logo-mark.png");
const splashLogoPath = path.join("public", "brand", "splash-logo.png");
const splashDir = path.join("public", "splash");
const iconsDir = path.join("public", "icons");

const APPLE = [
  { w: 320, h: 568, dpr: 2, file: "iphone-640x1136" },
  { w: 375, h: 667, dpr: 2, file: "iphone-750x1334" },
  { w: 414, h: 736, dpr: 3, file: "iphone-1242x2208" },
  { w: 375, h: 812, dpr: 3, file: "iphone-1125x2436" },
  { w: 414, h: 896, dpr: 2, file: "iphone-828x1792" },
  { w: 414, h: 896, dpr: 3, file: "iphone-1242x2688" },
  { w: 390, h: 844, dpr: 3, file: "iphone-1170x2532" },
  { w: 393, h: 852, dpr: 3, file: "iphone-1179x2556" },
  { w: 402, h: 874, dpr: 3, file: "iphone-1206x2622" },
  { w: 428, h: 926, dpr: 3, file: "iphone-1284x2778" },
  { w: 430, h: 932, dpr: 3, file: "iphone-1290x2796" },
  { w: 440, h: 956, dpr: 3, file: "iphone-1320x2868" },
  { w: 768, h: 1024, dpr: 2, file: "ipad-1536x2048" },
  { w: 834, h: 1112, dpr: 2, file: "ipad-1668x2224" },
  { w: 834, h: 1194, dpr: 2, file: "ipad-1668x2388" },
  { w: 1024, h: 1366, dpr: 2, file: "ipad-2048x2732" }
];

/** Knock out the artboard black so the mark can sit on a white splash/icon. */
async function transparentMark() {
  const { data, info } = await sharp(sourcePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = Buffer.from(data);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i] <= 22 && px[i + 1] <= 22 && px[i + 2] <= 22) px[i + 3] = 0;
  }
  return sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 10 })
    .png(PNG)
    .toBuffer();
}

/** Keep the circular portrait; drop the wordmark so splash is a single mark. */
async function portraitOnly(markBuf) {
  const meta = await sharp(markBuf).metadata();
  const width = meta.width || 1;
  const height = meta.height || 1;
  return sharp(markBuf)
    .extract({ left: 0, top: 0, width, height: Math.round(height * 0.67) })
    .trim()
    .png(PNG)
    .toBuffer();
}

async function writePng(file, buf) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, buf);
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.copyFileSync(tmp, file);
    fs.rmSync(tmp, { force: true });
  }
}

async function whiteSplash(markBuf, width, height, dest) {
  const markW = Math.round(Math.min(width, height) * 0.48);
  const mark = await sharp(markBuf).resize({ width: markW, withoutEnlargement: true }).png(PNG).toBuffer();
  const meta = await sharp(mark).metadata();
  const left = Math.max(0, Math.round((width - (meta.width || markW)) / 2));
  const top = Math.max(0, Math.round((height - (meta.height || markW)) / 2));
  const buf = await sharp({
    create: { width, height, channels: 4, background: WHITE }
  })
    .composite([{ input: mark, left, top }])
    .png(PNG)
    .toBuffer();
  await writePng(dest, buf);
}

/** Fraction of each edge left empty so a round home-screen mask does not clip the mark. */
const ICON_INSET = 0.15;
const MASKABLE_INSET = 0.18;

async function squareIcon(markBuf, size, dest, pad = 0) {
  const inner = Math.max(1, size - pad * 2);
  const mark = await sharp(markBuf)
    .resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png(PNG)
    .toBuffer();
  const buf = await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE }
  })
    .composite([{ input: mark, left: pad, top: pad }])
    .png(PNG)
    .toBuffer();
  await writePng(dest, buf);
}

function inset(size, ratio) {
  return Math.round(size * ratio);
}

const markBuf = await transparentMark();
const portraitBuf = await portraitOnly(markBuf);
await writePng(
  splashLogoPath,
  await sharp(portraitBuf).resize({ width: 512, withoutEnlargement: true }).png(PNG).toBuffer()
);

fs.mkdirSync(splashDir, { recursive: true });
fs.mkdirSync(iconsDir, { recursive: true });

await squareIcon(markBuf, 192, path.join(splashDir, "icon-192.png"), inset(192, ICON_INSET));
await squareIcon(markBuf, 512, path.join(splashDir, "icon-512.png"), inset(512, ICON_INSET));
await squareIcon(markBuf, 192, path.join(iconsDir, "icon-192.png"), inset(192, ICON_INSET));
await squareIcon(markBuf, 512, path.join(iconsDir, "icon-512.png"), inset(512, ICON_INSET));
await squareIcon(markBuf, 180, path.join(iconsDir, "apple-touch-icon.png"), inset(180, ICON_INSET));
await squareIcon(markBuf, 192, path.join(iconsDir, "maskable-192.png"), inset(192, MASKABLE_INSET));
await squareIcon(markBuf, 512, path.join(iconsDir, "maskable-512.png"), inset(512, MASKABLE_INSET));
await squareIcon(markBuf, 512, path.join("src", "app", "icon.png"), inset(512, ICON_INSET));
await squareIcon(markBuf, 180, path.join("src", "app", "apple-icon.png"), inset(180, ICON_INSET));

if (!process.argv.includes("--icons-only")) {
  for (const d of APPLE) {
    const pw = d.w * d.dpr;
    const ph = d.h * d.dpr;
    await whiteSplash(portraitBuf, pw, ph, path.join(splashDir, `${d.file}.png`));
    await whiteSplash(portraitBuf, ph, pw, path.join(splashDir, `${d.file}-landscape.png`));
  }
}

console.log("Wrote install icons (full mark) and splash images (portrait only).");
