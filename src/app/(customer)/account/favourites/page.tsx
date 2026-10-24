import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FavouritesTabs } from "@/components/favourites-tabs";
import { PageHeader } from "@/components/page-header";
import { PHOTOS, publicWellnessPhoto } from "@/lib/photos";

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
    ? await prisma.vendor.findMany({ where: { id: { in: vendorIds } }, select: { id: true, slug: true, businessName: true, city: true, neighbourhood: true, coverUrl: true } })
    : [];
  const vendorMap = new Map(vendors.map((v) => [v.id, v]));
  const services = items
    .filter((i) => i.service)
    .map((i) => ({
      id: i.id,
      href: `/services/${i.service!.slug}`,
      name: i.service!.name,
      subtitle: i.service!.vendor.businessName,
      image: publicWellnessPhoto(i.service!.imageUrl, PHOTOS.massage),
      priceKobo: i.service!.basePriceKobo
    }));
  const providers = vendorIds.map((id) => {
    const v = vendorMap.get(id);
    return {
      id,
      href: v ? `/providers/${v.slug}` : "/explore",
      name: v?.businessName || "Saved spa",
      subtitle: [v?.neighbourhood, v?.city].filter(Boolean).join(", "),
      image: publicWellnessPhoto(v?.coverUrl, PHOTOS.spa)
    };
  });
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 lg:px-8">
      <PageHeader title="Favourites" subtitle="Your saved spas and treatments, ready to rebook." />
      <FavouritesTabs services={services} providers={providers} />
    </div>
  );
}
