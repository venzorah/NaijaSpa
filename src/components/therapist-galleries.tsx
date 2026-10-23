export type PublicGalleryImage = {
  id: string;
  url: string;
  caption: string;
  therapistName: string;
};

export type PublicGallery = {
  id: string;
  title: string;
  caption: string;
  images: PublicGalleryImage[];
};

export type PublicVideoLink = {
  id: string;
  url: string;
  title: string;
};

export function TherapistGalleries({
  galleries,
  videoLinks
}: {
  galleries: PublicGallery[];
  videoLinks: PublicVideoLink[];
}) {
  if (galleries.length === 0 && videoLinks.length === 0) return null;
  return (
    <section className="mt-10 space-y-8">
      {galleries.map((g) => (
        <div key={g.id}>
          <h2 className="font-display text-2xl">{g.title}</h2>
          {g.caption ? <p className="mt-1 text-sm text-ink2">{g.caption}</p> : null}
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {g.images.map((img) => (
              <li key={img.id} className="overflow-hidden rounded-2xl border border-line bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.therapistName || img.caption || g.title} className="h-40 w-full object-cover" />
                {(img.therapistName || img.caption) && (
                  <p className="px-3 py-2 text-xs text-ink2">
                    {img.therapistName}
                    {img.therapistName && img.caption ? " · " : ""}
                    {img.caption}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      {videoLinks.length > 0 ? (
        <div>
          <h2 className="font-display text-2xl">Videos</h2>
          <ul className="mt-3 space-y-2">
            {videoLinks.map((v) => (
              <li key={v.id}>
                <a href={v.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-goldink underline">
                  {v.title || "Watch video"}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
