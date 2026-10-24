import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarCheck,
  Clock,
  Leaf,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Wallet
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { PageHeader } from "@/components/page-header";
import { getDemoCms, usingDemoListings } from "@/lib/catalog";
import { PHOTOS } from "@/lib/photos";

export const dynamic = "force-dynamic";

const CORE_SLUGS = ["about", "contact", "privacy", "terms", "faq"] as const;

type CmsView = {
  title: string;
  body: string;
  metaTitle?: string;
  metaDescription?: string;
  published?: boolean;
} | null;

async function loadCms(slug: string): Promise<CmsView> {
  if (usingDemoListings()) return getDemoCms(slug);
  try {
    const { prisma } = await import("@/lib/db");
    return await prisma.cmsBlock.findUnique({ where: { key: slug } });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const block = await loadCms(slug);
  const fallback = slug === "faq" ? "Frequently asked questions" : slug.replace(/-/g, " ");
  return {
    title: block?.metaTitle || block?.title || fallback,
    description: block?.metaDescription || (block?.body ? block.body.slice(0, 160) : undefined)
  };
}

const LEGAL: Record<string, { title: string; sections: [string, string][] }> = {
  privacy: {
    title: "Privacy policy",
    sections: [
      [
        "Information we collect",
        "Account details (name, email, phone), booking history, approximate location to show nearby providers, and device information needed to run the app."
      ],
      [
        "How we use it",
        "To process bookings, send reminders and receipts, prevent fraud, and improve recommendations. We never sell your personal data."
      ],
      ["Payments", "Payments are handled by Paystack. NaijaSpa does not receive or store your full card details."],
      [
        "Your rights",
        "Under the Nigeria Data Protection Act 2023 you can access, correct or delete your data at any time from Account settings."
      ],
      ["Contact", "Write to concierge@naijaspa.com for privacy requests."]
    ]
  },
  terms: {
    title: "Terms of service",
    sections: [
      [
        "Using NaijaSpa",
        "NaijaSpa is a marketplace connecting customers with independent spa and wellness providers. Providers are responsible for the services they deliver."
      ],
      [
        "Bookings & payment",
        "Prices are in Naira. Hotel and home add-ons are set by each vendor and shown before payment. Bookings confirm only after verified Paystack payment."
      ],
      ["Cancellations", "Each provider sets its own cancellation window, displayed on its profile and at checkout."],
      [
        "Conduct",
        "NaijaSpa is strictly for professional wellness services. Inappropriate requests result in immediate account suspension."
      ],
      ["Reviews", "Only customers with completed bookings may review. Reviews must be honest and respectful."]
    ]
  }
};

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const extra = await loadCms(slug);
  if (!(CORE_SLUGS as readonly string[]).includes(slug)) {
    if (!extra?.published) notFound();
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
        <PageHeader title={extra.title} />
        <div className="rounded-3xl border border-line bg-card p-6">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink2">{extra.body}</p>
        </div>
      </div>
    );
  }

  if (slug === "faq") {
    let faqs: { question: string; answer: string }[] = [];
    if (usingDemoListings()) {
      const { demoFaqs } = await import("@/lib/demo-catalog");
      faqs = demoFaqs;
    } else {
      try {
        const { prisma } = await import("@/lib/db");
        faqs = await prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: "asc" } });
      } catch {
        faqs = [];
      }
    }
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
        <PageHeader title="Frequently asked questions" subtitle="Everything you need to know about booking with NaijaSpa." />
        <dl className="space-y-3">
          {faqs.map((f) => (
            <div key={f.question} className="rounded-2xl border border-line bg-card p-4">
              <dt className="font-semibold text-ink">{f.question}</dt>
              <dd className="mt-1 text-sm text-ink2">{f.answer}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 rounded-3xl border border-line bg-bg2 p-5 text-center">
          <p className="font-semibold text-ink">Still have questions?</p>
          <Link href="/contact" className="mt-3 inline-flex min-h-11 items-center rounded-full bg-gold px-5 text-sm font-bold text-ongold">
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  if (slug === "about") {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8">
        <PageHeader title={extra?.title || "About NaijaSpa"} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={PHOTOS.hero1} alt="" className="h-56 w-full rounded-3xl object-cover md:h-80" />
        <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 leading-relaxed text-ink2">
            {extra?.body ? (
              <p className="whitespace-pre-wrap">{extra.body}</p>
            ) : (
              <>
                <p>
                  NaijaSpa was built in Lagos with one belief: everyone deserves easy access to trusted, professional wellness. We
                  bring together Nigeria’s spas, massage therapists and beauty studios in one app.
                </p>
                <p>
                  Verified partners are reviewed by our team. Reviews come from real, completed bookings. Payments stay on
                  Paystack — we never store card numbers.
                </p>
              </>
            )}
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {[
              ["Live", "Verified providers"],
              ["NGN", "Prices in Naira"],
              ["Paystack", "Secure checkout"],
              ["5 hubs", "Lagos to Anambra"]
            ].map(([v, l]) => (
              <li key={l} className="rounded-3xl border border-line bg-card p-4">
                <p className="font-display text-3xl font-semibold text-goldink">{v}</p>
                <p className="text-xs text-ink2">{l}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            [ShieldCheck, "Trust first", "Verification, certifications and secure Paystack payments."],
            [Leaf, "Rooted in Naija", "Celebrating local botanicals and Nigerian wellness craft."],
            [Users, "Fair to vendors", "Transparent commissions and payouts after verified payments."]
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof ShieldCheck;
            return (
              <div key={t as string} className="rounded-3xl border border-line bg-card p-5">
                <I className="h-6 w-6 text-leaf" aria-hidden />
                <p className="mt-3 font-semibold text-ink">{t as string}</p>
                <p className="mt-1 text-sm text-ink2">{d as string}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (slug === "contact") {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-6 lg:px-8">
        <PageHeader title={extra?.title || "Contact us"} subtitle="We’re here 8 AM – 10 PM, every day." />
        <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <ul className="space-y-3">
            {[
              [Mail, "Email", "concierge@naijaspa.com"],
              [Phone, "Phone", "+234 1 555 0100"],
              [MapPin, "Office", "Lagos, Nigeria"],
              [Clock, "Hours", "Daily, 8:00 AM – 10:00 PM WAT"]
            ].map(([Icon, l, v]) => {
              const I = Icon as typeof Mail;
              return (
                <li key={l as string} className="flex gap-3 rounded-3xl border border-line bg-card p-4">
                  <I className="mt-0.5 h-5 w-5 text-leaf" aria-hidden />
                  <div>
                    <p className="text-xs text-ink2">{l as string}</p>
                    <p className="font-semibold text-ink">{v as string}</p>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="rounded-3xl border border-line bg-card p-5">
            <ContactForm />
          </div>
        </div>
      </div>
    );
  }

  const doc = LEGAL[slug];
  if (!doc) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <PageHeader title={extra?.title || doc.title} subtitle="Last updated 24 October 2026 · For legal review" />
      <div className="space-y-6 rounded-3xl border border-line bg-card p-6">
        {doc.sections.map(([h, p], i) => (
          <section key={h}>
            <h2 className="font-semibold text-ink">
              {i + 1}. {h}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink2">{p}</p>
          </section>
        ))}
        {extra?.body ? (
          <section>
            <h2 className="font-semibold text-ink">Additional notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink2">{extra.body}</p>
          </section>
        ) : null}
      </div>
    </div>
  );
}
