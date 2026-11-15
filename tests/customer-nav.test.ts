import { describe, expect, it } from "vitest";
import { customerNavActive, isCustomerAccountHub } from "../src/lib/customer-nav";

describe("customer bottom nav", () => {
  it("treats the profile hub as the account root only", () => {
    expect(isCustomerAccountHub("/account")).toBe(true);
    expect(isCustomerAccountHub("/account?tab=1")).toBe(true);
    expect(isCustomerAccountHub("/account/")).toBe(true);
    expect(isCustomerAccountHub("")).toBe(false);
    expect(isCustomerAccountHub("/account/bookings")).toBe(false);
    expect(isCustomerAccountHub("/account/settings")).toBe(false);
  });

  it("keeps Profile active on hub pages but not Bookings or Favourites", () => {
    expect(customerNavActive("/account", "/account")).toBe(true);
    expect(customerNavActive("/account/settings", "/account")).toBe(true);
    expect(customerNavActive("/account/bookings", "/account")).toBe(false);
    expect(customerNavActive("/account/favourites", "/account")).toBe(false);
    expect(customerNavActive("/account/bookings", "/account/bookings")).toBe(true);
    expect(customerNavActive("/in/lagos", "/")).toBe(true);
  });
});
