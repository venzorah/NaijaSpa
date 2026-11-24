export async function adminShopLoad<T>(fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load Shop admin data.";
    return { ok: false, error: message };
  }
}
