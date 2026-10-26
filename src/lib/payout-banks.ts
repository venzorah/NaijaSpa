export function filterBanks(banks: Array<{ code: string; name: string }>, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return banks;
  return banks.filter((b) => b.name.toLowerCase().includes(q) || b.code.includes(q));
}
