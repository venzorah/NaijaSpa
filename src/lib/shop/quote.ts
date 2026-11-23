import { applyBps } from "@/lib/money";

export type ShopShipProfile = {
  localEnabled: boolean;
  localFeeKobo: number;
  localEtaDays: number;
  interstateOn: boolean;
  pickupEnabled: boolean;
  freeAboveKobo: number;
  zones: { state: string; feeKobo: number; etaDays: number }[];
};

export type ShopShipQuote =
  | { ok: true; feeKobo: number; etaDays: number; method: "local" | "interstate" | "pickup" | "free" }
  | { ok: false; reason: string };

export function quoteVendorShipping(
  vendorState: string,
  destState: string,
  productKobo: number,
  profile: ShopShipProfile | null,
  pickup = false
): ShopShipQuote {
  if (!profile) {
    return { ok: false, reason: "This seller has not set shipping rates yet." };
  }
  if (pickup && profile.pickupEnabled) {
    return { ok: true, feeKobo: 0, etaDays: 0, method: "pickup" };
  }
  const sameState = vendorState.trim().toLowerCase() === destState.trim().toLowerCase();
  if (sameState) {
    if (!profile.localEnabled) {
      return { ok: false, reason: `This seller does not deliver locally in ${vendorState}.` };
    }
    const free = profile.freeAboveKobo > 0 && productKobo >= profile.freeAboveKobo;
    return {
      ok: true,
      feeKobo: free ? 0 : Math.max(0, profile.localFeeKobo),
      etaDays: profile.localEtaDays,
      method: free ? "free" : "local"
    };
  }
  if (!profile.interstateOn) {
    return { ok: false, reason: "This seller does not ship outside their state." };
  }
  const zone = profile.zones.find((row) => row.state.trim().toLowerCase() === destState.trim().toLowerCase());
  if (!zone) {
    return { ok: false, reason: `This seller does not ship to ${destState}. Remove those products or change the address.` };
  }
  const free = profile.freeAboveKobo > 0 && productKobo >= profile.freeAboveKobo;
  return {
    ok: true,
    feeKobo: free ? 0 : Math.max(0, zone.feeKobo),
    etaDays: zone.etaDays,
    method: free ? "free" : "interstate"
  };
}

export function shopCommissionKobo(productSubtotalKobo: number, commissionBps: number) {
  return applyBps(Math.max(0, productSubtotalKobo), commissionBps);
}

export function shopVendorPayableKobo(productSubtotalKobo: number, commissionKobo: number, shippingKobo: number) {
  return Math.max(0, productSubtotalKobo - commissionKobo) + Math.max(0, shippingKobo);
}

export function unitSaleKobo(priceKobo: number, compareKobo: number) {
  if (compareKobo > 0 && priceKobo > 0 && priceKobo < compareKobo) return priceKobo;
  return priceKobo;
}

export type QuotedVendorGroup = {
  vendorId: string;
  productKobo: number;
  shippingKobo: number;
  commissionBps: number;
  commissionKobo: number;
  vendorPayableKobo: number;
  planCode: string;
  shipOk: boolean;
  shipReason?: string;
};

export function quoteMasterTotals(groups: QuotedVendorGroup[]) {
  const blocked = groups.filter((g) => !g.shipOk);
  return {
    productKobo: groups.reduce((sum, g) => sum + g.productKobo, 0),
    shippingKobo: groups.reduce((sum, g) => sum + (g.shipOk ? g.shippingKobo : 0), 0),
    totalKobo: groups.reduce((sum, g) => sum + (g.shipOk ? g.productKobo + g.shippingKobo : 0), 0),
    blocked
  };
}
