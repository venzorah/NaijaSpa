import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicService } from "@/lib/catalog";
import { formatNgn } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicService(slug);
  if (!data) notFound();
  const { service, vendor, quotes } = data;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={service.imageUrl || "/brand/icon-green.png"} alt="" className="h-56 w-full rounded-3xl object-cover" />
      <p className="mt-4 text-sm text-ink2">
        <Link href={`/providers/${vendor.slug}`}>{vendor.businessName}</Link>
        {vendor.verificationStatus === "verified" ? " · Verified" : ""}
      </p>
      <h1 className="font-display text-4xl">{service.name}</h1>
      <p className="mt-2 text-ink2">{service.description}</p>
      <p className="mt-3 font-semibold">{service.durationMin} minutes</p>
      <div className="mt-4 space-y-2 rounded-3xl border border-line bg-card p-4">
        {quotes.map(({ l, q }) => (
          <p key={l} className="text-sm">
            <span className="capitalize">{l === "spa" ? "Spa/Office" : l}</span>: {formatNgn(q.basePriceKobo)}
            {q.surchargeKobo ? ` + ${formatNgn(q.surchargeKobo)} surcharge` : ""} = {formatNgn(q.customerTotalKobo)}
          </p>
        ))}
      </div>
      {vendor.publicPhone || vendor.publicWhatsapp ? (
        <p className="mt-3 text-sm">
          {vendor.publicPhone && <span>Phone {vendor.publicPhone} </span>}
          {vendor.publicWhatsapp && (
            <a className="text-leaf" href={vendor.publicWhatsapp}>
              WhatsApp
            </a>
          )}
        </p>
      ) : (
        <p className="mt-3 text-xs text-ink2">Direct phone/WhatsApp is hidden for this provider. Book through NaijaSpa.</p>
      )}
      <Link href={`/book/${service.id}`} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-gold px-6 font-bold text-ongold">
        Book now
      </Link>
    </div>
  );
}
