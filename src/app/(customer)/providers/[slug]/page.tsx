import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { sanitizePublicVendor } from "@/lib/commercial";
import { formatNgn } from "@/lib/money";

export default async function ProviderPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: { services: { where: { active: true }, include: { category: true } } }
  });
  if (!vendor || vendor.visibility !== "public") notFound();
  const ent = await vendorEntitlement(vendor.id);
  const pub = sanitizePublicVendor(vendor, ent);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="font-display text-4xl">{pub.businessName}</h1>
      <p className="text-ink2">
        {vendor.neighbourhood}, {vendor.city} {vendor.verificationStatus === "verified" ? "· Verified" : ""}
      </p>
      <p className="mt-4 max-w-2xl text-sm">{vendor.description}</p>
      {pub.publicPhone || pub.publicWhatsapp ? (
        <p className="mt-3 text-sm">
          {pub.publicPhone} {pub.publicWhatsapp && <a href={pub.publicWhatsapp}>WhatsApp</a>}
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink2">Contact details are not public for this listing.</p>
      )}
      <ul className="mt-8 space-y-3">
        {vendor.services.map((s) => (
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
