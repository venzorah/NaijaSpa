import { markShopDbUnavailable, shopDbReady } from "./ensure";

export async function shopQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!(await shopDbReady())) return fallback;
  try {
    return await fn();
  } catch (error) {
    markShopDbUnavailable(error);
    return fallback;
  }
}
