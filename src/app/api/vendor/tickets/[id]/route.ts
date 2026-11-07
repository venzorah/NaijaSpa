import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { jsonError, rateLimit } from "@/lib/http";
import { replyToVendorTicket } from "@/lib/vendor-support";
export async function POST(req: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    try {
        const user = await requireVendor();
        const { id } = await params;
        await rateLimit(`vendor-ticket:${user.id}`, 20, 60000);
        const { message } = z.object({ message: z.string().trim().min(4).max(10000) }).parse(await req.json());
        const ticket = await replyToVendorTicket(id, user.id, message);
        return NextResponse.json({ ticket });
    }
    catch (e) {
        return jsonError(e);
    }
}
