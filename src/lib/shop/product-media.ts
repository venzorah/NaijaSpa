const SHOP_IMAGE_PATH = /^\/api\/media\/galleries\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(png|jpe?g|webp|gif)$/i;

export const SHOP_PRODUCT_IMAGE_MAX = 3;
export const SHOP_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

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
