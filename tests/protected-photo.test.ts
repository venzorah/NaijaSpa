import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("vendor photo protection", () => {
  it("marks listing photos as protected media", () => {
    const source = readFileSync(join(process.cwd(), "src/components/protected-photo.tsx"), "utf8");
    expect(source).toContain("data-protected-media");
    expect(source).toContain("protected-photo-veil");
    expect(source).toContain("draggable={false}");
  });
});
