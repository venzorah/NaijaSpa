import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";
import { audit } from "@/lib/audit";
import { setConfig } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { getRefundPolicy } from "@/lib/refunds";
import { parseRefundPolicy, REFUND_CONFIG_KEY } from "@/lib/refund-policy";

export async function GET() {
  try {
    await requireAdmin(["finance.view", "finance.manage"]);
    return NextResponse.json({ policy: await getRefundPolicy() });
  } catch (e) {
    return jsonError(e);
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireAdmin("finance.manage");
    const before = await getRefundPolicy();
    const body = z
      .object({
        paystackRefundsEnabled: z.boolean(),
        adminRefundsEnabled: z.boolean(),
        customerCancelEnabled: z.boolean(),
        autoRefundOnCancel: z.boolean(),
        vendorCancelQueuesRefund: z.boolean(),
        freeCancelHours: z.number().min(0).max(720),
        latePenaltyPercent: z.number().min(0).max(100),
        noShowPenaltyPercent: z.number().min(0).max(100),
        minRefundNaira: z.number().min(0).max(1_000_000)
      })
      .parse(await req.json());
    const policy = parseRefundPolicy(
      JSON.stringify({
        paystackRefundsEnabled: body.paystackRefundsEnabled,
        adminRefundsEnabled: body.adminRefundsEnabled,
        customerCancelEnabled: body.customerCancelEnabled,
        autoRefundOnCancel: body.autoRefundOnCancel,
        vendorCancelQueuesRefund: body.vendorCancelQueuesRefund,
        freeCancelHours: body.freeCancelHours,
        latePenaltyBps: Math.round(body.latePenaltyPercent * 100),
        noShowPenaltyBps: Math.round(body.noShowPenaltyPercent * 100),
        minRefundKobo: Math.round(body.minRefundNaira * 100)
      })
    );
    await setConfig(REFUND_CONFIG_KEY, JSON.stringify(policy));
    await audit({
      actorId: actor.id,
      action: "refund.policy_update",
      entityType: "SystemConfig",
      entityId: REFUND_CONFIG_KEY,
      before,
      after: policy
    });
    return NextResponse.json({ policy });
  } catch (e) {
    return jsonError(e);
  }
}
