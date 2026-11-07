export type ToastKind = "success" | "error" | "info";
export function createToastFeedback(send: (kind: ToastKind, message: string) => void) {
  const success = (message: string) => send("success", message);
  const error = (message: string) => send("error", message);
  const info = (message: string) => send("info", message);
  return { success, error, info, async run(action: () => Promise<unknown>, message: string, fallback = "Could not complete this action. Please try again.") {
    try { await action(); if (message) success(message); return true; }
    catch (cause) { error(cause instanceof Error && cause.message.trim() ? cause.message : fallback); return false; }
  } };
}
