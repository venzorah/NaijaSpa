import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  CreditCard,
  FileText,
  Heart,
  HelpCircle,
  Info,
  LayoutDashboard,
  Mail,
  Settings,
  Smartphone,
  Star,
  Store
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "@/components/logout-button";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const sections: { title: string; items: { href: string; label: string; icon: typeof Heart; hint?: string }[] }[] = [
  {
    title: "My NaijaSpa",
    items: [
      { href: "/account/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/account/bookings", label: "Bookings", icon: CalendarDays },
      { href: "/account/favourites", label: "Favourites", icon: Heart },
      { href: "/account/payments", label: "Payments & receipts", icon: CreditCard },
      { href: "/account/reviews", label: "Reviews", icon: Star }
    ]
  },
  {
    title: "Help & settings",
    items: [
      { href: "/account/support", label: "Support tickets", icon: HelpCircle },
      { href: "/account/settings", label: "Account settings", icon: Settings },
      { href: "/install", label: "Install the app", icon: Smartphone },
      { href: "/faq", label: "FAQs", icon: Info },
      { href: "/contact", label: "Contact us", icon: Mail }
    ]
  },
  {
    title: "More",
    items: [
      { href: "/become-a-vendor", label: "Become a vendor", icon: Store },
      { href: "/about", label: "About NaijaSpa", icon: Info },
      { href: "/privacy", label: "Privacy policy", icon: FileText },
      { href: "/terms", label: "Terms of service", icon: FileText }
    ]
  }
];

export default async function AccountPage() {
  const user = await getSession();
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
        <div className="rounded-3xl border border-gold/40 bg-card p-6 text-center">
          <h1 className="font-display text-3xl font-semibold text-ink">Your wellness, in one place</h1>
          <p className="mt-1 text-sm text-ink2">Sign in to see bookings and favourites.</p>
          <div className="mt-5 flex gap-2">
            <Link href="/login?next=/account" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-gold text-sm font-bold text-ongold">
              Sign in
            </Link>
            <Link href="/register" className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-gold/50 text-sm font-bold text-goldink">
              Register
            </Link>
          </div>
        </div>
        {sections.map((s) => (
          <HubSection key={s.title} title={s.title} items={s.items} />
        ))}
      </div>
    );
  }

  const bookingCount = await prisma.booking.count({
    where: { customerId: user.id, status: { in: ["confirmed", "pending", "awaiting_payment", "in_progress"] } }
  });

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 lg:px-8">
      <div className="flex items-center gap-4 rounded-3xl border border-line bg-card p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold/60 bg-forest font-display text-2xl font-bold text-gold" aria-hidden>
          {initials(user.name)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-3xl font-semibold text-ink">{user.name}</h1>
          <p className="truncate text-sm text-ink2">{user.email}</p>
        </div>
      </div>
      <HubSection
        title="My NaijaSpa"
        items={sections[0].items.map((item) =>
          item.href === "/account/bookings" ? { ...item, hint: bookingCount ? `${bookingCount} open` : undefined } : item
        )}
      />
      {sections.slice(1).map((s) => (
        <HubSection key={s.title} title={s.title} items={s.items} />
      ))}
      <LogoutButton />
      <p className="mt-6 pb-4 text-center text-xs text-ink2">NaijaSpa · naijaspa.com</p>
    </div>
  );
}

function HubSection({
  title,
  items
}: {
  title: string;
  items: { href: string; label: string; icon: typeof Heart; hint?: string }[];
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-goldink">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-card">
        {items.map(({ href, label, icon: Icon, hint }) => (
          <li key={href}>
            <Link href={href} className="flex min-h-[56px] w-full items-center gap-3 px-4 text-left hover:bg-elev">
              <Icon className="h-5 w-5 text-leaf" aria-hidden />
              <span className="flex-1 text-[15px] font-medium text-ink">{label}</span>
              {hint ? <span className="text-xs text-ink2">{hint}</span> : null}
              <ChevronRight className="h-4 w-4 text-ink2" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
