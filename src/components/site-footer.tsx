import Link from "next/link";
import { Download, Facebook, Instagram, Mail, Phone, Twitter } from "lucide-react";

const groups = [
  {
    title: "Discover",
    links: [
      { label: "Explore spas", href: "/explore" },
      { label: "Ask NaijaSpa AI", href: "/ai" },
      { label: "Membership", href: "/account/membership" }
    ]
  },
  {
    title: "Company",
    links: [
      { label: "About us", href: "/about" },
      { label: "Become a vendor", href: "/become-a-vendor" },
      { label: "Contact", href: "/contact" }
    ]
  },
  {
    title: "Help",
    links: [
      { label: "FAQs", href: "/faq" },
      { label: "Support", href: "/account/support" },
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" }
    ]
  }
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-bg2">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link href="/" aria-label="NaijaSpa home" className="inline-flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-horizontal.png" alt="" className="h-12 w-auto max-w-[12rem] object-contain object-left dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-horizontal-dark.png"
              alt=""
              className="hidden h-12 w-auto max-w-[12rem] object-contain object-left mix-blend-screen dark:block"
            />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink2">
            Nigeria’s curated marketplace for verified spas, massage therapists and wellness experiences.
          </p>
          <div className="mt-5 space-y-2 text-sm text-ink2">
            <p className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-leaf" aria-hidden /> concierge@naijaspa.com
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-leaf" aria-hidden /> +234 1 555 0100
            </p>
          </div>
          <Link
            href="/install"
            className="mt-5 inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gold/50 px-4 text-sm font-semibold text-goldink hover:bg-gold/10"
          >
            <Download className="h-4 w-4" aria-hidden /> Install the app
          </Link>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-goldink">{g.title}</h3>
            <ul className="mt-3 space-y-1">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-[36px] items-center text-sm text-ink2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-ink2 sm:flex-row lg:px-8">
          <p>© {new Date().getFullYear()} NaijaSpa Technologies Ltd. Lagos, Nigeria. Payments secured by Paystack.</p>
          <div className="flex gap-1">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-elev" aria-hidden>
              <Instagram className="h-4 w-4" />
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-elev" aria-hidden>
              <Twitter className="h-4 w-4" />
            </span>
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-ink2 hover:bg-elev" aria-hidden>
              <Facebook className="h-4 w-4" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
