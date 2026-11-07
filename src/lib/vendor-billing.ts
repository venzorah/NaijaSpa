import { prisma } from "@/lib/db";

export type VendorBillingPage = {
  rows: {
    id: string;
    reference: string;
    plan: string;
    startsAt: string;
    endsAt: string;
    createdAt: string;
    amountKobo: number;
    status: string;
  }[];
  page: number;
  pageSize: number;
  total: number;
  pages: number;
};

export async function getVendorBillingHistory(vendorId: string, requestedPage = 1, query = ""): Promise<VendorBillingPage> {
  const subscriptions = await prisma.vendorSubscription.findMany({
    where: { vendorId },
    select: { id: true, startsAt: true, endsAt: true, plan: { select: { name: true } } }
  });
  const where = {
    purpose: "subscription",
    subscriptionId: { in: subscriptions.map(subscription => subscription.id) },
    ...(query ? { reference: { contains: query, mode: "insensitive" as const } } : {})
  };
  const total = await prisma.payment.count({ where });
  const pageSize = 10;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.max(1, Math.min(pages, requestedPage));
  const payments = await prisma.payment.findMany({
    where,
    select: { id: true, reference: true, subscriptionId: true, createdAt: true, amountKobo: true, status: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize
  });
  const byId = new Map(subscriptions.map(subscription => [subscription.id, subscription]));
  return {
    rows: payments.map(payment => {
      const subscription = byId.get(payment.subscriptionId!);
      return {
        id: payment.id,
        reference: payment.reference,
        plan: subscription!.plan.name,
        startsAt: subscription!.startsAt.toISOString(),
        endsAt: subscription!.endsAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
        amountKobo: payment.amountKobo,
        status: payment.status
      };
    }),
    page, pageSize, total, pages
  };
}
