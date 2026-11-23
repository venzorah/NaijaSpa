import { shopCategoryImage } from "@/lib/shop/images";

/** Small product still for a Shop category. */
export function ShopCategoryMark({ slug, className = "h-24 w-24" }: { slug: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={shopCategoryImage(slug)} alt="" className={`${className} object-cover`} />
  );
}
