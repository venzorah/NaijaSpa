import Link from "next/link";
import { Bell, KeyRound, Palette, Users } from "lucide-react";
import { VendorAppearance } from "@/components/vendor/appearance";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { isProductOnlyVendor } from "@/lib/shop/vendor-kind";

export default async function Page() {
  const user = await requireVendor();
  const vendor = user.vendorId
    ? await prisma.vendor.findUnique({ where: { id: user.vendorId }, select: { commerceKind: true } })
    : null;
  const productOnly = isProductOnlyVendor(vendor?.commerceKind);
  const links = [
    { href: "/vendor/settings/security", label: "Password & sign-in", body: "Reset password and review sessions", icon: KeyRound },
    { href: "/vendor/settings/notifications", label: "Notifications", body: "Email and in-app alerts", icon: Bell },
    ...(productOnly
      ? []
      : [{ href: "/vendor/settings/team", label: "Team", body: "Portal accounts and therapists", icon: Users }])
  ];
  return (
    <div className="grid gap-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex gap-3 rounded-2xl border border-line bg-card p-4 hover:border-gold/40">
                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden />
                <span>
                  <span className="block font-semibold">{item.label}</span>
                  <span className="mt-1 block text-sm text-ink2">{item.body}</span>
                </span>
              </Link>
            </li>
          );
        })}
        <li className="flex gap-3 rounded-2xl border border-line bg-card p-4 sm:col-span-2">
          <Palette className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden />
          <span>
            <span className="block font-semibold">Appearance</span>
            <span className="mt-1 block text-sm text-ink2">Theme for this device</span>
          </span>
        </li>
      </ul>
      <VendorAppearance />
    </div>
  );
}
