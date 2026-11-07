import Link from "next/link";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { Panel } from "@/components/admin/panel";
import { LogoutButton } from "@/components/logout-button";
import { adminBtnOutline } from "@/components/admin/form-row";
export default async function Page() { const user = await requireVendor(); const [account, count] = await Promise.all([prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true, googleId: true, emailVerifiedAt: true } }), prisma.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } })]); return <div className="grid gap-4 lg:grid-cols-2"><Panel title="Password & sign-in"><p className="text-sm">{account.email}</p><p className="mt-2 text-sm text-ink2">{account.googleId ? 'Google sign-in is connected.' : 'Sign in with your email and password.'} Use the email verification flow to reset your password.</p><Link href="/forgot?portal=vendor" className={`${adminBtnOutline} mt-4`}>Reset password</Link></Panel><Panel title="Sessions"><p className="text-sm text-ink2">{count} active session{count === 1 ? '' : 's'}. Resetting your password revokes existing sessions.</p><LogoutButton href="/login/vendor" className="mt-4"/></Panel></div>; }
