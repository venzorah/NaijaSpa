import { describe, expect, it } from "vitest";
import { chatPreview } from "../src/lib/chat-threads";
import { accessForScreen } from "../src/lib/admin";
import { ROLES } from "../src/lib/rbac";

describe("booking chat screens", () => {
  it("previews photos when there is no caption", () => {
    expect(chatPreview("", true)).toBe("Photo");
    expect(chatPreview("  See you at 4  ", false)).toBe("See you at 4");
    expect(chatPreview("", false)).toBe("No messages yet");
  });

  it("lets support and operations read chats, not marketing", () => {
    expect(accessForScreen(ROLES.SUPPORT, "chats")).toBe("full");
    expect(accessForScreen(ROLES.OPERATIONS, "chats")).toBe("full");
    expect(accessForScreen(ROLES.SUPER_ADMIN, "chats")).toBe("full");
    expect(accessForScreen(ROLES.MARKETING, "chats")).toBe(null);
  });
});
