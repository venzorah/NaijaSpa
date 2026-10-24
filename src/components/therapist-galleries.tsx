import { VendorProfileGallery, type ProfileGalleryImage } from "@/components/vendor-profile-gallery";
import { collectProfileGalleryImages, extraNamedGalleries } from "@/lib/galleries";

export type PublicGalleryImage = ProfileGalleryImage;

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
  videoLinks,
  coverUrl
}: {
  galleries: PublicGallery[];
  videoLinks: PublicVideoLink[];
  coverUrl?: string | null;
}) {
  const profileImages = collectProfileGalleryImages(galleries, [coverUrl]);
  const named = extraNamedGalleries(galleries);
  if (profileImages.length === 0 && named.length === 0 && videoLinks.length === 0) return null;
  return (
    <section className="mt-6 space-y-8">
      <VendorProfileGallery images={profileImages} />
      {named.map((g) => (
        <VendorProfileGallery key={g.id} images={g.images} heading={g.title} />
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
