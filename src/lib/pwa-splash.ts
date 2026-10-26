export const PWA_SPLASH_BG = "#ffffff";
/** Show splash for 1.5s, then the hub. Never wait longer than this. */
export const SPLASH_MAX_MS = 1500;
export const SPLASH_REDUCED_MS = 200;

export type AppleStartupImage = {
  url: string;
  media: string;
};

/** CSS pixel size × scale. Portrait first; landscape uses swapped pixel buffers. */
const APPLE_DEVICES: Array<{ w: number; h: number; dpr: number; file: string }> = [
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

function media(w: number, h: number, dpr: number, orientation: "portrait" | "landscape") {
  return `screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: ${orientation})`;
}

export function appleStartupImages(): AppleStartupImage[] {
  const images: AppleStartupImage[] = [];
  for (const d of APPLE_DEVICES) {
    images.push({
      url: `/splash/${d.file}.png`,
      media: media(d.w, d.h, d.dpr, "portrait")
    });
    images.push({
      url: `/splash/${d.file}-landscape.png`,
      media: media(d.w, d.h, d.dpr, "landscape")
    });
  }
  return images;
}

export function appleSplashPixelSizes() {
  return APPLE_DEVICES.map((d) => ({
    file: d.file,
    portrait: { width: d.w * d.dpr, height: d.h * d.dpr },
    landscape: { width: d.h * d.dpr, height: d.w * d.dpr }
  }));
}
