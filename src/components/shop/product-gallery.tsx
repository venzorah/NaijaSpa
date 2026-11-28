"use client";

import { useState } from "react";
import { ShopProductImage } from "@/components/shop/product-image";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const urls = images.slice(0, 3);
  const photos = urls.length ? urls : ["/shop/hero/products.jpg"];
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-elev sm:rounded-[1.75rem]">
        <ShopProductImage src={photos[active]} alt={name} className="aspect-square w-full sm:aspect-[4/5] sm:max-h-[36rem]" />
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {photos.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`overflow-hidden rounded-xl border ${i === active ? "border-gold ring-1 ring-gold" : "border-line"}`}
            >
              <ShopProductImage
                src={url}
                alt={i === 0 ? `${name} featured` : `${name} gallery ${i}`}
                className="aspect-square w-full"
                padded={false}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
