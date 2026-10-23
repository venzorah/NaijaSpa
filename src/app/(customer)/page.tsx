import Link from "next/link";
import { prisma } from "@/lib/db";
import { vendorEntitlement } from "@/lib/entitlements";
import { sanitizePublicVendor } from "@/lib/commercial";
import { formatNgn } from "@/lib/money";

export default async function HomePage() {
  const [categories, services, faqs, campaigns] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.service.findMany({
      where: { active: true, vendor: { visibility: "public", applicationStatus: "approved" } },
      include: { vendor: true, category: true },
      take: 12
    }),
    prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
    prisma.campaign.findMany({
      where: { active: true, placement: "homepage_featured", startsAt: { lte: new Date() }, endsAt: { gte: new Date() } },
      include: { vendor: true }
    })
  ]);

  const cards = [];
  for (const s of services) {
    const ent = await vendorEntitlement(s.vendorId);
    cards.push({
      service: s,
      vendor: sanitizePublicVendor(s.vendor, ent),
      sponsored: campaigns.some((c) => c.vendorId === s.vendorId)
    });
  }

  return (
    <div>
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-8 lg:px-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-goldink">Nigeria · Wellness marketplace</p>
        <h1 className="mt-2 font-display text-4xl font-semibold leading-tight md:text-6xl">Find your calm.</h1>
        <p className="mt-3 max-w-xl text-ink2">Verified spas, massage therapists and wellness studios. Book Spa/Office, hotel or home visits in Naira.</p>
        <form action="/explore" className="mt-6 flex flex-col gap-2 rounded-3xl border border-line bg-card p-3 sm:flex-row">
          <input name="q" placeholder="Search treatments or providers" className="min-h-12 flex-1 rounded-2xl bg-elev px-4 text-sm outline-none" />
          <input name="city" placeholder="Lagos" className="min-h-12 rounded-2xl bg-elev px-4 text-sm outline-none sm:w-40" />
          <button className="min-h-12 rounded-full bg-gold px-6 text-sm font-bold text-ongold">Search</button>
        </form>
        <Link href="/ai" className="mt-3 inline-flex text-sm font-semibold text-goldink">
          Ask NaijaSpa AI →
        </Link>
      </section>

      <section className="mx-auto max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">Popular categories</h2>
        <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto pb-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/explore?category=${c.slug}`} className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm font-semibold">
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">Featured services</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ service, vendor, sponsored }) => (
            <Link key={service.id} href={`/services/${service.slug}`} className="overflow-hidden rounded-3xl border border-line bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={service.imageUrl || "/brand/icon-green.png"} alt="" className="h-40 w-full object-cover" />
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-ink2">{vendor.businessName}</p>
                  {sponsored && <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase text-goldink">Sponsored</span>}
                </div>
                <h3 className="mt-1 font-semibold">{service.name}</h3>
                <p className="mt-1 text-sm text-goldink">{formatNgn(service.basePriceKobo)} · {service.durationMin} min</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">How NaijaSpa works</h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {["Search verified providers", "Choose location and time", "Pay securely — confirmed only after verification"].map((s, i) => (
            <li key={s} className="rounded-3xl border border-line bg-card p-5">
              <p className="text-goldink">{i + 1}</p>
              <p className="mt-2 font-semibold">{s}</p>
            </li>
          ))}
        </ol>
        <Link href="/vendor/onboarding" className="mt-6 inline-flex rounded-full border border-gold/50 px-5 py-3 text-sm font-bold text-goldink">
          Become a vendor
        </Link>
      </section>

      <section className="mx-auto mt-10 max-w-3xl px-4 lg:px-8">
        <h2 className="font-display text-2xl">FAQs</h2>
        <dl className="mt-4 space-y-3">
          {faqs.map((f) => (
            <div key={f.id} className="rounded-2xl border border-line bg-card p-4">
              <dt className="font-semibold">{f.question}</dt>
              <dd className="mt-1 text-sm text-ink2">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </section>

      <footer className="mx-auto mt-16 max-w-7xl px-4 pb-10 text-sm text-ink2 lg:px-8">
        <div className="flex flex-wrap gap-4">
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/vendor/login">Vendor</Link>
          <Link href="/admin">Admin</Link>
        </div>
        <p className="mt-4">© {new Date().getFullYear()} NaijaSpa · WELLNESS · BEAUTY · RELAXATION · MORE</p>
      </footer>
    </div>
  );
}
