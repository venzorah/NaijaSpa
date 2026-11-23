import { shopCategoryImage } from "@/lib/shop/images";

/** Small product still for a Shop category. */
export function ShopCategoryMark({ slug, className = "h-16 w-16" }: { slug: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shopCategoryImage(slug)} alt="" className={`${className} object-cover`} />
  );
}
