import { describe, expect, it } from "vitest";
import { visibleAdminScreens } from "../src/lib/admin";
import {
  activeTickerItems,
  parseTickerSlots,
  sanitizeTickerHref
} from "../src/lib/ticker";

describe("top bar ticker", () => {
  it("keeps three slots and only publishes active text", () => {
    const slots = parseTickerSlots(
      JSON.stringify([
        { id: 1, text: "Ramadan hours", href: "/explore", active: true },
        { id: 2, text: "  ", href: "/about", active: true },
        { id: 3, text: "New spas in Abuja", href: "javascript:alert(1)", active: false }
      ])
    );
    expect(slots).toHaveLength(3);
    expect(activeTickerItems(slots)).toEqual([{ id: 1, text: "Ramadan hours", href: "/explore" }]);
    expect(slots[2].href).toBe("");
  });

  it("allows site paths and https links", () => {
    expect(sanitizeTickerHref("/explore?city=Lagos")).toBe("/explore?city=Lagos");
    expect(sanitizeTickerHref("https://naijaspa.com/book")).toBe("https://naijaspa.com/book");
    expect(sanitizeTickerHref("https://wa.me/2348000000000")).toBe("https://wa.me/2348000000000");
    expect(sanitizeTickerHref("javascript:alert(1)")).toBe("");
    expect(sanitizeTickerHref("//evil.example")).toBe("");
  });

  it("is a cms screen separate from announcement blasts", () => {
    expect(visibleAdminScreens("content_manager").some((s) => s.id === "ticker")).toBe(true);
    expect(visibleAdminScreens("content_manager").some((s) => s.id === "announcements")).toBe(true);
    expect(visibleAdminScreens("analyst").some((s) => s.id === "ticker")).toBe(false);
  });
});
