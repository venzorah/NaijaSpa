export type ShopCatalogSort = "new" | "price-asc" | "price-desc" | "rating";

export type ShopCatalogFilters = {
  q: string;
  category: string;
  minNaira: number;
  maxNaira: number;
  rating: number;
  sort: ShopCatalogSort;
};

function param(sp: Record<string, string | string[] | undefined>, key: string) {
  const value = sp[key];
  return typeof value === "string" ? value.trim() : "";
}

export function parseShopCatalogQuery(sp: Record<string, string | string[] | undefined>): ShopCatalogFilters {
  const sortRaw = param(sp, "sort");
  const sort: ShopCatalogSort =
    sortRaw === "price-asc" || sortRaw === "price-desc" || sortRaw === "rating" ? sortRaw : "new";
  return {
    q: param(sp, "q"),
    category: param(sp, "category"),
    minNaira: Math.max(0, Math.floor(Number(param(sp, "min")) || 0)),
    maxNaira: Math.max(0, Math.floor(Number(param(sp, "max")) || 0)),
    rating: Math.min(5, Math.max(0, Math.floor(Number(param(sp, "rating")) || 0))),
    sort
  };
}

export function applyShopCatalogFilters<T extends { priceKobo: number; ratingAvg: number }>(
  products: T[],
  filters: Pick<ShopCatalogFilters, "minNaira" | "maxNaira" | "rating" | "sort">
) {
  const minKobo = filters.minNaira * 100;
  const maxKobo = filters.maxNaira * 100;
  const next = products.filter((p) => {
    if (minKobo && p.priceKobo < minKobo) return false;
    if (maxKobo && p.priceKobo > maxKobo) return false;
    if (filters.rating && p.ratingAvg < filters.rating) return false;
    return true;
  });
  if (filters.sort === "price-asc") return [...next].sort((a, b) => a.priceKobo - b.priceKobo);
  if (filters.sort === "price-desc") return [...next].sort((a, b) => b.priceKobo - a.priceKobo);
  if (filters.sort === "rating") return [...next].sort((a, b) => b.ratingAvg - a.ratingAvg);
  return next;
}
