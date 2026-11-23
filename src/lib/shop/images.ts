/** Isolated product stills for Shop categories (not spa lifestyle photos). */
export const SHOP_CATEGORY_IMAGES: Record<string, string> = {
  "skincare-facial": "/shop/categories/skincare-facial.jpg",
  "body-care": "/shop/categories/body-care.jpg",
  "massage-spa": "/shop/categories/massage-spa.jpg",
  "organic-natural": "/shop/categories/organic-natural.jpg",
  "hair-beauty": "/shop/categories/hair-beauty.jpg",
  "beauty-tools": "/shop/categories/beauty-tools.jpg",
  aromatherapy: "/shop/categories/aromatherapy.jpg",
  "wellness-personal": "/shop/categories/wellness-personal.jpg",
  "bath-body": "/shop/categories/bath-body.jpg",
  "spa-supplies": "/shop/categories/spa-supplies.jpg",
  "beauty-enhancement": "/shop/categories/beauty-enhancement.jpg"
};

export function shopCategoryImage(slug: string) {
  return SHOP_CATEGORY_IMAGES[slug] || "/shop/categories/skincare-facial.jpg";
}
