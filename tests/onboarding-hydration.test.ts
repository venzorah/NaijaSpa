import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { VendorOnboarding } from "../src/components/vendor-onboarding";

afterEach(() => vi.unstubAllGlobals());

it("keeps initial onboarding markup stable when a browser has a saved later step", () => {
  vi.stubGlobal("sessionStorage", undefined);
  const server = renderToStaticMarkup(createElement(VendorOnboarding));
  vi.stubGlobal("sessionStorage", { getItem: () => "6", setItem: vi.fn() });
  const clientInitial = renderToStaticMarkup(createElement(VendorOnboarding));
  expect(clientInitial).toBe(server);
  expect(clientInitial).toContain("Choose your space");
});
