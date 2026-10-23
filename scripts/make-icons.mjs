import fs from "node:fs";
import path from "node:path";

const src = path.join("public", "splash", "icon-512.png");
const dir = path.join("public", "icons");
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(path.join("public", "splash", "icon-192.png"), path.join(dir, "icon-192.png"));
fs.copyFileSync(src, path.join(dir, "icon-512.png"));
fs.copyFileSync(src, path.join(dir, "maskable-512.png"));
fs.copyFileSync(src, path.join(dir, "apple-touch-icon.png"));
fs.copyFileSync(src, path.join("src", "app", "icon.png"));
console.log("Copied white splash mark to PWA icon slots");
