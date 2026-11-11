import {adminActionFeedback, notifyAction} from "@/lib/action-feedback";
export async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || "Request failed");
  const feedback = adminActionFeedback(url, init?.method || "GET");
  if(feedback) notifyAction(feedback.kind,feedback.message);
  return json;
  } catch(error) {
    if(url.startsWith("/api/admin/") && !url.startsWith("/api/admin/categories") && !(error instanceof Error && error.name === "AbortError")) notifyAction("error",error instanceof Error?error.message:"Could not complete this action.");
    throw error;
  }
}
