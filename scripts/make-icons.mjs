import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const logoPath = path.join("public", "brand", "splash-logo.png");
const splashDir = path.join("public", "splash");
const iconDir = path.join("public", "icons");

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

async function whiteSplash(width, height, dest) {
  const markW = Math.round(Math.min(width, height) * 0.46);
  const mark = await sharp(logoPath).resize({ width: markW, withoutEnlargement: true }).png().toBuffer();
  const meta = await sharp(mark).metadata();
  const left = Math.max(0, Math.round((width - (meta.width || markW)) / 2));
  const top = Math.max(0, Math.round((height - (meta.height || markW)) / 2));
  await sharp({
    create: { width, height, channels: 4, background: WHITE }
  })
    .composite([{ input: mark, left, top }])
    .png()
    .toFile(dest);
}

async function squareIcon(size, dest, pad = 0) {
  const inner = Math.max(1, size - pad * 2);
  const mark = await sharp(logoPath).resize({ width: inner, height: inner, fit: "contain", background: WHITE }).png().toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: WHITE }
  })
    .composite([{ input: mark, left: pad, top: pad }])
    .png()
    .toFile(dest);
}

fs.mkdirSync(splashDir, { recursive: true });
fs.mkdirSync(iconDir, { recursive: true });

await squareIcon(192, path.join(splashDir, "icon-192.png"));
await squareIcon(512, path.join(splashDir, "icon-512.png"));
await squareIcon(192, path.join(iconDir, "icon-192.png"));
await squareIcon(512, path.join(iconDir, "icon-512.png"));
await squareIcon(192, path.join(iconDir, "maskable-192.png"), 18);
await squareIcon(512, path.join(iconDir, "maskable-512.png"), 48);
await squareIcon(180, path.join(iconDir, "apple-touch-icon.png"));
await squareIcon(180, path.join("src", "app", "apple-icon.png"));
await squareIcon(32, path.join("src", "app", "icon.png"));

for (const d of APPLE) {
  const pw = d.w * d.dpr;
  const ph = d.h * d.dpr;
  await whiteSplash(pw, ph, path.join(splashDir, `${d.file}.png`));
  await whiteSplash(ph, pw, path.join(splashDir, `${d.file}-landscape.png`));
}

console.log("Wrote white PWA icons and iOS/iPad splash images");
