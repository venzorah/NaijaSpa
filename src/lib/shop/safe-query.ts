import { markShopDbUnavailable, shopDbUnavailable } from "./ensure";

export async function shopQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (shopDbUnavailable()) return fallback;
  try {
    return await fn();
  } catch {
    markShopDbUnavailable();
    return fallback;
  }
}
