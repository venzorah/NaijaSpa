import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError } from "@/lib/http";
import { listPayoutBanks, maskAccountNumber, saveVendorPayoutAccount } from "@/lib/payouts";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireVendor();
    const [vendor, banks] = await Promise.all([
      prisma.vendor.findUniqueOrThrow({
        where: { id: user.vendorId },
        select: {
          payoutBankCode: true,
          payoutBankName: true,
          payoutAccountNumber: true,
          payoutAccountName: true,
          payoutRecipientCode: true
        }
      }),
      listPayoutBanks()
    ]);
    return NextResponse.json({
      account: {
        bankCode: vendor.payoutBankCode,
        bankName: vendor.payoutBankName,
        accountNumberMasked: maskAccountNumber(vendor.payoutAccountNumber),
        accountName: vendor.payoutAccountName,
        ready: Boolean(vendor.payoutRecipientCode || vendor.payoutAccountNumber)
      },
      banks
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireVendor();
    const body = z.object({ bankCode: z.string().min(1), accountNumber: z.string().min(8) }).parse(await req.json());
    const saved = await saveVendorPayoutAccount(user.vendorId, body.bankCode, body.accountNumber);
    return NextResponse.json({
      account: {
        bankCode: saved.payoutBankCode,
        bankName: saved.payoutBankName,
        accountNumberMasked: maskAccountNumber(saved.payoutAccountNumber),
        accountName: saved.payoutAccountName,
        ready: Boolean(saved.payoutRecipientCode || saved.payoutAccountNumber)
      }
    });
  } catch (e) {
    return jsonError(e);
  }
}
