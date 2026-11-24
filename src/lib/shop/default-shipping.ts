import { NIGERIA_STATES } from "@/lib/nigeria";
import { prisma } from "@/lib/db";
import type { ShopShipProfile } from "./quote";

export const DEFAULT_LOCAL_SHIP_KOBO = 200_000;
export const DEFAULT_INTERSTATE_SHIP_KOBO = 400_000;

export function defaultShopShipProfile(vendorState: string): ShopShipProfile {
  const home = vendorState.trim();
  return {
    localEnabled: true,
    localFeeKobo: DEFAULT_LOCAL_SHIP_KOBO,
    localEtaDays: 2,
    interstateOn: true,
    pickupEnabled: true,
    freeAboveKobo: 0,
    zones: NIGERIA_STATES.filter((state) => state.toLowerCase() !== home.toLowerCase()).map((state) => ({
      state,
      feeKobo: DEFAULT_INTERSTATE_SHIP_KOBO,
      etaDays: 5
    }))
  };
}

export function shopShipProfileOrDefault(
  vendorState: string,
  profile: (ShopShipProfile & { zones?: ShopShipProfile["zones"] }) | null | undefined
): ShopShipProfile {
  if (!profile || !(profile.localEnabled || profile.interstateOn || profile.pickupEnabled)) {
    return defaultShopShipProfile(vendorState);
  }
  return {
    localEnabled: profile.localEnabled,
    localFeeKobo: profile.localFeeKobo,
    localEtaDays: profile.localEtaDays,
    interstateOn: profile.interstateOn,
    pickupEnabled: profile.pickupEnabled,
    freeAboveKobo: profile.freeAboveKobo,
    zones: profile.zones ?? []
  };
}

export async function ensureVendorShopShipping(vendorId: string, vendorState: string) {
  const existing = await prisma.shopShippingProfile.findUnique({ where: { vendorId } });
  if (existing) return existing;
  const defaults = defaultShopShipProfile(vendorState);
  return prisma.shopShippingProfile.create({
    data: {
      vendorId,
      localEnabled: defaults.localEnabled,
      localFeeKobo: defaults.localFeeKobo,
      localEtaDays: defaults.localEtaDays,
      interstateOn: defaults.interstateOn,
      pickupEnabled: defaults.pickupEnabled,
      freeAboveKobo: defaults.freeAboveKobo,
      zones: { create: defaults.zones }
    }
  });
}
