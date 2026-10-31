import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
import { ApplicationsConsole } from "../src/components/admin/applications-console";
import { ServicesConsole } from "../src/components/admin/services-console";

describe("admin filtered record selection", () => {
  it("shows an open applicant instead of the previously selected approved record", () => {
    const row = { city: "Lagos", ownerName: "Test owner", ownerEmail: "fixture@example.com", submitted: "31 Oct", documents: [] };
    const html = renderToStaticMarkup(createElement(ApplicationsConsole, { editable: true, canViewProtected: true, rows: [
      { ...row, id: "approved", businessName: "Approved sample outside queue", applicationStatus: "approved" },
      { ...row, id: "pending", businessName: "Pending sample inside queue", applicationStatus: "submitted" }
    ] }));
    expect(html).toContain("Pending sample inside queue");
    expect(html).not.toContain("Approved sample outside queue");
  });
  it("does not leave an approval action targeting a record outside an empty queue", () => {
    const html = renderToStaticMarkup(createElement(ApplicationsConsole, { editable: true, canViewProtected: true, rows: [
      { id: "approved", businessName: "Approved sample", applicationStatus: "approved", city: "Lagos", ownerName: "Test", ownerEmail: "fixture@example.com", submitted: "31 Oct", documents: [] }
    ] }));
    expect(html).toContain("Queue is clear");
    expect(html).not.toContain("Approve application");
    expect(html).not.toContain("Approved sample");
  });
  it("does not expose actions for a live service inside an empty hidden-service queue", () => {
    const html = renderToStaticMarkup(createElement(ServicesConsole, { editable: true, rows: [
      { id: "live", slug: "live", name: "Live-only sample treatment", description: "", imageUrl: null, vendor: "Sample", category: "Massage", price: 5000000, duration: 60, active: true, locations: ["spa"], createdAt: "31 Oct" }
    ] }));
    expect(html).toContain("Nothing in this queue");
    expect(html).not.toContain("Live-only sample treatment");
  });
});
