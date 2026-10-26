import { prisma, getCommercialConfig } from "./db";
import { resolveVendorListingPlan } from "./vendor-plans-live";
import { queueMail, sendMail, brandedEmailHtml } from "./mail";
import { appUrl } from "./payments";
import { formatNgn } from "./money";
import {
  calendarDaysUntil,
  lapseNoticeTitle,
  paidUntilMs,
  renewalNoticeDays,
  renewalNoticeTitle
} from "./subscription-renewal";

export async function lapsePaidSubscriptionToFree(vendorId: string, paidSubId: string, at = new Date()) {
  await prisma.vendorSubscription.update({
    where: { id: paidSubId },
    data: { status: "expired" }
  });
  const active = await prisma.vendorSubscription.findFirst({
    where: { vendorId, status: { in: ["active", "grace"] } },
    include: { plan: true }
  });
  if (active?.plan.code === "FREE") return { lapsed: true, freeId: active.id };
  const free = await prisma.subscriptionPlan.findUnique({ where: { code: "FREE" } });
  if (!free) return { lapsed: true, freeId: null };
  if (active && active.plan.code !== "FREE") {
    await prisma.vendorSubscription.update({ where: { id: active.id }, data: { status: "expired" } });
  }
  const created = await prisma.vendorSubscription.create({
    data: {
      vendorId,
      planId: free.id,
      status: "active",
      source: "expiry",
      startsAt: at,
      endsAt: new Date("9999-12-31")
    }
  });
  return { lapsed: true, freeId: created.id };
}

export async function grantVendorPlan(vendorId: string, planCode: string, source = "admin_grant", at = new Date()) {
  const plan = await resolveVendorListingPlan(planCode);
  if (!plan) throw Object.assign(new Error("Unknown listing plan."), { status: 404 });
  if (!plan.active && source !== "admin_grant") {
    throw Object.assign(new Error("That listing plan is paused."), { status: 400 });
  }
  await prisma.vendorSubscription.updateMany({
    where: { vendorId, status: { in: ["active", "grace"] } },
    data: { status: "expired" }
  });
  const endsAt =
    plan.code === "FREE" || plan.priceKobo <= 0 || plan.durationDays >= 3650
      ? new Date("9999-12-31")
      : new Date(at.getTime() + plan.durationDays * 86_400_000);
  return prisma.vendorSubscription.create({
    data: {
      vendorId,
      planId: plan.id,
      status: "active",
      source,
      startsAt: at,
      endsAt
    }
  });
}

export async function processVendorPlanLifecycle(now = new Date()) {
  const config = await getCommercialConfig();
  const paid = await prisma.vendorSubscription.findMany({
    where: { status: { in: ["active", "grace"] }, plan: { code: { not: "FREE" } } },
    include: {
      plan: true,
      vendor: { include: { owner: { select: { id: true, email: true, name: true } } } }
    }
  });
  let noticed = 0;
  let lapsed = 0;
  for (const sub of paid) {
    if (now.getTime() > paidUntilMs(sub.endsAt, sub.graceUntil, config.graceDays)) {
      await lapsePaidSubscriptionToFree(sub.vendorId, sub.id, now);
      lapsed += 1;
      await notifyLapse(sub);
      continue;
    }
    const daysLeft = calendarDaysUntil(sub.endsAt, now);
    if (!renewalNoticeDays(sub.plan.durationDays).includes(daysLeft)) continue;
    const title = renewalNoticeTitle(sub.id, daysLeft);
    const exists = await prisma.notification.findFirst({
      where: { userId: sub.vendor.ownerId, title }
    });
    if (exists) continue;
    await notifyRenewal(sub, daysLeft);
    noticed += 1;
  }
  return { checked: paid.length, noticed, lapsed };
}

async function notifyRenewal(
  sub: {
    id: string;
    endsAt: Date;
    plan: { name: string; code: string; priceKobo: number; durationDays: number };
    vendor: { businessName: string; ownerId: string; owner: { id: string; email: string; name: string } };
  },
  daysLeft: number
) {
  const when = daysLeft <= 0 ? "today" : daysLeft === 1 ? "tomorrow" : `in ${daysLeft} days`;
  const body = `${sub.plan.name} renews ${when} (${sub.endsAt.toLocaleDateString("en-NG")}). ${formatNgn(sub.plan.priceKobo)}. If you do not renew, the listing returns to Free and booking commission applies.`;
  await prisma.notification.create({
    data: { userId: sub.vendor.ownerId, title: renewalNoticeTitle(sub.id, daysLeft), body }
  });
  const html = brandedEmailHtml({
    title: `Renew ${sub.plan.name}`,
    preheader: body,
    intro: `Hello ${sub.vendor.owner.name.split(" ")[0] || "there"}, your ${sub.vendor.businessName} ${sub.plan.name} plan is due ${when}.`,
    body,
    cta: { href: `${appUrl()}/vendor/subscriptions`, label: "Open subscription" }
  });
  queueMail(
    sendMail({
      to: sub.vendor.owner.email,
      subject: `Renew your NaijaSpa ${sub.plan.name} plan`,
      html,
      text: body
    })
  );
}

async function notifyLapse(sub: {
  id: string;
  plan: { name: string };
  vendor: { businessName: string; ownerId: string; owner: { id: string; email: string; name: string } };
}) {
  const title = lapseNoticeTitle(sub.id);
  const exists = await prisma.notification.findFirst({
    where: { userId: sub.vendor.ownerId, title }
  });
  if (exists) return;
  const body = `${sub.plan.name} ended without renewal. ${sub.vendor.businessName} is back on Free. Commission applies on each successful booking until you subscribe again.`;
  await prisma.notification.create({
    data: { userId: sub.vendor.ownerId, title, body }
  });
  const html = brandedEmailHtml({
    title: "Back on Free plan",
    preheader: body,
    intro: `Hello ${sub.vendor.owner.name.split(" ")[0] || "there"}, ${sub.vendor.businessName} did not renew ${sub.plan.name}.`,
    body,
    cta: { href: `${appUrl()}/vendor/subscriptions`, label: "View plans" }
  });
  queueMail(
    sendMail({
      to: sub.vendor.owner.email,
      subject: "NaijaSpa listing is back on Free",
      html,
      text: body
    })
  );
}
