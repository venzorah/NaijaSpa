export function paystackMode(secret: string | undefined) {
  return secret?.startsWith("sk_live_") ? "live" : secret?.startsWith("sk_test_") ? "test" : null;
}

export function reusablePaystackCheckout(rawPayload: string | null, secret: string | undefined) {
  const mode = paystackMode(secret);
  if (!mode || !rawPayload) return false;
  try { return JSON.parse(rawPayload)?.paystackMode === mode; }
  catch { return false; }
}
