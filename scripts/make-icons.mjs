import fs from "node:fs";
import path from "node:path";

const src = path.join("public", "brand", "icon-white.png");
const dir = path.join("public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(src, path.join(dir, "icon-192.png"));
fs.copyFileSync(src, path.join(dir, "icon-512.png"));
fs.copyFileSync(src, path.join(dir, "maskable-512.png"));
fs.copyFileSync(src, path.join(dir, "apple-touch-icon.png"));
fs.copyFileSync(src, path.join("src", "app", "favicon.png"));
console.log("Copied white-background mark to PWA icon slots and favicon.png");
