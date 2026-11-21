type ProtectedPhotoProps = {
  src: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
};

export function ProtectedPhoto({
  src,
  alt = "",
  className = "",
  imgClassName = "h-full w-full object-cover"
}: ProtectedPhotoProps) {
  return (
    <span className={`protected-photo relative block overflow-hidden ${className}`.trim()} data-protected-media>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} draggable={false} decoding="async" className={`pointer-events-none select-none ${imgClassName}`} />
      <span className="protected-photo-veil" aria-hidden />
    </span>
  );
}
