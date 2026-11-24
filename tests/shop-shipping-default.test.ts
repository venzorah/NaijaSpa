import { expect, it } from "vitest";
import { defaultShopShipProfile } from "../src/lib/shop/default-shipping";
import { quoteVendorShipping } from "../src/lib/shop/quote";

it("lets a buyer in any Nigerian state check out when the seller has not set rates", () => {
  const profile = defaultShopShipProfile("Lagos");
  const local = quoteVendorShipping("Lagos", "Lagos", 5_000_00, profile);
  expect(local.ok).toBe(true);
  const far = quoteVendorShipping("Lagos", "Kano", 5_000_00, profile);
  expect(far.ok).toBe(true);
});
