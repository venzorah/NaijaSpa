import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicVendor } from "@/lib/catalog";
import { formatNgn } from "@/lib/money";
import { TherapistGalleries } from "@/components/therapist-galleries";

export const dynamic = "force-dynamic";

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicVendor(slug);
  if (!data) notFound();
  const { vendor, description, services, galleries, videoLinks } = data;
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-4xl">{vendor.businessName}</h1>
      <p className="text-ink2">
        {vendor.neighbourhood}, {vendor.city} {vendor.verificationStatus === "verified" ? "· Verified" : ""}
      </p>
      <TherapistGalleries
        galleries={galleries}
        videoLinks={videoLinks}
        coverUrl={"coverUrl" in vendor ? String(vendor.coverUrl || "") : undefined}
      />
      <p className="mt-6 max-w-2xl text-sm">{description}</p>
      {vendor.publicPhone || vendor.publicWhatsapp ? (
        <p className="mt-3 text-sm">
          {vendor.publicPhone} {vendor.publicWhatsapp && <a href={vendor.publicWhatsapp}>WhatsApp</a>}
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink2">Contact details are not public for this listing.</p>
      )}
      <ul className="mt-8 space-y-3">
        {services.map((s) => (
          <li key={s.id} className="flex items-center justify-between rounded-2xl border border-line bg-card p-4">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-goldink">{formatNgn(s.basePriceKobo)} · {s.durationMin} min</p>
            </div>
            <Link href={`/services/${s.slug}`} className="rounded-full bg-gold px-4 py-2 text-sm font-bold text-ongold">
              View
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
