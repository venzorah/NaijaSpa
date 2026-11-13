import { formatCount } from "./money";

export function viewCount(row: object | null | undefined, key: "publicViewCount" | "adminClickCount" | "publicClickCount" = "publicViewCount") {
  return Math.max(0, Math.floor(Number((row as Record<string, unknown> | undefined)?.[key]) || 0));
}

export function formatViews(n: number) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  return `${formatCount(count)} ${count === 1 ? "view" : "views"}`;
}

export function formatAdminClicks(n: number) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  return `${formatCount(count)} admin ${count === 1 ? "click" : "clicks"}`;
}

export function formatAdClicks(n: number) {
  const count = Math.max(0, Math.floor(Number(n) || 0));
  return `${formatCount(count)} ad ${count === 1 ? "click" : "clicks"}`;
}
