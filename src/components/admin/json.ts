import {adminActionFeedback, notifyAction} from "@/lib/action-feedback";

export function messageForNonJsonResponse(status: number, body: string) {
  const html = body.trimStart().startsWith("<") || /<html[\s>]/i.test(body);
  if (status === 401 || status === 403) return "Your admin session expired. Sign in again and retry.";
  if (status === 413) return "That message is too large. Remove some images and try again.";
  if (status === 502 || status === 504 || status === 524) {
    return "The send took too long for the server. It may still finish in the background — check Recent sends. Otherwise send as an in-app message, or try a smaller audience.";
  }
  if (html || status >= 500) return "The server returned an error page instead of a result. Try again in a moment.";
  return "The server returned an unexpected response. Try again.";
}

export async function adminJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) }
  });
  const text = await res.text();
  let json: T & { error?: string };
  try {
    json = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  } catch {
    throw new Error(messageForNonJsonResponse(res.status, text));
  }
  if (!res.ok) throw new Error(json.error || "Request failed");
  const feedback = adminActionFeedback(url, init?.method || "GET");
  if(feedback) notifyAction(feedback.kind,feedback.message);
  return json;
  } catch(error) {
    if(url.startsWith("/api/admin/") && !url.startsWith("/api/admin/categories") && !(error instanceof Error && error.name === "AbortError")) notifyAction("error",error instanceof Error?error.message:"Could not complete this action.");
    throw error;
  }
}
