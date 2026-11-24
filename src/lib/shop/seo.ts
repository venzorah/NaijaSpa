export function shopProductSeo(product: { name: string; description?: string | null; seoTitle?: string | null; metaDescription?: string | null }) {
  const title = product.seoTitle?.trim() || product.name;
  const description =
    product.metaDescription?.trim() ||
    (product.description || "").trim().slice(0, 160) ||
    `Buy ${product.name} on NaijaSpa Shop.`;
  return { title, description };
}
