import type { ThemeSaveResult } from "@/components/theme-provider";
import type { ToastKind } from "./toast-feedback";
export function themeFeedback(result: ThemeSaveResult): { kind: ToastKind; message: string } {
  if (result.deviceSaved && result.accountSaved) return { kind: "success", message: "Theme preference saved." };
  if (result.deviceSaved) return { kind: "info", message: "Theme changed on this device. Your account preference could not be synced." };
  if (result.accountSaved) return { kind: "info", message: "Theme saved to your account. Browser storage is unavailable on this device." };
  return { kind: "error", message: "Theme changed for this session, but the preference could not be saved." };
}
