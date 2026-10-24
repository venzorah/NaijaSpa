import { VendorProfileGallery, type ProfileGalleryImage } from "@/components/vendor-profile-gallery";
import { extraNamedGalleries, profileImagesFromGalleries } from "@/lib/galleries";

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
  videoLinks
}: {
  galleries: PublicGallery[];
  videoLinks: PublicVideoLink[];
}) {
  const profileImages = profileImagesFromGalleries(galleries);
  const named = extraNamedGalleries(galleries);
  if (profileImages.length === 0 && named.length === 0 && videoLinks.length === 0) return null;
  return (
    <section className="mt-6 space-y-8">
      <VendorProfileGallery images={profileImages} />
      {named.map((g) => (
        <div key={g.id}>
          {g.caption ? <p className="-mb-6 mt-2 text-sm text-ink2">{g.caption}</p> : null}
          <VendorProfileGallery images={g.images} heading={g.title} />
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
