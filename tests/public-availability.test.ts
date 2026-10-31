import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ service: vi.fn(), slots: vi.fn(), bookings: vi.fn(), timeOff: vi.fn() }));
vi.mock("../src/lib/db", () => ({ prisma: { service: { findFirst: mock.service }, availabilitySlot: { findMany: mock.slots }, booking: { findMany: mock.bookings }, timeOff: { findMany: mock.timeOff } } }));
import { GET } from "../src/app/api/availability/route";

beforeEach(() => {
  vi.resetAllMocks();
  mock.service.mockResolvedValue({ vendorId: "vendor", durationMin: 60, staff: [{ staff: { id: "staff", active: true } }] });
  mock.slots.mockResolvedValue([]); mock.bookings.mockResolvedValue([]); mock.timeOff.mockResolvedValue([]);
});
describe("public service availability", () => {
  it("validates service IDs without querying the database", async () => {
    expect((await GET(new Request("http://localhost/api/availability"))).status).toBe(400);
    expect(mock.service).not.toHaveBeenCalled();
  });
  it("restricts reads to active approved public services", async () => {
    mock.service.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/api/availability?serviceId=hidden"));
    expect(response.status).toBe(404);
    expect(mock.service.mock.calls[0][0].where).toMatchObject({ active: true, vendor: { visibility: "public", applicationStatus: "approved" } });
  });
  it("returns no invented slots when working hours are absent and disallows caching", async () => {
    const response = await GET(new Request("http://localhost/api/availability?serviceId=service"));
    expect(await response.json()).toEqual({ slots: [], timeZone: "Africa/Lagos" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
