/** Square frame that shows the whole product photo without cropping. */
export function ShopProductImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  padded = true
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  padded?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-elev ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`absolute inset-0 h-full w-full object-contain ${padded ? "p-3 sm:p-4" : "p-1"} ${imgClassName}`}
      />
    </div>
  );
}
