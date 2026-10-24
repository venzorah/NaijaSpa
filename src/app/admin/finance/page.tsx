import { Banknote, Landmark, RotateCcw, Wallet } from "lucide-react";
import { requireAdminScreen } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { formatNgn } from "@/lib/money";
import { AdminPageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { FinanceConsole } from "@/components/admin/finance-console";

export default async function FinancePage() {
  const { editable } = await requireAdminScreen("finance");
  const [payments, refunds, earnings, payouts] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 80 }),
    prisma.refund.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.vendorEarning.findMany({ include: { vendor: { select: { businessName: true } } }, take: 50 }),
    prisma.payout.findMany({ include: { vendor: { select: { businessName: true } } }, orderBy: { createdAt: "desc" }, take: 50 })
  ]);
  const collected = payments.filter((p) => p.status === "success").reduce((s, p) => s + p.amountKobo, 0);
  const refunded = refunds.reduce((s, r) => s + r.amountKobo, 0);
  const payable = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + e.payableKobo, 0);
  const paidOut = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amountKobo, 0);
  return (
    <div>
      <AdminPageHeader screen="finance" />
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Collected" value={formatNgn(collected)} icon={Wallet} sub="Verified payments" />
        <StatCard label="Refunds" value={formatNgn(refunded)} icon={RotateCcw} />
        <StatCard label="Pending vendor payable" value={formatNgn(payable)} icon={Banknote} emphasis="gold" />
        <StatCard label="Paid out" value={formatNgn(paidOut)} icon={Landmark} />
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
          status: r.status,
          reason: r.reason,
          createdAt: r.createdAt.toLocaleString("en-NG")
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
