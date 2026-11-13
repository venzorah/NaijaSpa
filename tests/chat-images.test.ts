import { describe, expect, it } from "vitest";
import { CHAT_IMAGE_TTL_MS, chatImageExpiresAt, isChatImageLive, mapChatMessage } from "../src/lib/chat-images";

describe("chat image expiry", () => {
  it("expires ten minutes after share", () => {
    const shared = new Date("2026-11-13T10:00:00.000Z");
    expect(chatImageExpiresAt(shared).toISOString()).toBe("2026-11-13T10:10:00.000Z");
    expect(CHAT_IMAGE_TTL_MS).toBe(10 * 60 * 1000);
  });

  it("hides the photo after the window", () => {
    const expires = new Date("2026-11-13T10:10:00.000Z");
    expect(isChatImageLive(expires, new Date("2026-11-13T10:09:59.000Z"))).toBe(true);
    expect(isChatImageLive(expires, new Date("2026-11-13T10:10:00.000Z"))).toBe(false);
    expect(isChatImageLive(null)).toBe(false);
  });

  it("omits expired images from chat payloads", () => {
    const live = mapChatMessage(
      {
        id: "m1",
        senderId: "u1",
        body: "look",
        createdAt: new Date("2026-11-13T10:00:00.000Z"),
        hasImage: true,
        imageExpiresAt: new Date("2026-11-13T10:10:00.000Z")
      },
      "u1"
    );
    expect(live.hasImage).toBe(false);
    expect(live.imageExpired).toBe(true);
    const purged = mapChatMessage(
      {
        id: "m1",
        senderId: "u1",
        body: "",
        createdAt: new Date("2026-11-13T10:00:00.000Z"),
        hasImage: false,
        imageExpiresAt: new Date("2026-11-13T10:10:00.000Z")
      },
      "u1"
    );
    expect(purged.hasImage).toBe(false);
    expect(purged.imageExpired).toBe(true);
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
    expect(mapped.imageExpiresAt).toBeTruthy();
  });
});
