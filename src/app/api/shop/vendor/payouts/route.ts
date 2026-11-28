import { NextResponse } from "next/server";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError } from "@/lib/http";
import { ROLES } from "@/lib/rbac";
import { payShopVendorBalance } from "@/lib/shop/payout";
import { shopPayoutMode } from "@/lib/shop/ensure";

export async function POST() {
  try {
    const user = await requireVendor();
    if (user.role !== ROLES.VENDOR_OWNER) {
      return NextResponse.json({ error: "Only the business owner can request a payout." }, { status: 403 });
    }
    const mode = await shopPayoutMode();
    if (mode !== "request") {
      return NextResponse.json({ error: "Shop payouts are sent automatically. Add a bank account and wait for the hold period." }, { status: 409 });
    }
    const payout = await payShopVendorBalance(user.vendorId);
    return NextResponse.json({ ok: true, payout });
  } catch (e) {
    return jsonError(e);
  }
}
