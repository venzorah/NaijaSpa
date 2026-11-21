import { describe, expect, it } from "vitest";
import {
  CHAT_IMAGE_MAX_BYTES,
  CHAT_IMAGE_TTL_MS,
  chatImageExpiresAt,
  isChatImageLive,
  mapChatMessage
} from "../src/lib/chat-images";
import { parseBookingChatPost } from "../src/lib/booking-chat";

describe("chat photos", () => {
  it("expires five minutes after share and allows 5 MB", () => {
    const shared = new Date("2026-11-13T10:00:00.000Z");
    expect(chatImageExpiresAt(shared).toISOString()).toBe("2026-11-13T10:05:00.000Z");
    expect(CHAT_IMAGE_TTL_MS).toBe(5 * 60 * 1000);
    expect(CHAT_IMAGE_MAX_BYTES).toBe(5 * 1024 * 1024);
  });

  it("hides the photo after the window", () => {
    const expires = new Date("2026-11-13T10:05:00.000Z");
    expect(isChatImageLive(expires, new Date("2026-11-13T10:04:59.000Z"))).toBe(true);
    expect(isChatImageLive(expires, new Date("2026-11-13T10:05:00.000Z"))).toBe(false);
  });

  it("omits expired images from chat payloads", () => {
    const live = mapChatMessage(
      {
        id: "m1",
        senderId: "u1",
        body: "look",
        createdAt: new Date("2026-11-13T10:00:00.000Z"),
        hasImage: true,
        imageExpiresAt: new Date("2026-11-13T10:05:00.000Z")
      },
      "u1"
    );
    expect(live.hasImage).toBe(false);
    expect(live.imageExpired).toBe(true);
    const mapped = mapChatMessage(
      {
        id: "m1",
        senderId: "u1",
        body: "look",
        createdAt: new Date("2026-11-13T10:00:00.000Z"),
        hasImage: true,
        imageExpiresAt: new Date(Date.now() + 60_000)
      },
      "u1"
    );
    expect(mapped.hasImage).toBe(true);
    expect(mapped.imageExpired).toBe(false);
  });

  it("reads a Blob photo from FormData, not only File", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const form = new FormData();
    form.set("file", new Blob([jpeg], { type: "image/jpeg" }), "photo.jpg");
    const req = new Request("http://local/api/account/bookings/b1/messages", { method: "POST", body: form });
    const parsed = await parseBookingChatPost(req);
    expect(parsed.kind).toBe("image");
    if (parsed.kind === "image") expect(parsed.bytes.byteLength).toBe(jpeg.byteLength);
  });
});
