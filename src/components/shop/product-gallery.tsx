"use client";

import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const urls = images.length ? images : ["/photos/band-spa.jpg"];
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="overflow-hidden rounded-[1.75rem] border border-line bg-elev">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urls[active]} alt={name} className="h-[28rem] w-full object-cover" />
      </div>
      {urls.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {urls.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border ${i === active ? "border-gold" : "border-line"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
