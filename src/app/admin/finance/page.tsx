import { Banknote, Landmark, RotateCcw, Wallet } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { bookingReference } from "@/lib/phone";
import { getRefundPolicy } from "@/lib/refunds";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { FinanceConsole } from "@/components/admin/finance-console";
import { RefundPolicyConsole } from "@/components/admin/refund-policy-console";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const { editable } = await requireAdminScreen("finance");
  const [payments, refunds, earnings, payouts, policy, collectedAgg, refundedAgg, payableAgg, paidOutAgg] = await Promise.all([
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, reference: true, purpose: true, status: true, amountKobo: true, createdAt: true }
    }),
    prisma.refund.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        amountKobo: true,
        penaltyKobo: true,
        status: true,
        reason: true,
        createdAt: true,
        bookingId: true,
        payment: { select: { reference: true } }
      }
    }),
    prisma.vendorEarning.findMany({
      take: 50,
      select: { id: true, payableKobo: true, commissionKobo: true, status: true, vendor: { select: { businessName: true } } }
    }),
    prisma.payout.findMany({
      include: { vendor: { select: { businessName: true } } },
      orderBy: { createdAt: "desc" },
      take: 50
    }),
    getRefundPolicy(),
    prisma.payment.aggregate({ where: { status: "success" }, _sum: { amountKobo: true } }),
    prisma.refund.aggregate({ where: { status: "processed" }, _sum: { amountKobo: true } }),
    prisma.vendorEarning.aggregate({ where: { status: "pending" }, _sum: { payableKobo: true } }),
    prisma.payout.aggregate({ where: { status: "paid" }, _sum: { amountKobo: true } })
  ]);
  const collected = collectedAgg._sum.amountKobo ?? 0;
  const refunded = refundedAgg._sum.amountKobo ?? 0;
  const payable = payableAgg._sum.payableKobo ?? 0;
  const paidOut = paidOutAgg._sum.amountKobo ?? 0;
  return (
    <div>
      <AdminPageHeader screen="finance" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={formatNgn(collected)} icon={Wallet} sub="Verified payments" />
        <StatCard label="Refunds" value={formatNgn(refunded)} icon={RotateCcw} />
        <StatCard label="Pending vendor payable" value={formatNgn(payable)} icon={Banknote} emphasis="gold" />
        <StatCard label="Paid out" value={formatNgn(paidOut)} icon={Landmark} />
      </div>
      <div className="mb-4">
        <RefundPolicyConsole initial={policy} canEdit={editable} />
      </div>
      <FinanceConsole
        editable={editable}
        payments={payments.map((p) => ({
          id: p.id,
          reference: p.reference,
          purpose: p.purpose,
          status: p.status,
          amountKobo: p.amountKobo,
          createdAt: p.createdAt.toLocaleString("en-NG")
        }))}
        refunds={refunds.map((r) => ({
          id: r.id,
          amountKobo: r.amountKobo,
          penaltyKobo: r.penaltyKobo,
          status: r.status,
          reason: r.reason,
          createdAt: r.createdAt.toLocaleString("en-NG"),
          paymentRef: r.payment.reference,
          bookingId: r.bookingId,
          bookingRef: r.bookingId ? bookingReference(r.bookingId) : null
        }))}
        earnings={earnings.map((e) => ({
          id: e.id,
          vendor: e.vendor.businessName,
          payableKobo: e.payableKobo,
          commissionKobo: e.commissionKobo,
          status: e.status
        }))}
        payouts={payouts.map((p) => ({
          id: p.id,
          vendor: p.vendor.businessName,
          amountKobo: p.amountKobo,
          status: p.status,
          note: p.note,
          createdAt: p.createdAt.toLocaleString("en-NG")
        }))}
      />
    </div>
  );
}
