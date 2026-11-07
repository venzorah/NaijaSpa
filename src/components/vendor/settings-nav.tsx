"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function VendorSettingsNav() { const path = usePathname(); return <nav aria-label="Settings sections" className="mb-7 flex w-fit max-w-full flex-wrap gap-1 rounded-lg bg-elev p-1">{[['/vendor/settings', 'Appearance'], ['/vendor/settings/notifications', 'Notifications'], ['/vendor/settings/team', 'Team members'], ['/vendor/settings/security', 'Password & security']].map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined} className="vendor-tab text-ink2">{label}</Link>)}</nav>; }
