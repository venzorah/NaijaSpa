import { describe, expect, it } from "vitest";
import { prismaServiceAreaFilter, vendorStateForLocation } from "../src/lib/nigeria";

describe("state boundaries", () => {
  it("filters by the vendor state, never an OR of unrelated city and state", () => {
    expect(prismaServiceAreaFilter("Lagos")).toEqual({ OR: [{ state: { equals: "Lagos", mode: "insensitive" } }] });
    expect(JSON.stringify(prismaServiceAreaFilter("FCT"))).not.toContain('"city"');
  });
  it("keeps all FCT aliases within the FCT state field", () => {
    expect((prismaServiceAreaFilter("Abuja").OR ?? []).map(row => row.state.equals)).toEqual(["FCT", "Abuja", "Federal Capital Territory"]);
  });
  it("rejects Lagos/Abuja mismatches before a profile is saved", () => {
    expect(() => vendorStateForLocation("Lagos", "Abuja")).toThrow("city does not match");
    expect(() => vendorStateForLocation("FCT", "Lagos")).toThrow("city does not match");
  });
  it("allows different cities within one state", () => {
    expect(vendorStateForLocation("Lagos", "Ikeja")).toBe("Lagos");
    expect(vendorStateForLocation("Lagos State", "Lekki")).toBe("Lagos");
    expect(vendorStateForLocation("Federal Capital Territory", "Abuja")).toBe("FCT");
    expect(vendorStateForLocation("FCT", "Wuse")).toBe("FCT");
  });
  it("requires a valid state instead of an unknown location", () => { expect(() => vendorStateForLocation("Unknown", "Ikeja")).toThrow("valid Nigerian state"); });
});
