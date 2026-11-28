const SHOP_IMAGE_PATH = /^\/api\/media\/galleries\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/i;

export const SHOP_PRODUCT_IMAGE_MAX = 3;
export const SHOP_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;
export const SHOP_PRODUCT_IMAGE_BYTES_MIN = 1 * 1024 * 1024;
export const SHOP_PRODUCT_IMAGE_BYTES_CAP = 5 * 1024 * 1024;
export const DEFAULT_SHOP_PRODUCT_IMAGE_MB = 2;
export const SHOP_PRODUCT_IMAGE_MB_MIN = 1;
export const SHOP_PRODUCT_IMAGE_MB_MAX = 5;

export function clampShopProductImageMb(mb: number) {
  if (!Number.isFinite(mb)) return DEFAULT_SHOP_PRODUCT_IMAGE_MB;
  return Math.min(SHOP_PRODUCT_IMAGE_MB_MAX, Math.max(SHOP_PRODUCT_IMAGE_MB_MIN, Math.round(mb)));
}

export function clampShopProductImageBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return SHOP_PRODUCT_IMAGE_BYTES;
  return clampShopProductImageMb(bytes / (1024 * 1024)) * 1024 * 1024;
}

export function shopProductImageLimitLabel(bytes: number) {
  return `${clampShopProductImageMb(bytes / (1024 * 1024))} MB`;
}

export function shopProductImageTooLargeMessage(bytes: number) {
  return `Image must be ${shopProductImageLimitLabel(bytes)} or smaller.`;
}

export function isShopProductImageUrl(url: string) {
  return SHOP_IMAGE_PATH.test(url.trim());
}

export function shopProductImages(urls: string[]) {
  return urls.map((url) => url.trim()).filter(isShopProductImageUrl).slice(0, SHOP_PRODUCT_IMAGE_MAX);
}

export function shopListingImages(images: { url: string }[]) {
  const urls = images.map((img) => img.url).filter(Boolean);
  return {
    image: urls[0] || "/shop/hero/products.jpg",
    gallery: urls.slice(1, SHOP_PRODUCT_IMAGE_MAX)
  };
}
