import { expect, it, vi } from "vitest";
import { createToastFeedback } from "../src/lib/toast-feedback";
import { themeFeedback } from "../src/lib/theme-feedback";
it("announces success only after an action resolves", async () => {
  const send = vi.fn(); const toast = createToastFeedback(send); let finish!: () => void;
  const pending = toast.run(() => new Promise<void>(resolve => { finish = resolve; }), "Saved.");
  expect(send).not.toHaveBeenCalled(); finish(); expect(await pending).toBe(true); expect(send).toHaveBeenCalledWith("success", "Saved.");
});
it("reports a failed action without a success notification or unhandled rejection", async () => {
  const send = vi.fn(); const toast = createToastFeedback(send);
  expect(await toast.run(async () => { throw new Error("Not allowed"); }, "Saved.")).toBe(false);
  expect(send.mock.calls).toEqual([["error", "Not allowed"]]);
});
it("provides a useful message for non-Error and empty failures", async () => {
  const send = vi.fn(); const toast = createToastFeedback(send);
  await toast.run(async () => { throw null; }, "Saved.", "Could not save.");
  await toast.run(async () => { throw new Error(""); }, "Saved.", "Could not save.");
  expect(send.mock.calls).toEqual([["error", "Could not save."], ["error", "Could not save."]]);
});
it("keeps informational outcomes distinct from confirmed success and errors", () => {
  const send = vi.fn(); const toast = createToastFeedback(send); toast.info("Payment pending."); toast.error("Upload failed."); toast.success("Profile saved.");
  expect(send.mock.calls.map(call => call[0])).toEqual(["info", "error", "success"]);
});
it("does not claim full theme persistence after a partial save", () => {
  expect(themeFeedback({ deviceSaved: true, accountSaved: true }).kind).toBe("success");
  expect(themeFeedback({ deviceSaved: true, accountSaved: false })).toMatchObject({ kind: "info" });
  expect(themeFeedback({ deviceSaved: false, accountSaved: false }).kind).toBe("error");
});
