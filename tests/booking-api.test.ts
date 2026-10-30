import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), session: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: { booking: { findMany: mocks.findMany } } }));
vi.mock("../src/lib/auth", () => ({ getSession: mocks.session, requireUser: (user: unknown) => user }));
vi.mock("../src/lib/booking", () => ({ createBooking: vi.fn(), requestCancellation: vi.fn() }));
import { GET } from "../src/app/api/bookings/route";

beforeEach(() => { vi.resetAllMocks(); mocks.session.mockResolvedValue({ id: "customer" }); mocks.findMany.mockResolvedValue([]); });
describe("customer booking data", () => {
  it("scopes results to the customer and selects only safe vendor/payment fields", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where).toEqual({ customerId: "customer" });
    expect(Object.keys(query.include.vendor.select).sort()).toEqual(["address", "businessName", "city", "id", "neighbourhood", "slug"]);
    expect(query.include.payments.select.rawPayload).toBeUndefined();
    expect(query.include.vendor.select.privatePhone).toBeUndefined();
    expect(query.include.vendor.select.payoutAccountNumber).toBeUndefined();
  });
});
