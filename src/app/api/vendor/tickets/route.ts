import { NextResponse } from "next/server";
import { z } from "zod";
import { requireVendor } from "@/lib/vendor-auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { vendorTicketSelect } from "@/lib/vendor-support";
export async function GET() {
    try {
        const user = await requireVendor();
        const tickets = await prisma.supportTicket.findMany({
            where: { authorId: user.id },
            orderBy: { createdAt: "desc" },
            select: vendorTicketSelect
        });
        return NextResponse.json({ tickets });
    }
    catch (e) {
        return jsonError(e);
    }
}
export async function POST(req: Request) {
    try {
        const user = await requireVendor();
        const body = z.object({ subject: z.string().trim().min(4).max(200), message: z.string().trim().min(4).max(10000) }).parse(await req.json());
        const ticket = await prisma.supportTicket.create({
            data: {
                authorId: user.id,
                subject: body.subject,
                messages: { create: { authorId: user.id, body: body.message } }
            },
            select: vendorTicketSelect
        });
        return NextResponse.json({ ticket });
    }
    catch (e) {
        return jsonError(e);
    }
}
