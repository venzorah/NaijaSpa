import { PrismaClient } from "@prisma/client";
import { DEFAULT_COMMERCIAL, type CommercialConfig } from "./commercial";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getCommercialConfig(): Promise<CommercialConfig> {
  const rows = await prisma.systemConfig.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  return {
    spaSurchargeKobo: Number(map.spaSurchargeKobo ?? DEFAULT_COMMERCIAL.spaSurchargeKobo),
    hotelSurchargeKobo: Number(map.hotelSurchargeKobo ?? DEFAULT_COMMERCIAL.hotelSurchargeKobo),
    homeSurchargeKobo: Number(map.homeSurchargeKobo ?? DEFAULT_COMMERCIAL.homeSurchargeKobo),
    surchargeRecipient: (map.surchargeRecipient as CommercialConfig["surchargeRecipient"]) ?? "vendor",
    freeCommissionBps: Number(map.freeCommissionBps ?? DEFAULT_COMMERCIAL.freeCommissionBps),
    paidCommissionBps: Number(map.paidCommissionBps ?? DEFAULT_COMMERCIAL.paidCommissionBps),
    graceDays: Number(map.graceDays ?? DEFAULT_COMMERCIAL.graceDays)
  };
}

export async function setConfig(key: string, value: string) {
  await prisma.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
}
