import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FavouritesTabs } from "@/components/favourites-tabs";
import { PageHeader } from "@/components/page-header";
import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";
import { PUBLIC_LIVE_VENDOR_WHERE } from "@/lib/vendor-public-profile";

export default async function FavPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/account/favourites");
  const items = await prisma.favourite.findMany({
    where: { userId: user.id },
    include: { service: { include: { vendor: true } } },
    orderBy: { createdAt: "desc" }
  });
  const vendorIds = [...new Set(items.map((i) => i.vendorId).filter((id): id is string => Boolean(id)))];
  const vendors = vendorIds.length
    ? await prisma.vendor.findMany({
        where: { id: { in: vendorIds }, ...PUBLIC_LIVE_VENDOR_WHERE },
        select: { id: true, slug: true, businessName: true, city: true, neighbourhood: true, coverUrl: true }
      })
    : [];
  const services = items
    .filter((i) => i.service)
    .map((i) => ({
      id: i.id,
      href: `/services/${encodeURIComponent(i.service!.slug)}`,
      name: i.service!.name,
      subtitle: i.service!.vendor.businessName,
      image: publicWellnessPhoto(i.service!.imageUrl, PHOTOS.massage),
      priceKobo: i.service!.basePriceKobo
    }));
  const providers = vendors.map((v) => ({
    id: v.id,
    href: `/providers/${encodeURIComponent(v.slug)}`,
    name: v.businessName,
    subtitle: [v.neighbourhood, v.city].filter(Boolean).join(", "),
    image: publicWellnessPhoto(v.coverUrl, PHOTOS.spa)
  }));
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
      <PageHeader title="Favourites" subtitle="Your saved spas and treatments, ready to rebook." backHref="/" />
      <FavouritesTabs services={services} providers={providers} />
    </div>
  );
}
