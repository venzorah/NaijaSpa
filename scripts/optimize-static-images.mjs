import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const PHOTO_MAX = 1600;
const JPEG = { quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" };
const PNG = { compressionLevel: 9, adaptiveFiltering: true };

async function optimizeJpeg(file) {
  const img = sharp(file);
  const meta = await img.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  let pipeline = img.rotate();
  if (Math.max(w, h) > PHOTO_MAX) {
    pipeline = pipeline.resize({
      width: w >= h ? PHOTO_MAX : undefined,
      height: h > w ? PHOTO_MAX : undefined,
      withoutEnlargement: true
    });
  }
  const buf = await pipeline.jpeg(JPEG).toBuffer();
  if (buf.length < fs.statSync(file).size) replaceFile(file, buf);
}

function replaceFile(file, buf) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, buf);
  try {
    fs.renameSync(tmp, file);
  } catch {
    fs.copyFileSync(tmp, file);
    fs.rmSync(tmp, { force: true });
  }
}

async function optimizePng(file) {
  const buf = await sharp(file).png(PNG).toBuffer();
  if (buf.length < fs.statSync(file).size) replaceFile(file, buf);
}

const photos = fs.readdirSync(path.join("public", "photos")).filter((f) => /\.jpe?g$/i.test(f));
for (const f of photos) await optimizeJpeg(path.join("public", "photos", f));

const brandKeep = new Set(["logo-mark.png"]);
const brand = fs.readdirSync(path.join("public", "brand")).filter((f) => /\.png$/i.test(f) && !brandKeep.has(f));
for (const f of brand) await optimizePng(path.join("public", "brand", f));

console.log("Optimized public photos and brand PNGs (source mark left untouched).");
